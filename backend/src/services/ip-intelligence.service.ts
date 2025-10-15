import axios from 'axios';
import * as dns from 'dns/promises';

type APIResponse = {
  [key: string]: any;
} | null;

interface EnhancedIPData {
  ipinfo: any;
  abuseIPDB: any;
  ipQualityScore: any;
  ipAPI: any;
  maxmind: any;
  proxycheck: any;
  dnsbl: any[];
}

export class IPIntelligenceService {
  private static readonly API_KEYS = {
    ABUSEIPDB: process.env.ABUSEIPDB_API_KEY,
    IPQUALITYSCORE: process.env.IPQUALITYSCORE_API_KEY,
    PROXYCHECK: process.env.PROXYCHECK_API_KEY,
    MAXMIND: process.env.MAXMIND_API_KEY,
  };

  // DNSBL servers for checking IP reputation
  private static readonly DNSBL_SERVERS = [
    'zen.spamhaus.org',
    'dnsbl.sorbs.net',
    'bl.spamcop.net',
    'cbl.abuseat.org',
    'dnsbl.njabl.org',
    'b.barracudacentral.org'
  ];

  /**
   * Get comprehensive IP data from multiple APIs
   */
  static async getEnhancedIPData(ip: string): Promise<EnhancedIPData> {
    const [
      ipinfo,
      abuseIPDB,
      ipQualityScore,
      ipAPI,
      maxmind,
      proxycheck,
      dnsbl
    ] = await Promise.all([
      this.getIPInfo(ip),
      this.checkAbuseIPDB(ip),
      this.checkIPQualityScore(ip),
      this.getIPAPI(ip),
      this.checkMaxMind(ip),
      this.checkProxyCheck(ip),
      this.checkDNSBL(ip)
    ]);

    return {
      ipinfo,
      abuseIPDB,
      ipQualityScore,
      ipAPI,
      maxmind,
      proxycheck,
      dnsbl
    };
  }

  /**
   * Get IP information from ipinfo.io
   */
  private static async getIPInfo(ip: string): Promise<APIResponse> {
    try {
      const response = await axios.get(`https://ipinfo.io/${ip}/json`);
      return response.data;
    } catch (error) {
      console.error('IPInfo API error:', error);
      return null;
    }
  }

  /**
   * Check IP against AbuseIPDB
   */
  private static async checkAbuseIPDB(ip: string): Promise<APIResponse> {
    if (!this.API_KEYS.ABUSEIPDB) return null;

    try {
      const response = await axios.get(`https://api.abuseipdb.com/api/v2/check`, {
        params: {
          ipAddress: ip,
          maxAgeInDays: 90,
          verbose: true
        },
        headers: {
          'Key': this.API_KEYS.ABUSEIPDB,
          'Accept': 'application/json'
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('AbuseIPDB API error:', error);
      return null;
    }
  }

  /**
   * Check IP using IPQualityScore
   */
  private static async checkIPQualityScore(ip: string): Promise<APIResponse> {
    if (!this.API_KEYS.IPQUALITYSCORE) return null;

    try {
      const response = await axios.get(
        `https://ipqualityscore.com/api/json/ip/${this.API_KEYS.IPQUALITYSCORE}/${ip}`,
        {
          params: {
            strictness: 2,
            allow_public_access_points: true,
            fast: false,
            lighter_penalties: false,
            mobile: false
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('IPQualityScore API error:', error);
      return null;
    }
  }

  /**
   * Get IP data from IP-API
   */
  private static async getIPAPI(ip: string): Promise<APIResponse> {
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        params: {
          fields: 'status,message,continent,country,regionName,city,district,zip,lat,lon,isp,org,as,asname,mobile,proxy,hosting,query'
        }
      });
      return response.data;
    } catch (error) {
      console.error('IP-API error:', error);
      return null;
    }
  }

  /**
   * Check IP using MaxMind GeoIP2
   */
  private static async checkMaxMind(ip: string): Promise<APIResponse> {
    if (!this.API_KEYS.MAXMIND) return null;

    try {
      const response = await axios.get(
        `https://geoip.maxmind.com/geoip/v2.1/insights/${ip}`,
        {
          auth: {
            username: 'user',
            password: this.API_KEYS.MAXMIND
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('MaxMind API error:', error);
      return null;
    }
  }

  /**
   * Check IP using ProxyCheck.io
   */
  private static async checkProxyCheck(ip: string): Promise<APIResponse> {
    if (!this.API_KEYS.PROXYCHECK) return null;

    try {
      const response = await axios.get(`https://proxycheck.io/v2/${ip}`, {
        params: {
          key: this.API_KEYS.PROXYCHECK,
          vpn: 1,
          port: 1,
          seen: 1,
          days: 7,
          asn: 1,
          node: 1,
          time: 1,
          inf: 1,
          risk: 1
        }
      });
      return response.data;
    } catch (error) {
      console.error('ProxyCheck API error:', error);
      return null;
    }
  }

  /**
   * Check IP against DNSBL servers
   */
  private static async checkDNSBL(ip: string): Promise<string[]> {
    const reversedIp = ip.split('.').reverse().join('.');
    const listedOn: string[] = [];

    await Promise.all(
      this.DNSBL_SERVERS.map(async (server) => {
        try {
          const result = await dns.resolve(`${reversedIp}.${server}`);
          if (result.length > 0) {
            listedOn.push(server);
          }
        } catch (error) {
          // IP not listed on this DNSBL
        }
      })
    );

    return listedOn;
  }

  /**
   * Calculate confidence score based on API results
   */
  static calculateConfidenceScore(data: EnhancedIPData): number {
    let score = 0;
    let totalFactors = 0;

    // AbuseIPDB confidence score
    if (data.abuseIPDB?.abuseConfidenceScore) {
      score += data.abuseIPDB.abuseConfidenceScore;
      totalFactors++;
    }

    // IPQualityScore fraud score
    if (data.ipQualityScore?.fraud_score) {
      score += data.ipQualityScore.fraud_score;
      totalFactors++;
    }

    // IP-API proxy/hosting detection
    if (data.ipAPI) {
      if (data.ipAPI.proxy) score += 100;
      if (data.ipAPI.hosting) score += 80;
      totalFactors++;
    }

    // ProxyCheck risk score
    if (data.proxycheck?.[data.ipinfo?.ip]?.risk) {
      score += data.proxycheck[data.ipinfo.ip].risk * 10;
      totalFactors++;
    }

    // DNSBL listings
    if (data.dnsbl?.length > 0) {
      score += (data.dnsbl.length / this.DNSBL_SERVERS.length) * 100;
      totalFactors++;
    }

    return totalFactors > 0 ? Math.min(100, score / totalFactors) : 0;
  }

  /**
   * Get geographical anomalies
   */
  static detectGeographicalAnomalies(data: EnhancedIPData): any[] {
    const anomalies = [];
    const locations = new Set();

    // Collect locations from different sources
    if (data.ipinfo?.country) locations.add(data.ipinfo.country);
    if (data.ipAPI?.country) locations.add(data.ipAPI.country);
    if (data.maxmind?.country?.iso_code) locations.add(data.maxmind.country.iso_code);

    // Check for location mismatches
    if (locations.size > 1) {
      anomalies.push({
        type: 'LOCATION_MISMATCH',
        severity: 'high',
        details: `Inconsistent location data: ${Array.from(locations).join(', ')}`
      });
    }

    // Check for datacenter/hosting provider indicators
    if (data.ipQualityScore?.is_datacenter || data.ipAPI?.hosting) {
      anomalies.push({
        type: 'DATACENTER_DETECTED',
        severity: 'medium',
        details: 'IP belongs to a datacenter or hosting provider'
      });
    }

    return anomalies;
  }
}