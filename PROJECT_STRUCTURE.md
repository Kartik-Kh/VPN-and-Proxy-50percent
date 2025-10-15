# Project Structure Reference

## 📁 Complete File Tree

```
vpn-detector/
│
├── 📄 README.md                      ⭐ Main documentation
├── 📄 QUICKSTART.md                  ⭐ Quick start guide  
├── 📄 START_HERE.md                  ⭐⭐⭐ READ THIS FIRST
├── 📄 DEPLOYMENT.md                  📦 Production deployment
├── 📄 IMPLEMENTATION_SUMMARY.md      📊 What was built
├── 📄 docker-compose.yml             🐳 All services config
├── 🔧 setup.sh                       🐧 Linux/Mac setup
├── 🔧 setup.bat                      🪟 Windows setup
│
├── 📁 .github/
│   └── workflows/
│       └── ci-cd.yml                 ⚙️ CI/CD pipeline
│
├── 📁 backend/                       🔙 Node.js + TypeScript API
│   ├── 📄 package.json              
│   ├── 📄 tsconfig.json             
│   ├── 📄 Dockerfile                
│   ├── 📄 .env.example              ⚙️ Environment template
│   ├── 📄 .env                      🔒 Your config (create this!)
│   │
│   ├── 📁 src/
│   │   ├── 📄 server.ts             ⭐ Main entry point
│   │   │
│   │   ├── 📁 config/
│   │   │   ├── database.ts          💾 MongoDB connection
│   │   │   ├── redis.ts             🔴 Redis cache client
│   │   │   └── logger.ts            📝 Winston logger
│   │   │
│   │   ├── 📁 models/
│   │   │   ├── User.ts              👤 User schema
│   │   │   └── Lookup.ts            🔍 Lookup history schema
│   │   │
│   │   ├── 📁 routes/
│   │   │   ├── auth.routes.ts       🔐 Login/Register
│   │   │   ├── detect.ts            🎯 Single IP detection
│   │   │   ├── bulk.routes.ts       📦 Bulk CSV processing
│   │   │   └── history.routes.ts    📊 Lookup history
│   │   │
│   │   ├── 📁 middleware/
│   │   │   ├── auth.middleware.ts   🛡️ JWT verification
│   │   │   ├── error.middleware.ts  ⚠️ Error handler
│   │   │   ├── rate-limit.middleware.ts 🚦 Rate limiting
│   │   │   └── validation.middleware.ts ✅ Input validation
│   │   │
│   │   ├── 📁 services/
│   │   │   ├── detection.service.ts     🔍 Core detection
│   │   │   ├── vpn-detection.service.ts 🎯 VPN analysis
│   │   │   ├── ip-intelligence.service.ts 🧠 IP data
│   │   │   ├── network-metrics.service.ts 📡 Network data
│   │   │   ├── whois.service.ts         📇 WHOIS lookup
│   │   │   ├── ml-detection.service.ts  🤖 ML analysis
│   │   │   └── bulk-processing.service.ts 📦 Bulk jobs
│   │   │
│   │   └── 📁 types/
│   │       └── whois-json.d.ts
│   │
│   ├── 📁 data/
│   │   └── vpn_ranges.json          📋 VPN IP ranges
│   │
│   └── 📁 logs/                     📝 Application logs
│       ├── combined.log
│       ├── error.log
│       └── exceptions.log
│
├── 📁 frontend/                     🎨 React + TypeScript SPA
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📄 vite.config.ts
│   ├── 📄 Dockerfile
│   ├── 📄 .env                      ⚙️ API URL config
│   ├── 📄 index.html
│   │
│   ├── 📁 public/
│   │   └── assets/
│   │
│   └── 📁 src/
│       ├── 📄 App.tsx               ⭐ Main app component
│       ├── 📄 main.tsx              🚀 Entry point
│       ├── 📄 theme.ts              🎨 MUI theme
│       │
│       ├── 📁 components/
│       │   ├── Home.tsx             🏠 Landing page
│       │   ├── IPDetector.tsx       🔍 Single IP UI
│       │   ├── BulkAnalysis.tsx     📦 Bulk upload UI
│       │   ├── HistoryView.tsx      📊 History table
│       │   ├── Navbar.tsx           🧭 Navigation
│       │   └── Auth/
│       │       ├── Login.tsx        🔐 Login form
│       │       └── Register.tsx     📝 Register form
│       │
│       ├── 📁 contexts/
│       │   └── AuthContext.tsx      🔒 Auth state
│       │
│       └── 📁 services/
│           └── vpn-detection.service.ts 🌐 API client
│
└── 📁 nginx/                        🌐 Reverse proxy (optional)
    ├── nginx.conf
    └── ssl/
        ├── fullchain.pem
        └── privkey.pem
```

## 🎯 Key Files You'll Edit

### 🔥 Must Configure:
- `backend/.env` - Database & API keys
- `frontend/.env` - Backend API URL

### 📝 Customize for Your Needs:
- `backend/data/vpn_ranges.json` - Add more VPN ranges
- `backend/src/routes/detect.ts` - Detection logic
- `frontend/src/components/` - UI customization

### 📖 Read for Understanding:
- `README.md` - Full documentation
- `START_HERE.md` - Quick start steps
- `IMPLEMENTATION_SUMMARY.md` - What's included

## 🔄 Data Flow

```
┌─────────────┐
│   Browser   │
│ (Port 3000) │
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────┐     ┌──────────────┐
│   Nginx     │────▶│   Backend    │
│  (Port 80)  │     │  (Port 5000) │
│  (Optional) │     └──────┬───────┘
└─────────────┘            │
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ MongoDB │      │  Redis  │      │ Socket  │
   │  (27017)│      │ (6379)  │      │   .io   │
   └─────────┘      └─────────┘      └─────────┘
   History DB       Cache Layer      Real-time
```

## 📊 Request Flow Example

### Single IP Detection:

```
1. User enters IP in browser
   ↓
2. Frontend sends POST /api/detect
   ↓
3. Backend auth middleware checks JWT
   ↓
4. Rate limiter checks request limit
   ↓
5. Detection service:
   - Checks Redis cache
   - If not cached:
     • CIDR range check
     • DNS analysis
     • WHOIS lookup
     • Network metrics
   - Calculates score
   ↓
6. Save to MongoDB (history)
   ↓
7. Cache in Redis (1 hour TTL)
   ↓
8. Return result to frontend
   ↓
9. Display verdict to user
```

### Bulk Upload:

```
1. User uploads CSV file
   ↓
2. Backend creates job ID
   ↓
3. Parse CSV → extract IPs
   ↓
4. Start background processing
   ↓
5. For each IP in batches:
   - Run detection
   - Emit progress via Socket.io
   - Save to job results
   ↓
6. Frontend shows real-time progress bar
   ↓
7. On completion:
   - Generate downloadable report
   - Notify user via WebSocket
```

## 🗄️ Database Schema

### Users Collection:
```javascript
{
  _id: ObjectId,
  username: String,
  email: String (unique),
  password: String (hashed),
  role: "admin" | "user",
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}
```

### Lookups Collection:
```javascript
{
  _id: ObjectId,
  ip: String (indexed),
  verdict: "PROXY/VPN" | "ORIGINAL",
  score: Number (0-100),
  confidence: Number,
  checks: [
    {
      type: String,
      result: Boolean,
      details: String
    }
  ],
  userId: String (indexed),
  timestamp: Date (indexed),
  createdAt: Date,
  updatedAt: Date
}
```

## 🔑 Environment Variables

### Backend (.env):
```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://admin:pass@localhost:27017/vpn_detector
REDIS_URL=redis://:pass@localhost:6379

# Security
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

# Optional API Keys
IPQUALITYSCORE_API_KEY=
ABUSEIPDB_API_KEY=
PROXYCHECK_API_KEY=
```

### Frontend (.env):
```env
VITE_API_URL=http://localhost:5000/api
```

## 🛠️ NPM Scripts

### Backend:
```bash
npm run dev      # Development with hot reload
npm run build    # Compile TypeScript
npm start        # Production server
npm test         # Run tests
```

### Frontend:
```bash
npm run dev      # Development server (HMR)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📦 Docker Services

```yaml
mongodb:  Port 27017 - Database
redis:    Port 6379  - Cache
backend:  Port 5000  - API Server
frontend: Port 3000  - React App (dev)
          Port 80    - Nginx (production)
nginx:    Port 80/443 - Reverse Proxy
```

## 🔍 Useful Commands

```bash
# View all running containers
docker-compose ps

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f mongodb

# Access MongoDB shell
docker exec -it vpn_detector_mongodb mongosh -u admin -p vpndetector2025

# Access Redis CLI
docker exec -it vpn_detector_redis redis-cli -a vpnredis2025

# Restart specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

---

**📖 For more details, see:**
- **START_HERE.md** - Begin here!
- **README.md** - Full documentation
- **DEPLOYMENT.md** - Production setup
