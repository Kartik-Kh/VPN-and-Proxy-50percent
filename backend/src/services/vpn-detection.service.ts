import { IPIntelligenceService } from './ip-intelligence.service';
import { NetworkMetricsService } from './network-metrics.service';
import { WhoisService } from './whois.service';
import * as dns from 'dns/promises';

interface DNSAnalysisResult {
  reverseDNS: string | null;
  isVPNPattern: boolean;
  hasMXRecord: boolean;
  txtRecords: string[];
  nameservers: string[];
  anomalies: string[];
}

interface VPNDetectionResult {
  isVPN: boolean;
  confidenceScore: number;
  anomalies: any[];
  metrics: {
    network: any;
    geographic: any;
    intelligence: any;
    dns: DNSAnalysisResult & {
      anomalyScore: number;
    };
    whois: {
      confidence: number;
      indicators: string[];
      isLikelyVPN: boolean;
    };
  };
}

export class VPNDetectionService {
  static async analyzeConnection(ip: string): Promise<VPNDetectionResult> {
    // Fetch IP intelligence, network metrics, DNS info, and WHOIS data in parallel
    const [ipData, networkMetrics, dnsResults, whoisAnalysis] = await Promise.all([
      IPIntelligenceService.getEnhancedIPData(ip),
      NetworkMetricsService.getMetrics(ip),
      this.performDNSAnalysis(ip),
      WhoisService.analyzeWhoisForVPNDetection(ip)
    ]);
    
    // Calculate individual confidence scores
    const intelligenceScore = IPIntelligenceService.calculateConfidenceScore(ipData);
    const networkScore = NetworkMetricsService.calculateAnomalyScore(networkMetrics);
    const dnsScore = this.calculateDNSScore(dnsResults);
    
    // Detect anomalies from different sources
    const geoAnomalies = IPIntelligenceService.detectGeographicalAnomalies(ipData);
    const networkAnomalies = NetworkMetricsService.detectAnomalies(networkMetrics);
    const dnsAnomalies = this.detectDNSAnomalies(dnsResults);

    // Combine all anomalies
    const allAnomalies = [
      ...geoAnomalies, 
      ...networkAnomalies, 
      ...dnsAnomalies,
      ...whoisAnalysis.indicators.map((indicator: string) => ({
        type: 'WHOIS_INDICATOR',
        severity: 'medium',
        details: indicator
      }))
    ];

    // Calculate weighted final confidence score
    const finalScore = (
      (intelligenceScore * 0.35) + // IP intelligence
      (networkScore * 0.25) +      // Network metrics
      (dnsScore * 0.20) +         // DNS analysis
      (whoisAnalysis.confidence * 0.20) // WHOIS analysis
    );

    // Additional confidence factors
    let confidenceBoost = 0;
    
    // Multiple data sources confirm VPN
    const confirmationCount = [
      ipData.ipQualityScore?.vpn,
      ipData.proxycheck?.[ip]?.proxy,
      ipData.maxmind?.traits?.is_anonymous_vpn,
      networkMetrics.ports.common,
      dnsResults.isVPNPattern
    ].filter(Boolean).length;

    if (confirmationCount >= 3) confidenceBoost += 15;
    else if (confirmationCount >= 2) confidenceBoost += 7;

    // Adjust final score with boosts
    const adjustedScore = Math.min(100, finalScore + confidenceBoost);

    return {
      isVPN: adjustedScore >= 70,
      confidenceScore: adjustedScore,
      anomalies: allAnomalies,
      metrics: {
        network: networkMetrics,
        geographic: {
          locations: Array.from(new Set([
            ipData.ipinfo?.country,
            ipData.ipAPI?.country,
            ipData.maxmind?.country?.iso_code
          ]).values()).filter(Boolean),
          datacenters: {
            isDatacenter: ipData.ipQualityScore?.is_datacenter || ipData.ipAPI?.hosting,
            provider: ipData.ipinfo?.org || ipData.ipAPI?.isp
          },
          asn: ipData.ipinfo?.asn || ipData.ipAPI?.as || '',
          isp: ipData.ipinfo?.org || ipData.ipAPI?.isp || ''
        },
        intelligence: {
          abuseConfidence: ipData.abuseIPDB?.abuseConfidenceScore || 0,
          fraudScore: ipData.ipQualityScore?.fraud_score || 0,
          proxyScore: ipData.proxycheck?.[ip]?.risk || 0,
          dnsblListings: ipData.dnsbl?.length || 0,
          vpnIndicators: {
            isAnonymous: ipData.maxmind?.traits?.is_anonymous || false,
            isVPN: ipData.ipQualityScore?.vpn || ipData.proxycheck?.[ip]?.proxy === 'yes',
            isTor: ipData.ipQualityScore?.tor || false,
            isDatacenter: ipData.ipQualityScore?.is_datacenter || false
          }
        },
        dns: {
          ...dnsResults,
          anomalyScore: dnsScore
        },
        whois: {
          confidence: whoisAnalysis.confidence,
          indicators: whoisAnalysis.indicators,
          isLikelyVPN: whoisAnalysis.isLikelyVPN
        }
      }
    };
  }

  private static async performDNSAnalysis(ip: string): Promise<DNSAnalysisResult> {
    try {
      // Perform reverse DNS lookup
      const reverseDNS = await dns.reverse(ip).catch(() => null);
      
      // Check for MX records (VPN servers typically don't have mail servers)
      const hasMXRecord = await dns.resolveMx(reverseDNS?.[0] || ip).then(() => true).catch(() => false);
      
      // Get TXT records
      const txtRecords = await dns.resolveTxt(reverseDNS?.[0] || ip).then(records => 
        records.map(record => record.join('')))
        .catch(() => []);
      
      // Get nameservers
      const nameservers = await dns.resolveNs(reverseDNS?.[0] || ip).catch(() => []);
      
      // Check if hostname matches common VPN patterns
      const vpnPatterns = /vpn|proxy|tunnel|tor|private|secure|anon/i;
      const isVPNPattern = reverseDNS ? 
        vpnPatterns.test(reverseDNS[0]) :
        false;
      
      const anomalies = [];
      
      // Look for security-related TXT records
      if (txtRecords.some(record => record.toLowerCase().includes('spf1'))) {
        anomalies.push('HAS_SPF_RECORD');
      }
      
      // Check for common VPN provider nameservers
      if (nameservers.some(ns => 
        /cloudflare|aws|google|azure|digital\s*ocean/i.test(ns))) {
        anomalies.push('CLOUD_PROVIDER_NS');
      }
      
      return {
        reverseDNS: reverseDNS?.[0] || null,
        isVPNPattern,
        hasMXRecord,
        txtRecords,
        nameservers,
        anomalies
      };
    } catch (error) {
      console.error('DNS analysis error:', error);
      return {
        reverseDNS: null,
        isVPNPattern: false,
        hasMXRecord: false,
        txtRecords: [],
        nameservers: [],
        anomalies: []
      };
    }
  }

  private static calculateDNSScore(dnsResults: DNSAnalysisResult): number {
    let score = 0;
    let factors = 0;

    // VPN pattern in hostname
    if (dnsResults.isVPNPattern) {
      score += 100;
      factors++;
    }

    // Lack of MX records (typical for VPN servers)
    if (!dnsResults.hasMXRecord) {
      score += 60;
      factors++;
    }

    // Cloud provider nameservers
    if (dnsResults.anomalies.includes('CLOUD_PROVIDER_NS')) {
      score += 70;
      factors++;
    }

    // Has SPF record (unusual for VPN servers)
    if (dnsResults.anomalies.includes('HAS_SPF_RECORD')) {
      score -= 30;
      factors++;
    }

    return factors > 0 ? Math.max(0, Math.min(100, score / factors)) : 0;
  }

  private static detectDNSAnomalies(dnsResults: DNSAnalysisResult): any[] {
    const anomalies = [];

    if (dnsResults.isVPNPattern) {
      anomalies.push({
        type: 'VPN_HOSTNAME_PATTERN',
        severity: 'high',
        details: `Hostname contains VPN-related terms: ${dnsResults.reverseDNS}`
      });
    }

    if (!dnsResults.hasMXRecord) {
      anomalies.push({
        type: 'NO_MAIL_SERVER',
        severity: 'low',
        details: 'No MX records found (typical for VPN servers)'
      });
    }

    if (dnsResults.anomalies.includes('CLOUD_PROVIDER_NS')) {
      anomalies.push({
        type: 'CLOUD_PROVIDER_NS',
        severity: 'medium',
        details: 'Using cloud provider nameservers'
      });
    }

    return anomalies;
  }

  static async getDetailedAnalysis(ip: string): Promise<any> {
    const [detectionResult, ipData] = await Promise.all([
      this.analyzeConnection(ip),
      IPIntelligenceService.getEnhancedIPData(ip)
    ]);

    return {
      ...detectionResult,
      detailedMetrics: {
        ipQualityScore: {
          proxy: ipData.ipQualityScore?.proxy,
          vpn: ipData.ipQualityScore?.vpn,
          tor: ipData.ipQualityScore?.tor,
          recent_abuse: ipData.ipQualityScore?.recent_abuse,
          bot_status: ipData.ipQualityScore?.bot_status
        },
        abuseIPDB: {
          totalReports: ipData.abuseIPDB?.totalReports,
          lastReportedAt: ipData.abuseIPDB?.lastReportedAt,
          usageType: ipData.abuseIPDB?.usageType
        },
        proxyCheck: {
          proxy: ipData.proxycheck?.[ip]?.proxy,
          type: ipData.proxycheck?.[ip]?.type,
          risk: ipData.proxycheck?.[ip]?.risk,
          port: ipData.proxycheck?.[ip]?.port
        },
        maxmind: {
          isAnonymous: ipData.maxmind?.traits?.is_anonymous,
          isAnonymousVpn: ipData.maxmind?.traits?.is_anonymous_vpn,
          isHostingProvider: ipData.maxmind?.traits?.is_hosting_provider,
          isTorExitNode: ipData.maxmind?.traits?.is_tor_exit_node
        }
      }
    };
  }
}