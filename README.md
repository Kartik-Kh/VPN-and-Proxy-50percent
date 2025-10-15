# Proxy & VPN Detector

A comprehensive self-hosted solution for detecting VPN, Proxy, and anonymized network traffic with WHOIS enrichment. Built for law enforcement, security teams, and network administrators who need transparent, auditable IP attribution tools.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)
![Redis](https://img.shields.io/badge/Redis-7.0-red.svg)

## 🎯 Project Overview

This project provides a full-stack web application that identifies whether any IPv4/IPv6 address represents a genuine endpoint or is masked by a proxy/VPN. Enhanced with built-in WHOIS enrichment capabilities, it offers a robust, auditable solution for network traffic attribution.

### Key Features

✅ **Multi-Layered Detection**
- Passive CIDR-based checks against VPN/proxy/datacenter ranges
- Active TCP/UDP port probing (HTTP CONNECT on ports 8080, 1194, etc.)
- DNS analysis with reverse lookup and pattern matching
- Real-time network metrics analysis
- ML-based behavioral detection

✅ **WHOIS/RDAP Enrichment**
- Raw socket WHOIS queries (port 43)
- HTTP-based RDAP lookups
- Registrar, creation date, and contact information
- Automated VPN indicator detection in WHOIS records

✅ **Comprehensive Web Interface**
- Single IP lookup with detailed verdict breakdown
- Bulk CSV upload for batch processing (1000+ IPs/minute)
- Historical lookup dashboard with filtering and export
- Real-time progress tracking via WebSocket
- Admin panel for API key management

✅ **Enterprise-Grade Security**
- JWT-based authentication with refresh tokens
- Role-based access control (Admin/User)
- Rate limiting (Redis-backed)
- HTTPS/TLS support
- API key authentication
- Input validation with Joi
- Helmet.js security headers

✅ **Audit Trail & Compliance**
- Full logging of all lookups with timestamps
- User attribution for chain-of-custody
- Export capabilities (CSV, JSON)
- Winston-based structured logging

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   React SPA     │◄────►│  Express API     │◄────►│   MongoDB       │
│  (Vite + TS)    │      │  (Node.js + TS)  │      │  (Lookups DB)   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                         │                          
        │                         ▼                          
        │                ┌──────────────────┐               
        │                │   Redis Cache    │               
        │                │  (WHOIS/Results) │               
        │                └──────────────────┘               
        │                         │                          
        └─────────────────────────┼──────────────────────────
                                  │                          
                          ┌───────▼────────┐                
                          │   Socket.io    │                
                          │ (Real-time UI) │                
                          └────────────────┘                
```

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **MongoDB**: v7.0 or higher
- **Redis**: v7.0 or higher
- **Docker** (optional, for containerized deployment)
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/vpn-detector.git
cd vpn-detector
```

### 2. Environment Configuration

**Backend (.env)**

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://admin:vpndetector2025@localhost:27017/vpn_detector?authSource=admin
REDIS_URL=redis://:vpnredis2025@localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env)**

```bash
cd ../frontend
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Start Services with Docker Compose

```bash
# From project root
docker-compose up -d
```

Or start services individually:

```bash
# Terminal 1 - MongoDB
docker run -d -p 27017:27017 --name vpn-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=vpndetector2025 \
  mongo:7.0

# Terminal 2 - Redis
docker run -d -p 6379:6379 --name vpn-redis \
  redis:7-alpine redis-server --requirepass vpnredis2025

# Terminal 3 - Backend
cd backend
npm run dev

# Terminal 4 - Frontend
cd frontend
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

### 6. Create First User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

## 📚 API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

### Detection

#### Single IP Detection
```http
POST /api/detect
Authorization: Bearer <token>
Content-Type: application/json

{
  "ip": "8.8.8.8"
}
```

Response:
```json
{
  "ip": "8.8.8.8",
  "verdict": "ORIGINAL",
  "score": 15,
  "confidence": 95,
  "checks": [
    {
      "type": "CIDR_CHECK",
      "result": false,
      "details": "IP not in known VPN/proxy ranges"
    }
  ]
}
```

#### Bulk Upload
```http
POST /api/bulk/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <CSV file>
```

#### Get Bulk Job Status
```http
GET /api/bulk/job/:jobId
```

### History

#### Get Lookup History
```http
GET /api/history?page=1&limit=20&verdict=PROXY/VPN
Authorization: Bearer <token>
```

#### Export History
```http
GET /api/history/export/csv
Authorization: Bearer <token>
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 📦 Production Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Start in production mode
docker-compose --profile production up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/vpn_detector
REDIS_URL=redis://your-redis-host:6379
JWT_SECRET=<64-char-random-string>
FRONTEND_URL=https://yourdomain.com
```

### SSL/TLS Configuration

1. Place SSL certificates in `nginx/ssl/`
2. Update `nginx/nginx.conf` with your domain
3. Restart nginx service

## 🔒 Security Considerations

- **Change default passwords** in `.env` before production
- **Use strong JWT secrets** (minimum 32 characters)
- **Enable HTTPS** for production deployments
- **Configure firewall** to restrict MongoDB/Redis access
- **Regular updates** of dependencies
- **Rate limiting** is enabled by default
- **API keys** for third-party services should be kept secure

## 🛠️ Development

### Project Structure

```
vpn-detector/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Redis, Logger
│   │   ├── middleware/      # Auth, Rate-limit, Validation
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   └── server.ts        # Entry point
│   ├── data/                # VPN ranges, threat feeds
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # Auth, Theme contexts
│   │   ├── services/        # API clients
│   │   └── App.tsx
│   └── package.json
└── docker-compose.yml
```

### Adding New Detection Methods

1. Create service in `backend/src/services/`
2. Integrate in `detection.service.ts`
3. Update score calculation weights
4. Add UI component in frontend
5. Update documentation

## 📊 Performance Benchmarks

- **Single Lookup**: <500ms (cold) / <150ms (warm with cache)
- **Bulk Processing**: ~1,000 IPs/minute on standard VM
- **Cache Hit Rate**: >80% for repeated queries
- **Uptime**: 99.5% with health checks and auto-restart

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

- **Swami Keshwanand Institute of Technology, Management and Gramothan** - Research environment and resources
- **Mentor: Shweta Sharma** - Invaluable guidance and support
- **Tor Project** - Exit node lists
- **Cloud Providers** - Public CIDR ranges
- **Open Source Community** - Libraries and tools

## 📧 Contact

**Project Author**: Kartik Khorwal (22ESKCS112)  
**Mentor**: Sneha Sharma  
**Institution**: Swami Keshwanand Institute of Technology, Management and Gramothan

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ for Cybersecurity and Law Enforcement**
