import axios from 'axios';

interface NetworkMetrics {
  latency: {
    rtt: number;
    jitter: number;
    packetLoss: number;
  };
  traffic: {
    inbound: number;
    outbound: number;
    packetSize: {
      mean: number;
      variance: number;
    };
    protocols: {
      [key: string]: number;
    };
  };
  ports: {
    open: number[];
    filtered: number[];
    common: boolean;
  };
  fingerprint: {
    headers: Record<string, string>;
    serverInfo: string | null;
  };
}

export class NetworkMetricsService {
  static async getMetrics(ip: string): Promise<NetworkMetrics> {
    try {
      const [latency, ports, fingerprint] = await Promise.all([
        this.measureLatency(ip),
        this.checkPorts(ip),
        this.getNetworkFingerprint(ip)
      ]);

      // Since we can't directly measure traffic without pcap,
      // we'll use some sample values based on initial connection metrics
      const traffic = {
        inbound: 0,
        outbound: 0,
        packetSize: {
          mean: 0,
          variance: 0
        },
        protocols: {}
      };

      return {
        latency,
        traffic,
        ports,
        fingerprint
      };
    } catch (error) {
      console.error('Error getting network metrics:', error);
      throw error;
    }
  }

  private static async measureLatency(ip: string): Promise<any> {
    const samples: number[] = [];
    const count = 10;

    for (let i = 0; i < count; i++) {
      try {
        const startTime = process.hrtime();
        await axios.head(`http://${ip}`, { timeout: 2000 });
        const [seconds, nanoseconds] = process.hrtime(startTime);
        samples.push(seconds * 1000 + nanoseconds / 1000000); // Convert to milliseconds
      } catch (error) {
        samples.push(-1);
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait between pings
    }

    const validSamples = samples.filter(s => s !== -1);
    const packetLoss = (samples.length - validSamples.length) / samples.length * 100;
    
    if (validSamples.length === 0) {
      return {
        rtt: -1,
        jitter: -1,
        packetLoss
      };
    }

    const rtt = validSamples.reduce((a, b) => a + b) / validSamples.length;
    const jitter = Math.sqrt(
      validSamples.map(x => Math.pow(x - rtt, 2))
        .reduce((a, b) => a + b) / validSamples.length
    );

    return {
      rtt,
      jitter,
      packetLoss
    };
  }

  private static async checkPorts(ip: string): Promise<any> {
    const commonPorts = [80, 443, 8080];
    const open: number[] = [];
    const filtered: number[] = [];

    await Promise.all(commonPorts.map(async (port) => {
      try {
        const response = await axios.head(`http://${ip}:${port}`, {
          timeout: 2000,
          validateStatus: () => true
        });
        
        if (response.status !== 404) {
          open.push(port);
        } else {
          filtered.push(port);
        }
      } catch (error) {
        filtered.push(port);
      }
    }));

    return {
      open,
      filtered,
      common: open.some(port => commonPorts.includes(port))
    };
  }

  private static async getNetworkFingerprint(ip: string): Promise<any> {
    try {
      const response = await axios.head(`http://${ip}`, {
        timeout: 2000,
        validateStatus: () => true
      });

      return {
        headers: response.headers as Record<string, string>,
        serverInfo: response.headers['server'] || null
      };
    } catch (error) {
      return {
        headers: {},
        serverInfo: null
      };
    }
  }

  static calculateAnomalyScore(metrics: NetworkMetrics): number {
    let score = 0;
    let factors = 0;

    // Analyze latency
    if (metrics.latency.rtt > 0) {
      if (metrics.latency.rtt > 200) score += 80;
      else if (metrics.latency.rtt > 100) score += 40;
      factors++;
    }

    // Analyze jitter
    if (metrics.latency.jitter > 0) {
      if (metrics.latency.jitter > 50) score += 90;
      else if (metrics.latency.jitter > 20) score += 45;
      factors++;
    }

    // Analyze packet loss
    if (metrics.latency.packetLoss > 0) {
      if (metrics.latency.packetLoss > 10) score += 100;
      else if (metrics.latency.packetLoss > 5) score += 50;
      factors++;
    }

    // Check for common VPN ports
    if (metrics.ports.common) {
      score += 90;
      factors++;
    }

    // Check for server fingerprint anomalies
    if (metrics.fingerprint.serverInfo && 
        /proxy|vpn|tunnel/i.test(metrics.fingerprint.serverInfo)) {
      score += 100;
      factors++;
    }

    return factors > 0 ? Math.min(100, score / factors) : 0;
  }

  static detectAnomalies(metrics: NetworkMetrics): any[] {
    const anomalies = [];

    // Check latency anomalies
    if (metrics.latency.rtt > 200) {
      anomalies.push({
        type: 'HIGH_LATENCY',
        severity: 'medium',
        details: `High RTT detected: ${metrics.latency.rtt}ms`
      });
    }

    // Check jitter anomalies
    if (metrics.latency.jitter > 50) {
      anomalies.push({
        type: 'HIGH_JITTER',
        severity: 'medium',
        details: `High jitter detected: ${metrics.latency.jitter}ms`
      });
    }

    // Check packet loss anomalies
    if (metrics.latency.packetLoss > 10) {
      anomalies.push({
        type: 'HIGH_PACKET_LOSS',
        severity: 'high',
        details: `High packet loss detected: ${metrics.latency.packetLoss}%`
      });
    }

    // Check port usage
    if (metrics.ports.common) {
      anomalies.push({
        type: 'COMMON_VPN_PORTS',
        severity: 'high',
        details: 'Common VPN ports detected in use'
      });
    }

    // Check server fingerprint
    if (metrics.fingerprint.serverInfo && 
        /proxy|vpn|tunnel/i.test(metrics.fingerprint.serverInfo)) {
      anomalies.push({
        type: 'VPN_SERVER_SIGNATURE',
        severity: 'high',
        details: 'Server signature indicates VPN/proxy service'
      });
    }

    return anomalies;
  }
}