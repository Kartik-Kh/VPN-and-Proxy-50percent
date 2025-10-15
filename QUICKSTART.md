# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Option 1: Automated Setup (Recommended)

#### Windows:
```cmd
setup.bat
```

#### Linux/Mac:
```bash
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

**1. Install Dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

**2. Configure Environment**
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your settings

# Frontend
cd ../frontend
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

**3. Start Services**

Using Docker Compose:
```bash
docker-compose up -d
```

Or start individually:
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

**4. Access Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

**5. Create First User**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

## 📱 Using the Application

### 1. Single IP Detection

Navigate to `/detect` and enter an IP address:
```
Example: 8.8.8.8
```

### 2. Bulk Analysis

1. Navigate to `/bulk`
2. Upload a CSV file with IP addresses
3. Monitor progress in real-time
4. Download results when complete

CSV format:
```csv
ip
8.8.8.8
1.1.1.1
104.16.0.1
```

### 3. View History

Navigate to `/history` to see all past lookups with:
- Filtering by verdict, date range
- Search by IP address
- Export to CSV

## 🔧 Common Commands

### Development
```bash
# Backend dev server with hot reload
cd backend && npm run dev

# Frontend dev server with HMR
cd frontend && npm run dev

# Build for production
cd backend && npm run build
cd frontend && npm run build
```

### Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Database
```bash
# MongoDB shell
docker exec -it vpn_detector_mongodb mongosh -u admin -p vpndetector2025

# Redis CLI
docker exec -it vpn_detector_redis redis-cli -a vpnredis2025
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port
# Windows
netstat -ano | findstr :5000

# Linux/Mac
lsof -i :5000

# Kill process
# Windows
taskkill /PID <PID> /F

# Linux/Mac
kill -9 <PID>
```

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Restart MongoDB
docker-compose restart mongodb

# View MongoDB logs
docker-compose logs mongodb
```

### Redis Connection Failed
```bash
# Check if Redis is running
docker ps | grep redis

# Restart Redis
docker-compose restart redis

# Test Redis connection
docker exec vpn_detector_redis redis-cli -a vpnredis2025 ping
```

### Frontend Build Errors
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Backend Build Errors
```bash
# Clear build artifacts
cd backend
rm -rf dist node_modules package-lock.json
npm install
npm run build
```

## 📚 Next Steps

1. **Read the full [README.md](README.md)** for detailed features
2. **Check [DEPLOYMENT.md](DEPLOYMENT.md)** for production setup
3. **Review API documentation** in README.md
4. **Configure third-party API keys** in backend/.env for enhanced detection
5. **Set up monitoring and backups** for production use

## 🆘 Getting Help

- **Documentation**: Check README.md and DEPLOYMENT.md
- **Issues**: Open a GitHub issue
- **Logs**: Check `docker-compose logs` or `backend/logs/`
- **Health Check**: Visit http://localhost:5000/health

## ✅ Verification Checklist

- [ ] Node.js 18+ installed
- [ ] Docker and Docker Compose installed
- [ ] MongoDB running and accessible
- [ ] Redis running and accessible
- [ ] Backend server started on port 5000
- [ ] Frontend server started on port 3000
- [ ] Health check returns OK status
- [ ] First user account created
- [ ] Can perform IP detection
- [ ] Can view history

---

**Happy Detecting! 🔍🛡️**
