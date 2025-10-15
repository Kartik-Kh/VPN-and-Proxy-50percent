import { createClient } from 'redis';
import { Socket } from 'net';
import dns from 'dns/promises';
import IPCIDR from 'ip-cidr';
import whois from 'whois-json';
import { logger } from '../config/logger';
import Lookup from '../models/Lookup';

const redis = createClient({
  url: process.env.REDIS_URL
});

redis.connect().catch(console.error);

interface ProbeResult {
  port: number;
  open: boolean;
  latency: number;
}

interface CheckResult {
  type: string;
  result: boolean;
  details?: string;
}

export class DetectionService {
  private static readonly VPN_PORTS = [1194, 443, 1723, 500];
  private static readonly CACHE_TTL = 3600; // 1 hour

  static async detectIP(ip: string): Promise<{
    verdict: 'PROXY/VPN' | 'ORIGINAL';
    score: number;
    whois: any;
    checks: CheckResult[];
  }> {
    // Check Redis cache first
    const cached = await redis.get(`ip:${ip}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const checks: CheckResult[] = [];
    let score = 0;

    // 1. CIDR Check
    const cidrResult = await this.checkCIDRRanges(ip);
    checks.push({
      type: 'CIDR_CHECK',
      result: !cidrResult.isVPN,
      details: cidrResult.details
    });
    score += cidrResult.isVPN ? 40 : 0;

    // 2. Port Scan
    const portResults = await this.probeVPNPorts(ip);
    const openVPNPorts = portResults.filter(r => r.open).length;
    checks.push({
      type: 'PORT_SCAN',
      result: openVPNPorts === 0,
      details: `Found ${openVPNPorts} open VPN ports`
    });
    score += openVPNPorts * 10;

    // 3. Reverse DNS
    const dnsResult = await this.checkReverseDNS(ip);
    checks.push({
      type: 'REVERSE_DNS',
      result: !dnsResult.isVPN,
      details: dnsResult.details
    });
    score += dnsResult.isVPN ? 20 : 0;

    // 4. WHOIS Data
    const whoisData = await this.getWHOISData(ip);
    const isHostingProvider = this.checkIfHostingProvider(whoisData);
    checks.push({
      type: 'WHOIS_CHECK',
      result: !isHostingProvider,
      details: isHostingProvider ? 'IP belongs to hosting provider' : 'IP belongs to regular ISP'
    });
    score += isHostingProvider ? 20 : 0;

    const result = {
      verdict: score >= 50 ? 'PROXY/VPN' : 'ORIGINAL',
      score: Math.min(score, 100),
      whois: whoisData,
      checks
    };

    // Cache the result
    await redis.setEx(`ip:${ip}`, this.CACHE_TTL, JSON.stringify(result));

    // Save to database
    await Lookup.create({
      ip,
      ...result,
      createdAt: new Date()
    });

    return result as { verdict: 'PROXY/VPN' | 'ORIGINAL'; score: number; whois: any; checks: CheckResult[] };
  }

  private static async checkCIDRRanges(ip: string): Promise<{ isVPN: boolean; details: string }> {
    // Load VPN ranges from JSON file
    const vpnRanges = require('../../data/vpn_ranges.json').vpn_ranges;
    
    for (const range of vpnRanges) {
      const cidr = new IPCIDR(range);
      if (cidr.contains(ip)) {
        return { isVPN: true, details: `IP found in VPN range: ${range}` };
      }
    }
    
    return { isVPN: false, details: 'IP not found in known VPN ranges' };
  }

  private static async probeVPNPorts(ip: string): Promise<ProbeResult[]> {
    return Promise.all(this.VPN_PORTS.map(port => this.probePort(ip, port)));
  }

  private static probePort(ip: string, port: number): Promise<ProbeResult> {
    return new Promise((resolve) => {
      const socket = new Socket();
      const startTime = Date.now();
      
      socket.setTimeout(500); // 500ms timeout

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

  private static async checkReverseDNS(ip: string): Promise<{ isVPN: boolean; details: string }> {
    try {
      const hostnames = await dns.reverse(ip);
      const vpnKeywords = ['vpn', 'proxy', 'tor', 'exit', 'relay'];
      
      for (const hostname of hostnames) {
        if (vpnKeywords.some(keyword => hostname.toLowerCase().includes(keyword))) {
          return { isVPN: true, details: `Suspicious hostname found: ${hostname}` };
        }
      }
      
      return { isVPN: false, details: `Clean hostnames: ${hostnames.join(', ')}` };
    } catch (err) {
      return { isVPN: false, details: 'No reverse DNS record found' };
    }
  }

  private static async getWHOISData(ip: string): Promise<any> {
    try {
      const cachedWhois = await redis.get(`whois:${ip}`);
      if (cachedWhois) {
        return JSON.parse(cachedWhois);
      }

      const whoisData = await whois(ip);
      await redis.setEx(`whois:${ip}`, this.CACHE_TTL, JSON.stringify(whoisData));
      return whoisData;
    } catch (err) {
      return null;
    }
  }

  private static checkIfHostingProvider(whoisData: any): boolean {
    if (!whoisData) return false;

    const hostingKeywords = [
      'hosting', 'datacenter', 'data center', 'cloud', 'servers',
      'dedicated', 'virtual private', 'vps', 'infrastructure'
    ];

    const orgName = (whoisData.orgName || '').toLowerCase();
    const description = (whoisData.description || '').toLowerCase();

    return hostingKeywords.some(keyword => 
      orgName.includes(keyword) || description.includes(keyword)
    );
  }
}