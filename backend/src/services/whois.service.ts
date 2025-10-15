import axios from 'axios';
import whois from 'whois-json';

interface WhoisResult {
  domain?: string;
  registrar?: string;
  registrarUrl?: string;
  createdDate?: string;
  updatedDate?: string;
  expiresDate?: string;
  status?: string[];
  nameServers?: string[];
  owner?: string;
  organization?: string;
  administrativeContact?: any;
  technicalContact?: any;
  registrantContact?: any;
  abuse?: {
    email?: string;
    phone?: string;
  };
}

interface IPWhoisResult {
  ip: string;
  type: string;
  subnet: string;
  asn: {
    number: string;
    organization: string;
    route: string;
    type: string;
  };
  location: {
    country: string;
    region: string;
    city: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  };
  organization: {
    name: string;
    type: string;
  };
  abuse?: {
    address: string;
    email: string;
    phone: string;
  };
}

export class WhoisService {
  static async getDomainInfo(domain: string): Promise<WhoisResult> {
    try {
      const result = await whois(domain);
      return this.formatDomainResult(result);
    } catch (error) {
      console.error('Error fetching domain WHOIS:', error);
      throw error;
    }
  }

  static async getIPInfo(ip: string): Promise<IPWhoisResult> {
    try {
      // Using RDAP (Registration Data Access Protocol) for IP WHOIS
      const response = await axios.get(`https://rdap.arin.net/registry/ip/${ip}`);
      return this.formatIPResult(response.data);
    } catch (error) {
      // Fallback to alternative IP WHOIS API
      try {
        const response = await axios.get(`https://ipapi.co/${ip}/json/`);
        return this.formatIPApiResult(response.data);
      } catch (fallbackError) {
        console.error('Error fetching IP WHOIS:', error);
        throw error;
      }
    }
  }

  private static formatDomainResult(raw: any): WhoisResult {
    return {
      domain: raw.domainName,
      registrar: raw.registrar,
      registrarUrl: raw.registrarUrl,
      createdDate: raw.creationDate,
      updatedDate: raw.updatedDate,
      expiresDate: raw.expirationDate,
      status: Array.isArray(raw.status) ? raw.status : [raw.status],
      nameServers: Array.isArray(raw.nameServers) ? raw.nameServers : [raw.nameServers],
      owner: raw.registrant,
      organization: raw.registrantOrganization,
      administrativeContact: raw.administrativeContact,
      technicalContact: raw.technicalContact,
      registrantContact: raw.registrantContact,
      abuse: {
        email: raw.abuseEmail,
        phone: raw.abusePhone
      }
    };
  }

  private static formatIPResult(raw: any): IPWhoisResult {
    const entities = raw.entities || [];
    const abuse = entities.find((e: any) => e.roles?.includes('abuse'));
    const organization = entities.find((e: any) => e.roles?.includes('registrant'));

    return {
      ip: raw.startAddress || raw.handle,
      type: raw.type || 'unknown',
      subnet: `${raw.startAddress}-${raw.endAddress}`,
      asn: {
        number: raw.handle || '',
        organization: organization?.name || '',
        route: raw.name || '',
        type: raw.type || ''
      },
      location: {
        country: raw.country || '',
        region: raw.region || '',
        city: raw.city || '',
        postalCode: raw.postalCode || '',
        latitude: parseFloat(raw.latitude || '0'),
        longitude: parseFloat(raw.longitude || '0')
      },
      organization: {
        name: organization?.name || '',
        type: organization?.roles?.[0] || ''
      },
      abuse: abuse ? {
        address: abuse.address?.[0]?.value || '',
        email: abuse.email?.[0]?.value || '',
        phone: abuse.phone?.[0]?.value || ''
      } : undefined
    };
  }

  private static formatIPApiResult(raw: any): IPWhoisResult {
    return {
      ip: raw.ip,
      type: raw.version || 'unknown',
      subnet: raw.network || '',
      asn: {
        number: raw.asn?.toString() || '',
        organization: raw.org || '',
        route: raw.network || '',
        type: 'unknown'
      },
      location: {
        country: raw.country || '',
        region: raw.region || '',
        city: raw.city || '',
        postalCode: raw.postal || '',
        latitude: raw.latitude || 0,
        longitude: raw.longitude || 0
      },
      organization: {
        name: raw.org || '',
        type: 'unknown'
      }
    };
  }

  static async analyzeWhoisForVPNDetection(ip: string): Promise<{
    isLikelyVPN: boolean;
    confidence: number;
    indicators: string[];
  }> {
    try {
      const whoisData = await this.getIPInfo(ip);
      const indicators: string[] = [];
      let confidence = 0;

      // Check organization name for VPN indicators
      const orgName = whoisData.organization.name.toLowerCase();
      const vpnKeywords = ['vpn', 'proxy', 'hosting', 'cloud', 'anonymous', 'private'];
      const matchedKeywords = vpnKeywords.filter(keyword => orgName.includes(keyword));
      
      if (matchedKeywords.length > 0) {
        indicators.push(`Organization name contains VPN indicators: ${matchedKeywords.join(', ')}`);
        confidence += 30;
      }

      // Check if it's a hosting/cloud provider
      if (['hosting', 'cloud'].some(keyword => orgName.includes(keyword))) {
        indicators.push('IP belongs to hosting/cloud provider');
        confidence += 20;
      }

      // Check ASN information
      if (whoisData.asn.organization.toLowerCase().includes('hosting')) {
        indicators.push('ASN belongs to hosting provider');
        confidence += 20;
      }

      // Check for abuse contact presence
      if (!whoisData.abuse || !whoisData.abuse.email) {
        indicators.push('No abuse contact information');
        confidence += 15;
      }

      // Check organization type
      if (whoisData.organization.type.toLowerCase().includes('private')) {
        indicators.push('Private organization type');
        confidence += 15;
      }

      return {
        isLikelyVPN: confidence >= 50,
        confidence: Math.min(confidence, 100),
        indicators
      };
    } catch (error) {
      console.error('Error analyzing WHOIS for VPN detection:', error);
      return {
        isLikelyVPN: false,
        confidence: 0,
        indicators: ['Error analyzing WHOIS data']
      };
    }
  }
}