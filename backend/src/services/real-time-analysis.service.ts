import { RealTimeMetrics } from './network-monitor.service';

interface AnalysisResult {
  score: number;
  confidence: number;
  factors: {
    name: string;
    score: number;
    confidence: number;
    details: string;
  }[];
  anomalies: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    details: string;
  }[];
}

export class RealTimeAnalysisService {
  // Thresholds from research paper
  private static readonly THRESHOLDS = {
    rtt: {
      suspicious: 150,  // ms
      high: 300        // ms
    },
    jitter: {
      suspicious: 30,  // ms
      high: 50        // ms
    },
    packetLoss: {
      suspicious: 5,   // %
      high: 10        // %
    },
    hopCount: {
      suspicious: 15,
      high: 25
    }
  };

  // Feature weights based on research findings
  private static readonly WEIGHTS = {
    latency: 0.2,
    packetLoss: 0.15,
    jitter: 0.15,
    hopCount: 0.1,
    geolocation: 0.2,
    portsAndTraffic: 0.2
  };

  /**
   * Analyze real-time metrics and detect VPN/Proxy usage
   */
  static analyzeMetrics(metrics: RealTimeMetrics): AnalysisResult {
    const factors = [];
    let totalScore = 0;
    let totalConfidence = 0;
    const anomalies: any[] = [];

    // 1. Analyze RTT patterns
    const latencyFactor = this.analyzeLatency(metrics.latency);
    factors.push(latencyFactor);
    totalScore += latencyFactor.score * this.WEIGHTS.latency;
    totalConfidence += latencyFactor.confidence * this.WEIGHTS.latency;

    // 2. Analyze packet loss and jitter
    const networkQualityFactor = this.analyzeNetworkQuality(metrics);
    factors.push(networkQualityFactor);
    totalScore += networkQualityFactor.score * this.WEIGHTS.packetLoss;
    totalConfidence += networkQualityFactor.confidence * this.WEIGHTS.packetLoss;

    // 3. Analyze routing patterns
    const routingFactor = this.analyzeRouting(metrics);
    factors.push(routingFactor);
    totalScore += routingFactor.score * this.WEIGHTS.hopCount;
    totalConfidence += routingFactor.confidence * this.WEIGHTS.hopCount;

    // 4. Analyze geolocation consistency
    const geoFactor = this.analyzeGeolocation(metrics);
    factors.push(geoFactor);
    totalScore += geoFactor.score * this.WEIGHTS.geolocation;
    totalConfidence += geoFactor.confidence * this.WEIGHTS.geolocation;

    // 5. Analyze ports and traffic patterns
    const trafficFactor = this.analyzePortsAndTraffic(metrics);
    factors.push(trafficFactor);
    totalScore += trafficFactor.score * this.WEIGHTS.portsAndTraffic;
    totalConfidence += trafficFactor.confidence * this.WEIGHTS.portsAndTraffic;

    // Detect anomalies
    this.detectAnomalies(metrics, anomalies);

    return {
      score: Math.round(totalScore * 100) / 100,
      confidence: Math.round(totalConfidence * 100) / 100,
      factors,
      anomalies
    };
  }

  /**
   * Analyze latency patterns
   */
  private static analyzeLatency(latencyMeasurements: number[]): any {
    if (latencyMeasurements.length === 0) {
      return {
        name: 'Latency Analysis',
        score: 0,
        confidence: 0,
        details: 'No latency measurements available'
      };
    }

    const avg = latencyMeasurements.reduce((a, b) => a + b) / latencyMeasurements.length;
    const variance = latencyMeasurements.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / latencyMeasurements.length;
    const stability = 1 / (1 + variance);

    let score = 0;
    if (avg > this.THRESHOLDS.rtt.high) score = 1;
    else if (avg > this.THRESHOLDS.rtt.suspicious) score = 0.7;
    else score = 0.3 * (avg / this.THRESHOLDS.rtt.suspicious);

    return {
      name: 'Latency Analysis',
      score,
      confidence: stability,
      details: `Average RTT: ${Math.round(avg)}ms, Stability: ${Math.round(stability * 100)}%`
    };
  }

  /**
   * Analyze network quality (packet loss and jitter)
   */
  private static analyzeNetworkQuality(metrics: RealTimeMetrics): any {
    const jitterScore = metrics.jitter > this.THRESHOLDS.jitter.high ? 1 :
      metrics.jitter > this.THRESHOLDS.jitter.suspicious ? 0.7 : 
      0.3 * (metrics.jitter / this.THRESHOLDS.jitter.suspicious);

    const plScore = metrics.packetLoss > this.THRESHOLDS.packetLoss.high ? 1 :
      metrics.packetLoss > this.THRESHOLDS.packetLoss.suspicious ? 0.7 :
      0.3 * (metrics.packetLoss / this.THRESHOLDS.packetLoss.suspicious);

    const score = (jitterScore + plScore) / 2;
    
    return {
      name: 'Network Quality',
      score,
      confidence: 0.85,
      details: `Jitter: ${Math.round(metrics.jitter)}ms, Packet Loss: ${Math.round(metrics.packetLoss)}%`
    };
  }

  /**
   * Analyze routing patterns
   */
  private static analyzeRouting(metrics: RealTimeMetrics): any {
    const hopScore = metrics.hopCount > this.THRESHOLDS.hopCount.high ? 1 :
      metrics.hopCount > this.THRESHOLDS.hopCount.suspicious ? 0.7 :
      0.3 * (metrics.hopCount / this.THRESHOLDS.hopCount.suspicious);

    return {
      name: 'Routing Analysis',
      score: hopScore,
      confidence: 0.75,
      details: `Hop Count: ${metrics.hopCount}`
    };
  }

  /**
   * Analyze geolocation consistency
   */
  private static analyzeGeolocation(metrics: RealTimeMetrics): any {
    let score = 0;
    let details = [];

    // Check ISP vs Location consistency
    if (metrics.asInfo.type === 'HOSTING' || metrics.asInfo.type === 'CLOUD') {
      score += 0.4;
      details.push('IP belongs to hosting/cloud provider');
    }

    // Check for mismatched country in ASN
    if (metrics.asInfo.organization.includes(metrics.geolocation.country)) {
      score += 0.3;
      details.push('Geographic mismatch in ASN data');
    }

    return {
      name: 'Geolocation Analysis',
      score,
      confidence: 0.9,
      details: details.join(', ') || 'No geographic anomalies detected'
    };
  }

  /**
   * Analyze ports and traffic patterns
   */
  private static analyzePortsAndTraffic(metrics: RealTimeMetrics): any {
    let score = 0;
    let details = [];

    // Check for common VPN ports
    const vpnPortCount = metrics.openPorts.length;
    if (vpnPortCount > 0) {
      score += 0.3 * Math.min(vpnPortCount / 3, 1);
      details.push(`${vpnPortCount} VPN/Proxy ports open`);
    }

    return {
      name: 'Port & Traffic Analysis',
      score,
      confidence: 0.8,
      details: details.join(', ') || 'No suspicious port activity detected'
    };
  }

  /**
   * Detect network anomalies
   */
  private static detectAnomalies(metrics: RealTimeMetrics, anomalies: any[]): void {
    // Check for high latency spikes
    const maxLatency = Math.max(...metrics.latency);
    if (maxLatency > this.THRESHOLDS.rtt.high) {
      anomalies.push({
        type: 'High Latency Spike',
        severity: 'high',
        details: `Latency spike of ${maxLatency}ms detected`
      });
    }

    // Check for excessive packet loss
    if (metrics.packetLoss > this.THRESHOLDS.packetLoss.high) {
      anomalies.push({
        type: 'Excessive Packet Loss',
        severity: 'high',
        details: `Packet loss of ${Math.round(metrics.packetLoss)}% detected`
      });
    }

    // Check for unusual routing
    if (metrics.hopCount > this.THRESHOLDS.hopCount.high) {
      anomalies.push({
        type: 'Unusual Routing',
        severity: 'medium',
        details: `High hop count of ${metrics.hopCount} detected`
      });
    }
  }
}