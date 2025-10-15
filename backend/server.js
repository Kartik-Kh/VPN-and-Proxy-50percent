require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const whois = require('whois-json');
const IPCIDR = require('ip-cidr');
const dns = require('dns').promises;
const net = require('net');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// VPN ranges data
const vpnRanges = [
  '104.16.0.0/12',
  '5.79.64.0/20',
  '185.156.0.0/16',
  '193.138.0.0/16'
];

// Port scanning function
async function probePort(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const startTime = Date.now();
    
    socket.setTimeout(500);

    socket.on('connect', () => {
      const latency = Date.now() - startTime;
      socket.destroy();
      resolve({ port, open: true, latency });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, open: false, latency: 500 });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({ port, open: false, latency: 500 });
    });

    socket.connect(port, ip);
  });
}

// Enhanced detection endpoint
app.post('/api/detect', async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    const checks = [];
    let score = 0;

    // 1. CIDR Check
    const cidrMatch = vpnRanges.some(range => {
      const cidr = new IPCIDR(range);
      return cidr.contains(ip);
    });
    checks.push({
      type: 'CIDR_CHECK',
      result: !cidrMatch,
      details: cidrMatch ? 'IP found in known VPN ranges' : 'IP not in known VPN ranges'
    });
    score += cidrMatch ? 40 : 0;

    // 2. Port Scan (Common VPN ports)
    const vpnPorts = [1194, 443, 1723, 500];
    const portResults = await Promise.all(vpnPorts.map(port => probePort(ip, port)));
    const openVPNPorts = portResults.filter(r => r.open).length;
    checks.push({
      type: 'PORT_SCAN',
      result: openVPNPorts === 0,
      details: `Found ${openVPNPorts} open VPN ports`
    });
    score += openVPNPorts * 10;

    // 3. Reverse DNS Check
    try {
      const hostnames = await dns.reverse(ip);
      const vpnKeywords = ['vpn', 'proxy', 'tor', 'exit', 'relay'];
      const hasSuspiciousHostname = hostnames.some(hostname => 
        vpnKeywords.some(keyword => hostname.toLowerCase().includes(keyword))
      );
      checks.push({
        type: 'REVERSE_DNS',
        result: !hasSuspiciousHostname,
        details: hasSuspiciousHostname ? 
          'Suspicious hostname detected' : 
          `Clean hostnames: ${hostnames.join(', ')}`
      });
      score += hasSuspiciousHostname ? 20 : 0;
    } catch (err) {
      checks.push({
        type: 'REVERSE_DNS',
        result: true,
        details: 'No reverse DNS record found'
      });
    }

    // 4. WHOIS Check
    try {
      const whoisData = await whois(ip);
      const orgName = (whoisData.orgName || '').toLowerCase();
      const description = (whoisData.description || '').toLowerCase();
      const hostingKeywords = ['hosting', 'datacenter', 'cloud', 'vpn', 'proxy'];
      const isHostingProvider = hostingKeywords.some(keyword => 
        orgName.includes(keyword) || description.includes(keyword)
      );
      
      checks.push({
        type: 'WHOIS_CHECK',
        result: !isHostingProvider,
        details: isHostingProvider ? 
          'IP belongs to hosting/VPN provider' : 
          'IP belongs to regular ISP'
      });
      score += isHostingProvider ? 20 : 0;

      // Return full result
      const result = {
        ip,
        verdict: score >= 50 ? 'PROXY/VPN' : 'ORIGINAL',
        score: Math.min(score, 100),
        whois: whoisData,
        checks
      };

      res.json(result);
    } catch (err) {
      console.error('WHOIS error:', err);
      // Even without WHOIS, return partial result
      const result = {
        ip,
        verdict: score >= 50 ? 'PROXY/VPN' : 'ORIGINAL',
        score: Math.min(score, 100),
        checks
      };
      res.json(result);
    }
  } catch (err) {
    console.error('Detection error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});