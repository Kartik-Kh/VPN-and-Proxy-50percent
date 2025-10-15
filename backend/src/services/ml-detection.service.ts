import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

interface MLFeatures {
  rttScore: number;        // Round Trip Time score
  geoConsistency: number;  // Geographic location consistency score
  timeSeriesScore: number; // Time series pattern score
  portActivityScore: number; // Port activity pattern score
}

export class MLDetectionService {
  private static readonly TIME_WINDOW = 300000; // 5 minutes
  private static readonly MIN_SAMPLES = 5;
  private static readonly SUSPICIOUS_PORTS = [
    1194, // OpenVPN
    1723, // PPTP
    500,  // IPSec
    4500, // IPSec NAT
    1701, // L2TP
    8080, // HTTP Proxy
    3128  // Squid Proxy
  ];

  /**
   * Collect real-time network metrics
   */
  static async collectNetworkMetrics(ip: string): Promise<MLFeatures> {
    const [rttData, geoData, portData] = await Promise.all([
      this.measureRTTVariation(ip),
      this.checkGeoConsistency(ip),
      this.analyzePortActivity(ip)
    ]);

    const timeSeriesScore = await this.analyzeTimeSeries(ip);

    return {
      rttScore: rttData,
      geoConsistency: geoData,
      timeSeriesScore: timeSeriesScore,
      portActivityScore: portData
    };
  }

  /**
   * Measure RTT variation over time
   */
  private static async measureRTTVariation(ip: string): Promise<number> {
    const samples: number[] = [];
    const numSamples = 5;

    for (let i = 0; i < numSamples; i++) {
      try {
        const startTime = process.hrtime();
        const { stdout } = await execAsync(`ping -n 1 ${ip}`);
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const rtt = seconds * 1000 + nanoseconds / 1000000;
        samples.push(rtt);
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        samples.push(-1);
      }
    }

    // Calculate score based on RTT stability
    const validSamples = samples.filter(s => s !== -1);
    if (validSamples.length < 3) return 0;

    const mean = validSamples.reduce((a, b) => a + b) / validSamples.length;
    const variance = validSamples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validSamples.length;
    const stability = 1 / (1 + variance);

    return Math.min(stability * 100, 100);
  }

  /**
   * Check geographic location consistency
   */
  private static async checkGeoConsistency(ip: string): Promise<number> {
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      const data = response.data;

      // Check for proxy/VPN indicators in location data
      let score = 100;

      // Check ISP vs Location consistency
      if (data.isp && data.isp.toLowerCase().includes('hosting')) {
        score -= 30;
      }

      // Check for datacenter ranges
      if (data.hosting || data.proxy) {
        score -= 40;
      }

      // Check country vs ASN consistency
      if (data.as && data.country) {
        const asCountry = this.extractCountryFromAS(data.as);
        if (asCountry && asCountry !== data.country) {
          score -= 20;
        }
      }

      return Math.max(score, 0);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Analyze port activity patterns
   */
  private static async analyzePortActivity(ip: string): Promise<number> {
    let score = 100;
    const results = await Promise.all(
      this.SUSPICIOUS_PORTS.map(port => this.checkPort(ip, port))
    );

    const openPorts = results.filter(r => r).length;
    score -= openPorts * 20;

    return Math.max(score, 0);
  }

  /**
   * Check if a port is open
   */
  private static async checkPort(ip: string, port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `powershell -command "Test-NetConnection -ComputerName ${ip} -Port ${port} -WarningAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded"`,
        { timeout: 2000 }
      );
      return stdout.trim().toLowerCase() === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Analyze time series patterns
   */
  private static async analyzeTimeSeries(ip: string): Promise<number> {
    // In a real implementation, this would analyze historical data
    // For now, we'll return a basic score based on current metrics
    const [latencyStability, connectionStability] = await Promise.all([
      this.checkLatencyStability(ip),
      this.checkConnectionStability(ip)
    ]);

    return (latencyStability + connectionStability) / 2;
  }

  /**
   * Check latency stability
   */
  private static async checkLatencyStability(ip: string): Promise<number> {
    const samples = [];
    for (let i = 0; i < 3; i++) {
      try {
        const startTime = process.hrtime();
        await axios.get(`http://${ip}`, { timeout: 2000 });
        const [seconds, nanoseconds] = process.hrtime(startTime);
        samples.push(seconds * 1000 + nanoseconds / 1000000);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        samples.push(-1);
      }
    }

    const validSamples = samples.filter(s => s !== -1);
    if (validSamples.length < 2) return 0;

    const mean = validSamples.reduce((a, b) => a + b) / validSamples.length;
    const variance = validSamples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validSamples.length;
    
    return Math.max(100 - (variance / 10), 0);
  }

  /**
   * Check connection stability
   */
  private static async checkConnectionStability(ip: string): Promise<number> {
    let successCount = 0;
    const attempts = 3;

    for (let i = 0; i < attempts; i++) {
      try {
        await axios.get(`http://${ip}`, { timeout: 1000 });
        successCount++;
      } catch (error) {
        // Ignore errors
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return (successCount / attempts) * 100;
  }

  /**
   * Extract country from AS number description
   */
  private static extractCountryFromAS(asString: string): string | null {
    const countryMatch = asString.match(/[A-Z]{2}$/);
    return countryMatch ? countryMatch[0] : null;
  }

  /**
   * Calculate overall ML-based detection score
   */
  static calculateScore(features: MLFeatures): number {
    // Weight the different features
    const weights = {
      rtt: 0.3,
      geo: 0.3,
      timeSeries: 0.2,
      portActivity: 0.2
    };

    const weightedScore = 
      features.rttScore * weights.rtt +
      features.geoConsistency * weights.geo +
      features.timeSeriesScore * weights.timeSeries +
      features.portActivityScore * weights.portActivity;

    return Math.round(weightedScore);
  }
}