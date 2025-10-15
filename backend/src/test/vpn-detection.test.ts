import { VPNDetectionService } from '../services/vpn-detection.service';
import { WhoisService } from '../services/whois.service';

async function testVPNDetection() {
    // Test cases - mix of known VPN and non-VPN IPs
    const testCases = [
        { ip: '8.8.8.8', description: 'Google DNS (Non-VPN)' },
        { ip: '104.16.123.96', description: 'Cloudflare (CDN/Proxy)' },
        { ip: '185.65.134.175', description: 'Known VPN IP' },
        { ip: '157.240.241.35', description: 'Facebook (Non-VPN)' }
    ];

    console.log('Starting VPN Detection Tests...\n');

    for (const testCase of testCases) {
        console.log(`Testing ${testCase.description} (${testCase.ip}):`);
        console.log('-'.repeat(50));

        try {
            // Test VPN Detection
            const result = await VPNDetectionService.analyzeConnection(testCase.ip);
            
            console.log('VPN Detection Results:');
            console.log(`Is VPN/Proxy: ${result.isVPN}`);
            console.log(`Confidence Score: ${result.confidenceScore}%`);
            
            if (result.anomalies.length > 0) {
                console.log('\nDetected Anomalies:');
                result.anomalies.forEach((anomaly: any) => {
                    console.log(`- ${anomaly.type}: ${anomaly.details} (Severity: ${anomaly.severity})`);
                });
            }

            // Test WHOIS Information
            const whoisInfo = await WhoisService.getIPInfo(testCase.ip);
            console.log('\nWHOIS Information:');
            console.log(`Organization: ${whoisInfo.organization.name}`);
            console.log(`ASN: ${whoisInfo.asn.number}`);
            console.log(`Location: ${whoisInfo.location.country}, ${whoisInfo.location.city}`);

            if (whoisInfo.abuse) {
                console.log('\nAbuse Contact:');
                console.log(`Email: ${whoisInfo.abuse.email}`);
                console.log(`Phone: ${whoisInfo.abuse.phone}`);
            }

            console.log('\nDetailed Metrics:');
            console.log('Network Metrics:', JSON.stringify(result.metrics.network, null, 2));
            console.log('Geographic Data:', JSON.stringify(result.metrics.geographic, null, 2));
            console.log('Intelligence Data:', JSON.stringify(result.metrics.intelligence, null, 2));
            console.log('DNS Analysis:', JSON.stringify(result.metrics.dns, null, 2));
            console.log('WHOIS Analysis:', JSON.stringify(result.metrics.whois, null, 2));

        } catch (error) {
            console.error(`Error testing ${testCase.ip}:`, error);
        }

        console.log('\n' + '='.repeat(75) + '\n');
    }
}

// Run the tests
console.log('VPN Detection System Test Suite');
console.log('==============================\n');

testVPNDetection().catch(error => {
    console.error('Test suite failed:', error);
});