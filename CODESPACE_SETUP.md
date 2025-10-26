# VPN Detection System - Codespace Setup

## Quick Start

### 1. First Time Setup
```bash
chmod +x setup-codespace.sh start-servers.sh
./setup-codespace.sh
```

### 2. Start Application
```bash
./start-servers.sh
```

Or manually:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev:simple
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 3. Access Application

Codespaces will automatically forward ports. Click on:
- **Port 5173** (Frontend) - Opens the web interface
- **Port 5000** (Backend) - API endpoint

Or use the **Ports** tab at the bottom of VS Code.

## Environment Variables

Create `.env` files if needed:

**backend/.env:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vpn_detector
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=vpnredis2025

# API Keys (optional - system works without them)
IPQUALITYSCORE_API_KEY=your_key_here
ABUSEIPDB_API_KEY=your_key_here
IPINFO_TOKEN=your_key_here
```

## Database Access

MongoDB and Redis run in Docker containers:

```bash
# Check container status
docker ps

# Access MongoDB
docker exec -it vpn_detector_mongodb mongosh vpn_detector

# Access Redis
docker exec -it vpn_detector_redis redis-cli
# AUTH vpnredis2025
```

## Troubleshooting

### Ports already in use:
```bash
# Kill processes on ports
pkill -f "tsx src/server-simple"
pkill -f "vite"
```

### Restart Docker containers:
```bash
docker-compose restart
```

### Check logs:
```bash
# Backend logs
cd backend && npm run dev:simple

# Docker logs
docker-compose logs -f
```

## Features Available

✅ Single IP Detection with Chart.js visualization  
✅ Bulk Upload (up to 100 IPs)  
✅ History Dashboard with MongoDB persistence  
✅ Redis caching (1-hour TTL)  
✅ Real-time threat analysis  
✅ CSV export functionality  

## API Testing

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test IP detection
curl -X POST http://localhost:5000/api/detect/single \
  -H "Content-Type: application/json" \
  -d '{"ip": "8.8.8.8"}'

# Get history
curl http://localhost:5000/api/history?limit=10
```
