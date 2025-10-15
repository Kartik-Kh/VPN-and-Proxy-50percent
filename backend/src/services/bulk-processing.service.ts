import { DetectionService } from './detection.service';
import { EventEmitter } from 'events';
import { Socket } from 'socket.io';

interface Job {
  id: string;
  ips: string[];
  progress: number;
  results: any[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

class BulkProcessingService {
  private jobs: Map<string, Job> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  async submitJob(jobId: string, ips: string[]): Promise<string> {
    this.jobs.set(jobId, {
      id: jobId,
      ips,
      progress: 0,
      results: [],
      status: 'pending'
    });

    // Process in background
    this.processJob(jobId);

    return jobId;
  }

  subscribeToJob(jobId: string, socket: Socket) {
    const handler = (progress: number) => {
      socket.emit('jobProgress', { jobId, progress });
    };

    const completionHandler = (results: any) => {
      socket.emit('jobComplete', { jobId, results });
    };

    const errorHandler = (error: string) => {
      socket.emit('jobError', { jobId, error });
    };

    this.eventEmitter.on(`progress:${jobId}`, handler);
    this.eventEmitter.on(`complete:${jobId}`, completionHandler);
    this.eventEmitter.on(`error:${jobId}`, errorHandler);

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      this.eventEmitter.removeListener(`progress:${jobId}`, handler);
      this.eventEmitter.removeListener(`complete:${jobId}`, completionHandler);
      this.eventEmitter.removeListener(`error:${jobId}`, errorHandler);
    });
  }

  getJobStatus(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  private async processJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    const totalIPs = job.ips.length;
    let processed = 0;

    try {
      for (const ip of job.ips) {
        const result = await DetectionService.detectIP(ip);
        job.results.push({ ip, ...result });
        
        processed++;
        const progress = Math.round((processed / totalIPs) * 100);
        job.progress = progress;
        
        this.eventEmitter.emit(`progress:${jobId}`, progress);

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      job.status = 'completed';
      this.eventEmitter.emit(`complete:${jobId}`, job.results);
    } catch (error) {
      job.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.error = errorMessage;
      this.eventEmitter.emit(`error:${jobId}`, errorMessage);
    }
  }
}

export const bulkProcessor = new BulkProcessingService();