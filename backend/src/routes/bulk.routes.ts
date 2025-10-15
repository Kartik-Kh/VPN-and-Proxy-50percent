import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';
import { DetectionService } from '../services/detection.service';
import { logger } from '../config/logger';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '10')) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// In-memory job storage (replace with Redis in production)
const jobs = new Map<string, any>();

// POST /api/bulk/upload - Upload CSV for bulk analysis
router.post(
  '/upload',
  optionalAuthMiddleware,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Parse CSV
      const csvData = req.file.buffer.toString('utf-8');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      // Extract IPs (assuming column named 'ip' or first column)
      const ips = records
        .map((record: any) => record.ip || record[Object.keys(record)[0]])
        .filter((ip: string) => ip && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip));

      if (ips.length === 0) {
        return res.status(400).json({
          error: 'No valid IP addresses found in CSV file',
        });
      }

      // Create job
      const jobId = uuidv4();
      const job = {
        id: jobId,
        status: 'pending',
        total: ips.length,
        processed: 0,
        results: [],
        createdAt: new Date(),
        userId: req.user?.id,
      };

      jobs.set(jobId, job);

      // Start processing in background
      processBulkJob(jobId, ips, req.app.get('io'));

      logger.info(`Bulk job created: ${jobId} with ${ips.length} IPs`);

      res.json({
        jobId,
        message: 'Bulk analysis started',
        total: ips.length,
      });
    } catch (error: any) {
      logger.error('Bulk upload error:', error);
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  }
);

// GET /api/bulk/job/:jobId - Get job status
router.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const job = jobs.get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    logger.error('Job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// GET /api/bulk/job/:jobId/results - Get job results
router.get('/job/:jobId/results', async (req: Request, res: Response) => {
  try {
    const job = jobs.get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      results: job.results,
      total: job.total,
      processed: job.processed,
    });
  } catch (error) {
    logger.error('Job results error:', error);
    res.status(500).json({ error: 'Failed to get job results' });
  }
});

// GET /api/bulk/job/:jobId/download - Download results as CSV
router.get('/job/:jobId/download', async (req: Request, res: Response) => {
  try {
    const job = jobs.get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job not completed yet' });
    }

    // Generate CSV
    const csv = [
      'IP,Verdict,Score,Confidence',
      ...job.results.map(
        (result: any) =>
          `${result.ip},${result.verdict},${result.score},${result.confidence || 'N/A'}`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=bulk-results-${job.id}.csv`
    );
    res.send(csv);
  } catch (error) {
    logger.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download results' });
  }
});

// DELETE /api/bulk/job/:jobId - Cancel/delete job
router.delete('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const job = jobs.get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    jobs.delete(req.params.jobId);
    logger.info(`Job deleted: ${req.params.jobId}`);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    logger.error('Job delete error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Background job processor
async function processBulkJob(jobId: string, ips: string[], io: any) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  const batchSize = parseInt(process.env.BULK_BATCH_SIZE || '10');
  const concurrentLimit = parseInt(process.env.BULK_CONCURRENT_LIMIT || '5');

  try {
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);

      // Process batch with concurrency limit
      const promises = batch.map((ip) =>
        DetectionService.detectIP(ip)
          .then((result) => {
            job.results.push(result);
            job.processed++;

            // Emit progress via Socket.io
            io.emit(`bulk-progress-${jobId}`, {
              jobId,
              processed: job.processed,
              total: job.total,
              percentage: Math.round((job.processed / job.total) * 100),
            });
          })
          .catch((error) => {
            logger.error(`Error processing IP ${ip}:`, error);
            job.results.push({
              ip,
              verdict: 'ERROR',
              score: 0,
              error: error.message,
            });
            job.processed++;
          })
      );

      await Promise.all(promises);

      // Small delay between batches to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    job.status = 'completed';
    job.completedAt = new Date();

    // Emit completion
    io.emit(`bulk-complete-${jobId}`, {
      jobId,
      status: 'completed',
      total: job.total,
      processed: job.processed,
    });

    logger.info(`Bulk job completed: ${jobId}`);
  } catch (error) {
    logger.error(`Bulk job ${jobId} failed:`, error);
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';

    io.emit(`bulk-error-${jobId}`, {
      jobId,
      error: job.error,
    });
  }
}

export default router;
