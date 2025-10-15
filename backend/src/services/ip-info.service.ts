import axios from 'axios';

interface IpInfoResponse {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  asn?: {
    asn: string;
    name: string;
    domain: string;
    route: string;
    type: string;
  };
  company?: {
    name: string;
    domain: string;
    type: string;
  };
  privacy?: {
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
    hosting: boolean;
  };
  abuse?: {
    score: number;
    reports: number;
  };
}

export class IpInfoService {
  private static readonly API_URL = 'https://ipapi.co';
  private static readonly IPAPI_URL = 'http://ip-api.com/json';
  private static readonly AbuseIPDB_URL = 'https://api.abuseipdb.com/api/v2/check';

  static async getIpDetails(ip: string): Promise<IpInfoResponse> {
    try {
      // Get basic IP info
      const [ipApiRes, ipAbuseRes] = await Promise.all([
        axios.get(`${this.IPAPI_URL}/${ip}?fields=status,message,continent,country,regionName,city,district,zip,lat,lon,isp,org,as,asname,reverse,mobile,proxy,hosting,query`),
        axios.get(`${this.AbuseIPDB_URL}?ipAddress=${ip}`, {
          headers: {
            'Key': process.env.ABUSEIPDB_API_KEY || '',
            'Accept': 'application/json'
          }
        }).catch(() => null) // Gracefully handle if API key not set
      ]);

      const result: IpInfoResponse = {
        ip: ip,
        city: ipApiRes.data.city,
        region: ipApiRes.data.regionName,
        country: ipApiRes.data.country,
        loc: `${ipApiRes.data.lat},${ipApiRes.data.lon}`,
        org: ipApiRes.data.org || ipApiRes.data.isp,
        asn: {
          asn: ipApiRes.data.as,
          name: ipApiRes.data.asname,
          domain: '',
          route: '',
          type: ''
        },
        privacy: {
          vpn: ipApiRes.data.proxy,
          proxy: ipApiRes.data.proxy,
          tor: false,
          hosting: ipApiRes.data.hosting
        }
      };

      // Add abuse data if available
      if (ipAbuseRes?.data?.data) {
        result.abuse = {
          score: ipAbuseRes.data.data.abuseConfidenceScore,
          reports: ipAbuseRes.data.data.totalReports || 0
        };
      }

      return result;
    } catch (error) {
      console.error('Error fetching IP details:', error);
      return { ip };
    }
  }

  static async enrichWhoisData(whoisData: any): Promise<any> {
    if (!whoisData) return null;

    try {
      // Add Organization name standardization
      const orgNames = new Set<string>();
      ['org', 'organization', 'orgName', 'Organization'].forEach(key => {
        if (whoisData[key]) orgNames.add(whoisData[key]);
      });

      return {
        ...whoisData,
        standardized: {
          organizations: Array.from(orgNames),
          netRange: whoisData.netRange || whoisData.inetnum || null,
          abuseContacts: whoisData.abuseEmails || whoisData.abuse || null,
          lastUpdated: whoisData.lastChanged || whoisData.changed || null
        }
      };
    } catch (error) {
      console.error('Error enriching WHOIS data:', error);
      return whoisData;
    }
  }
}