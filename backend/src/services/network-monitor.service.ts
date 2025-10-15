import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import * as net from 'net';
import * as dns from 'dns/promises';

const execAsync = promisify(exec);

export interface RealTimeMetrics {
  latency: number[];           // RTT measurements
  packetLoss: number;          // Packet loss percentage
  jitter: number;             // Network jitter
  hopCount: number;           // Number of hops
  openPorts: number[];        // Open ports found
  bandwidth: number;          // Available bandwidth estimate
  dnsResponseTime: number;    // DNS resolution time
  geolocation: {
    latitude: number;
    longitude: number;
    country: string;
    city: string;
    isp: string;
  };
  asInfo: {
    asn: string;
    organization: string;
    route: string;
    type: string;
  };
}

interface TrafficPattern {
  timestamp: number;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  connections: number;
}

export class NetworkMonitorService {
  private static readonly COMMON_VPN_PORTS = [
    1194,  // OpenVPN
    1723,  // PPTP
    500,   // IPSec
    4500,  // IPSec NAT
    1701,  // L2TP
    8080,  // HTTP Proxy
    3128   // Squid Proxy
  ];

  /**
   * Get comprehensive real-time network metrics
   */
  static async getRealTimeMetrics(ip: string): Promise<RealTimeMetrics> {
    const [
      latencyData,
      geoData,
      portData,
      trafficData,
      dnsData
    ] = await Promise.all([
      this.measureLatency(ip),
      this.getGeoLocation(ip),
      this.scanPorts(ip),
      this.measureTrafficPattern(ip),
      this.checkDNS(ip)
    ]);

    const metrics: RealTimeMetrics = {
      latency: latencyData.measurements,
      packetLoss: latencyData.packetLoss,
      jitter: this.calculateJitter(latencyData.measurements),
      hopCount: await this.getHopCount(ip),
      openPorts: portData,
      bandwidth: trafficData ? trafficData.bytesIn / 1024 : 0, // KB/s
      dnsResponseTime: dnsData.responseTime,
      geolocation: geoData.location,
      asInfo: geoData.asInfo
    };

    return metrics;
  }

  /**
   * Measure RTT and packet loss
   */
  private static async measureLatency(ip: string): Promise<{ measurements: number[], packetLoss: number }> {
    try {
      const { stdout } = await execAsync(`ping -n 5 ${ip}`);
      const measurements: number[] = [];
      let lost = 0;

      stdout.split('\n').forEach(line => {
        const timeMatch = line.match(/time[=<](\d+)ms/);
        if (timeMatch) {
          measurements.push(parseInt(timeMatch[1]));
        }
        if (line.includes('Request timed out')) {
          lost++;
          measurements.push(-1);
        }
      });

      return {
        measurements: measurements.filter(m => m !== -1),
        packetLoss: (lost / 5) * 100
      };
    } catch (error) {
      return { measurements: [], packetLoss: 100 };
    }
  }

  /**
   * Calculate network jitter from RTT measurements
   */
  private static calculateJitter(measurements: number[]): number {
    if (measurements.length < 2) return 0;

    let totalJitter = 0;
    for (let i = 1; i < measurements.length; i++) {
      totalJitter += Math.abs(measurements[i] - measurements[i-1]);
    }

    return totalJitter / (measurements.length - 1);
  }

  /**
   * Get hop count using traceroute
   */
  private static async getHopCount(ip: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`tracert -h 30 -w 500 ${ip}`);
      return stdout.split('\n').filter(line => line.includes('ms')).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Scan for open ports
   */
  private static async scanPorts(ip: string): Promise<number[]> {
    const openPorts: number[] = [];

    await Promise.all(this.COMMON_VPN_PORTS.map(async port => {
      try {
        await new Promise<void>((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(500);

          socket.on('connect', () => {
            openPorts.push(port);
            socket.destroy();
            resolve();
          });

          socket.on('timeout', () => {
            socket.destroy();
            resolve();
          });

          socket.on('error', () => {
            socket.destroy();
            resolve();
          });

          socket.connect(port, ip);
        });
      } catch (error) {
        // Ignore connection errors
      }
    }));

    return openPorts;
  }

  /**
   * Measure traffic patterns
   */
  private static async measureTrafficPattern(ip: string): Promise<TrafficPattern | null> {
    try {
      const { stdout } = await execAsync(`netstat -n | findstr ${ip}`);
      const connections = stdout.split('\n').length;

      return {
        timestamp: Date.now(),
        bytesIn: 0,  // Would need admin rights for actual values
        bytesOut: 0, // Would need admin rights for actual values
        packetsIn: 0,
        packetsOut: 0,
        connections
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check DNS resolution performance
   */
  private static async checkDNS(ip: string): Promise<{ responseTime: number, hostnames?: string[] }> {
    const start = Date.now();
    try {
      const hostnames = await dns.reverse(ip);
      return {
        responseTime: Date.now() - start,
        hostnames
      };
    } catch (error) {
      return {
        responseTime: Date.now() - start
      };
    }
  }

  /**
   * Get geolocation and AS information
   */
  private static async getGeoLocation(ip: string): Promise<{
    location: RealTimeMetrics['geolocation'],
    asInfo: RealTimeMetrics['asInfo']
  }> {
    try {
      const [ipApiResponse, abuseIpResponse] = await Promise.all([
        axios.get(`http://ip-api.com/json/${ip}`),
        axios.get(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`, {
          headers: {
            'Key': process.env.ABUSEIPDB_API_KEY || '',
            'Accept': 'application/json'
          }
        }).catch(() => null)
      ]);

      return {
        location: {
          latitude: ipApiResponse.data.lat,
          longitude: ipApiResponse.data.lon,
          country: ipApiResponse.data.country,
          city: ipApiResponse.data.city,
          isp: ipApiResponse.data.isp
        },
        asInfo: {
          asn: ipApiResponse.data.as || '',
          organization: ipApiResponse.data.org || ipApiResponse.data.isp || '',
          route: '',
          type: this.determineNetworkType(ipApiResponse.data)
        }
      };
    } catch (error) {
      return {
        location: {
          latitude: 0,
          longitude: 0,
          country: '',
          city: '',
          isp: ''
        },
        asInfo: {
          asn: '',
          organization: '',
          route: '',
          type: ''
        }
      };
    }
  }

  /**
   * Determine network type based on IP info
   */
  private static determineNetworkType(ipData: any): string {
    if (ipData.hosting) return 'HOSTING';
    if (ipData.proxy) return 'PROXY';
    if (ipData.mobile) return 'MOBILE';
    if (ipData.isp?.toLowerCase().includes('cloud')) return 'CLOUD';
    return 'ISP';
  }
}