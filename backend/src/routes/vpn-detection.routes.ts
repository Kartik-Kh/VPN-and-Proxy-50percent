import { Router } from 'express';
import { VPNDetectionService } from '../services/vpn-detection.service';
import { WhoisService } from '../services/whois.service';

const router = Router();

/**
 * @route POST /api/detect
 * @desc Detect if an IP is using VPN/Proxy and get detailed analysis
 */
router.post('/detect', async (req, res) => {
    try {
        const { ip } = req.body;

        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'IP address is required'
            });
        }

        // Get VPN detection results
        const detectionResult = await VPNDetectionService.analyzeConnection(ip);

        return res.json({
            success: true,
            data: detectionResult
        });
    } catch (error) {
        console.error('Error in VPN detection:', error);
        return res.status(500).json({
            success: false,
            error: 'Error processing request'
        });
    }
});

/**
 * @route POST /api/whois
 * @desc Get WHOIS information for IP or domain
 */
router.post('/whois', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query (IP or domain) is required'
            });
        }

        // Determine if the query is an IP or domain
        const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(query);
        
        const whoisData = isIP 
            ? await WhoisService.getIPInfo(query)
            : await WhoisService.getDomainInfo(query);

        return res.json({
            success: true,
            data: whoisData
        });
    } catch (error) {
        console.error('Error in WHOIS lookup:', error);
        return res.status(500).json({
            success: false,
            error: 'Error processing request'
        });
    }
});

/**
 * @route GET /api/client-info
 * @desc Get client's IP and initial analysis
 */
router.get('/client-info', async (req, res) => {
    try {
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ip = Array.isArray(clientIP) ? clientIP[0] : clientIP?.toString().split(',')[0];

        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'Could not determine client IP'
            });
        }

        // Get detection results for the client's IP
        const detectionResult = await VPNDetectionService.analyzeConnection(ip);

        return res.json({
            success: true,
            data: {
                ip,
                ...detectionResult
            }
        });
    } catch (error) {
        console.error('Error getting client info:', error);
        return res.status(500).json({
            success: false,
            error: 'Error processing request'
        });
    }
});

export default router;