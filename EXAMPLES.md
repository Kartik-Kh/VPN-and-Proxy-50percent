# VPN Detection System - Test Examples

This document provides various IP addresses you can test with the VPN Detection System to demonstrate different detection scenarios.

---

## 1. Clean/Original IPs (No VPN/Proxy)

### Google Public DNS
- **IP:** `8.8.8.8`
- **Expected Result:** ORIGINAL
- **Organization:** Google LLC
- **Use Case:** Legitimate public DNS server

### Cloudflare DNS
- **IP:** `1.1.1.1`
- **Expected Result:** ORIGINAL (may show as datacenter/hosting)
- **Organization:** Cloudflare Inc.
- **Use Case:** Public DNS and CDN service

### OpenDNS
- **IP:** `208.67.222.222`
- **Expected Result:** ORIGINAL
- **Organization:** Cisco OpenDNS
- **Use Case:** Public DNS resolver

---

## 2. Known VPN Provider IPs

### NordVPN Range Examples
- **IP:** `185.201.10.10`
- **Expected Result:** PROXY/VPN
- **Pattern:** 185.201.x.x, 193.29.x.x, 212.102.x.x
- **Use Case:** Commercial VPN service detection

### ExpressVPN Range Examples
- **IP:** `149.248.10.10`
- **Expected Result:** PROXY/VPN
- **Pattern:** 149.248.x.x, 103.253.x.x, 169.50.x.x
- **Use Case:** Popular VPN provider

### ProtonVPN Range Examples
- **IP:** `138.199.10.10`
- **Expected Result:** PROXY/VPN
- **Pattern:** 138.199.x.x, 149.90.x.x, 185.159.x.x
- **Use Case:** Privacy-focused VPN

### Surfshark Range Examples
- **IP:** `217.138.10.10`
- **Expected Result:** PROXY/VPN
- **Pattern:** 217.138.x.x, 37.120.x.x, 185.225.x.x
- **Use Case:** Budget VPN service

---

## 3. Cloud/Hosting Provider IPs

### Amazon AWS
- **IP:** `54.239.28.85`
- **Expected Result:** May detect as hosting/datacenter
- **Organization:** Amazon.com Inc.
- **Use Case:** Cloud infrastructure detection

### Microsoft Azure
- **IP:** `13.107.21.200`
- **Expected Result:** May detect as hosting/datacenter
- **Organization:** Microsoft Corporation
- **Use Case:** Cloud service provider

### DigitalOcean
- **IP:** `159.65.10.10`
- **Expected Result:** May detect as hosting/datacenter
- **Organization:** DigitalOcean LLC
- **Use Case:** VPS hosting detection

---

## 4. Private Network IPs (Local)

### Local Network
- **IP:** `192.168.1.1`
- **Expected Result:** Private IP detected
- **Range:** 192.168.0.0/16
- **Use Case:** Home/office router

### Private Class A
- **IP:** `10.0.0.1`
- **Expected Result:** Private IP detected
- **Range:** 10.0.0.0/8
- **Use Case:** Corporate network

### Private Class B
- **IP:** `172.16.0.1`
- **Expected Result:** Private IP detected
- **Range:** 172.16.0.0/12
- **Use Case:** Medium-sized networks

---

## 5. Known Proxy Services

### Public Proxy Examples
- **IP:** `103.253.145.36`
- **Expected Result:** PROXY/VPN
- **Use Case:** Public proxy server

### SOCKS Proxy
- **IP:** `185.225.14.5`
- **Expected Result:** PROXY/VPN
- **Use Case:** Anonymous browsing

---

## 6. Testing Scenarios

### Scenario 1: Law Enforcement Investigation
**Objective:** Identify if a suspect is using VPN to hide their location

**Test IPs:**
1. `8.8.8.8` → Baseline (clean IP)
2. `185.201.10.10` → NordVPN (should detect)
3. `192.168.1.1` → Private network (local)

**Expected Outcome:** System should clearly distinguish between legitimate, VPN, and local IPs

---

### Scenario 2: Corporate Security Audit
**Objective:** Detect employees using unauthorized VPN services

**Test IPs:**
1. `1.1.1.1` → Corporate DNS (clean)
2. `149.248.10.10` → ExpressVPN (unauthorized)
3. `54.239.28.85` → AWS (authorized cloud service)

**Expected Outcome:** Flag VPN usage while allowing legitimate cloud services

---

### Scenario 3: Network Analysis
**Objective:** Identify traffic patterns and anonymization attempts

**Test IPs:**
1. `8.8.8.8` → Normal traffic
2. `138.199.10.10` → ProtonVPN (anonymized)
3. `159.65.10.10` → DigitalOcean (possible proxy)

**Expected Outcome:** Generate risk scores and classify traffic types

---

## 7. API Testing Commands

### Using PowerShell:
```powershell
# Test a single IP
$body = @{ ip = '8.8.8.8' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5000/api/detect' -Method POST -Body $body -ContentType 'application/json'

# Test VPN IP
$body = @{ ip = '185.201.10.10' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5000/api/detect' -Method POST -Body $body -ContentType 'application/json'

# Test Private IP
$body = @{ ip = '192.168.1.1' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5000/api/detect' -Method POST -Body $body -ContentType 'application/json'
```

### Using cURL (Linux/Mac):
```bash
# Test clean IP
curl -X POST http://localhost:5000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8"}'

# Test VPN IP
curl -X POST http://localhost:5000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"ip":"185.201.10.10"}'
```

---

## 8. Expected Detection Checks

For each IP, the system performs:

1. **WHOIS Records**
   - Organization name
   - Country
   - Network details
   - Contact information

2. **IPQualityScore API**
   - Fraud score (0-100)
   - VPN detection
   - Proxy detection
   - Tor detection

3. **AbuseIPDB**
   - Abuse confidence score
   - Whitelist status
   - Reported incidents

4. **VPN Range Matching**
   - Pattern matching against known VPN providers
   - CIDR range checks

5. **Private IP Detection**
   - RFC1918 address space
   - Local network identification

---

## 9. Understanding Results

### Verdict Types:
- **ORIGINAL**: Clean IP, no VPN/proxy detected
- **PROXY/VPN**: Suspicious IP, likely anonymized

### Threat Levels:
- **CLEAN**: Score 0-25 (Safe)
- **LOW**: Score 26-50 (Minor concern)
- **MEDIUM**: Score 51-75 (Suspicious)
- **HIGH**: Score 76-100 (High risk)

### Score Calculation (Development Version):
- VPN detected: +20-25 points
- High fraud score: +15 points
- Abuse reports: +5-10 points
- Hosting/datacenter: +8 points
- Private IP: +10 points

**Note:** Scoring algorithm is currently being calibrated. Final production version will have more accurate weights.

---

## 10. Bulk Testing (CSV Format)

Create a CSV file with multiple IPs:

```csv
ip
8.8.8.8
1.1.1.1
185.201.10.10
149.248.10.10
192.168.1.1
54.239.28.85
```

Upload via the Bulk Analysis page to test multiple IPs simultaneously.

---

## 11. Real-World Use Cases

### Use Case 1: Fraud Detection
**Scenario:** E-commerce platform detecting fraudulent transactions

**Test:** Check if customer IP is a known VPN/proxy
- Clean IP → Process order normally
- VPN detected → Additional verification required

### Use Case 2: Content Restriction
**Scenario:** Streaming service enforcing geographic restrictions

**Test:** Verify user's actual location
- Clean IP → Allow access based on location
- VPN detected → Block or request verification

### Use Case 3: Cybercrime Investigation
**Scenario:** Law enforcement tracing criminal activity

**Test:** Identify anonymization attempts
- Clean IP → Direct investigation
- VPN/Proxy → Request provider logs, legal process

---

## 12. API Response Example

```json
{
  "ip": "185.201.10.10",
  "verdict": "PROXY/VPN",
  "score": 50,
  "threatLevel": "MEDIUM",
  "checks": [
    {
      "type": "VPN Range Match",
      "result": true,
      "details": "Matched NordVPN IP range",
      "provider": "NordVPN"
    },
    {
      "type": "IPQualityScore",
      "result": true,
      "details": "Fraud Score: 75, VPN: true",
      "score": 75
    }
  ],
  "whois": {
    "organization": "NordVPN",
    "country": "Panama"
  },
  "analysis": {
    "isProxy": true,
    "isVPN": true,
    "isTor": false,
    "isHosting": false
  }
}
```

---

## 13. Performance Benchmarks

- **Single IP Detection:** ~500ms (cold) / ~150ms (cached)
- **WHOIS Lookup:** ~200-400ms
- **API Checks:** ~100-300ms each
- **Total Processing:** <1 second per IP

---

## Notes:

- Results may vary based on API rate limits
- Some IPs may be detected differently over time as threat databases update
- Private IPs (192.168.x.x, 10.x.x.x) will always show as local networks
- VPN provider ranges can change; detection patterns are regularly updated

---

**Last Updated:** October 2025  
**System Version:** 0.5  
**API Providers:** IPQualityScore, AbuseIPDB, WHOIS
