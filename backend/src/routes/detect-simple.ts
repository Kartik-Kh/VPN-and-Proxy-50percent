import { Router, Request, Response } from 'express';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// WHOIS Lookup Function
const getWhoisInfo = async (input: string): Promise<any> => {
  try {
    const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(input);
    
    // Try using whois command if available
    try {
      const { stdout } = await execAsync(`whois ${input}`);
      return {
        raw: stdout,
        parsed: parseWhoisData(stdout)
      };
    } catch (cmdError) {
      // Fallback to API-based WHOIS
      const whoisResponse = await axios.get(
        `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${process.env.WHOIS_API_KEY || 'at_free'}&domainName=${input}&outputFormat=JSON`,
        { timeout: 10000 }
      );
      return whoisResponse.data;
    }
  } catch (error: any) {
    console.error('WHOIS lookup error:', error.message);
    return { error: 'WHOIS lookup failed', message: error.message };
  }
};

// Parse WHOIS raw data
const parseWhoisData = (raw: string) => {
  const lines = raw.split('\n');
  const data: any = {};
  
  for (const line of lines) {
    if (line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
      
      if (cleanKey && value) {
        if (cleanKey.includes('name')) data.registrant = value;
        if (cleanKey.includes('org')) data.organization = value;
        if (cleanKey.includes('country')) data.country = value;
        if (cleanKey.includes('created') || cleanKey.includes('registration')) data.created = value;
        if (cleanKey.includes('email')) data.email = value;
        if (cleanKey.includes('netname')) data.netname = value;
        if (cleanKey.includes('descr')) data.description = value;
      }
    }
  }
  
  return data;
};

// Enhanced VPN/Proxy detection using API keys from .env
const detectVPN = async (ip: string) => {
  const checks = [];
  let score = 0;
  let whoisData: any = null;

  try {
    // Fetch WHOIS information
    whoisData = await getWhoisInfo(ip);
    
    if (whoisData && whoisData.parsed) {
      checks.push({
        type: 'WHOIS Records',
        result: true,
        details: `Org: ${whoisData.parsed.organization || 'N/A'}, Country: ${whoisData.parsed.country || 'N/A'}`,
        data: whoisData.parsed
      });
    }
    // 1. IPQualityScore API Check
    if (process.env.IPQUALITYSCORE_API_KEY) {
      try {
        const ipqsResponse = await axios.get(
          `https://ipqualityscore.com/api/json/ip/${process.env.IPQUALITYSCORE_API_KEY}/${ip}`,
          { timeout: 5000 }
        );
        
        if (ipqsResponse.data.success) {
          const vpnDetected = ipqsResponse.data.vpn || ipqsResponse.data.proxy || ipqsResponse.data.tor;
          const fraudScore = ipqsResponse.data.fraud_score || 0;
          
          checks.push({
            type: 'IPQualityScore',
            result: vpnDetected,
            details: `Fraud Score: ${fraudScore}, VPN: ${ipqsResponse.data.vpn}, Proxy: ${ipqsResponse.data.proxy}`,
            score: fraudScore
          });
          
          // Reduced scoring for WIP version
          if (vpnDetected) score += 25;
          score += Math.min(fraudScore / 3, 15);
        }
      } catch (err: any) {
        console.log('IPQualityScore API error:', err.message);
      }
    }

    // 2. AbuseIPDB API Check
    if (process.env.ABUSEIPDB_API_KEY) {
      try {
        const abuseResponse = await axios.get(
          `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`,
          {
            headers: { 'Key': process.env.ABUSEIPDB_API_KEY },
            timeout: 5000
          }
        );
        
        if (abuseResponse.data.data) {
          const abuseScore = abuseResponse.data.data.abuseConfidenceScore || 0;
          const isWhitelisted = abuseResponse.data.data.isWhitelisted;
          
          checks.push({
            type: 'AbuseIPDB',
            result: abuseScore > 50,
            details: `Abuse Score: ${abuseScore}%, Whitelisted: ${isWhitelisted}`,
            score: abuseScore
          });
          
          // Reduced for development version
          if (abuseScore > 75) score += 10;
          else if (abuseScore > 50) score += 5;
        }
      } catch (err: any) {
        console.log('AbuseIPDB API error:', err.message);
      }
    }

    // 3. IPInfo API Check
    if (process.env.IPINFO_TOKEN) {
      try {
        const ipinfoResponse = await axios.get(
          `https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN}`,
          { timeout: 5000 }
        );
        
        if (ipinfoResponse.data) {
          const isHosting = ipinfoResponse.data.org?.toLowerCase().includes('hosting') ||
                           ipinfoResponse.data.org?.toLowerCase().includes('server') ||
                           ipinfoResponse.data.org?.toLowerCase().includes('cloud');
          
          checks.push({
            type: 'IPInfo',
            result: isHosting,
            details: `Org: ${ipinfoResponse.data.org || 'Unknown'}, Country: ${ipinfoResponse.data.country || 'Unknown'}`,
            location: `${ipinfoResponse.data.city || ''}, ${ipinfoResponse.data.country || ''}`
          });
          
          // Reduced for development version
          if (isHosting) score += 8;
        }
      } catch (err: any) {
        console.log('IPInfo API error:', err.message);
      }
    }

    // 4. Check against known VPN IP ranges (fallback)
    const vpnRanges = [
      { provider: 'NordVPN', pattern: /^(185\.201\.|193\.29\.|212\.102\.)/ },
      { provider: 'ExpressVPN', pattern: /^(149\.248\.|103\.253\.|169\.50\.)/ },
      { provider: 'ProtonVPN', pattern: /^(138\.199\.|149\.90\.|185\.159\.)/ },
      { provider: 'Surfshark', pattern: /^(217\.138\.|37\.120\.|185\.225\.)/ },
    ];

    const vpnMatch = vpnRanges.find(range => range.pattern.test(ip));
    if (vpnMatch) {
      checks.push({
        type: 'VPN Range Match',
        result: true,
        details: `Matched ${vpnMatch.provider} IP range`,
        provider: vpnMatch.provider
      });
      // Reduced for development version
      score += 20;
    }

    // 5. Private IP check
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
      checks.push({
        type: 'Private IP',
        result: true,
        details: 'Private network IP address'
      });
      score += 10;
    }

  } catch (error) {
    console.error('Detection error:', error);
  }

  // If no checks were successful, add a default check
  if (checks.length === 0) {
    checks.push({
      type: 'Basic Analysis',
      result: false,
      details: 'No VPN/Proxy indicators detected'
    });
  }

  // Ensure score is between 0-100
  score = Math.min(Math.max(score, 0), 100);
  
  // Lower threshold for development version
  const verdict = score > 40 ? 'PROXY/VPN' : 'ORIGINAL';
  const threatLevel = score > 60 ? 'HIGH' : score > 40 ? 'MEDIUM' : score > 20 ? 'LOW' : 'CLEAN';

  return {
    ip,
    verdict,
    score: Math.round(score),
    threatLevel,
    checks,
    whois: whoisData,
    timestamp: new Date().toISOString(),
    analysis: {
      isProxy: score > 50,
      isVPN: checks.some(c => c.type.includes('VPN')),
      isTor: checks.some(c => c.details?.toLowerCase().includes('tor')),
      isHosting: checks.some(c => c.details?.toLowerCase().includes('hosting') || c.details?.toLowerCase().includes('datacenter'))
    }
  };
};

// Simple detection logic
const detectHandler = async (req: Request, res: Response) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    // Basic IP validation
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }

    const result = await detectVPN(ip);
    res.json(result);
  } catch (err: any) {
    console.error('Detection error:', err);
    res.status(500).json({ 
      error: 'Detection failed',
      message: err.message || 'Unknown error'
    });
  }
};

router.post('/', detectHandler);
router.post('/single', detectHandler);

export default router;
