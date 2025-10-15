# Deployment Guide

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Domain name with DNS configured
- SSL/TLS certificate (Let's Encrypt recommended)
- Minimum 2GB RAM, 2 CPU cores, 20GB disk

## Production Deployment Steps

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/vpn-detector.git
cd vpn-detector
```

### 3. Configure Environment

```bash
# Backend environment
cd backend
cp .env.example .env
nano .env
```

Update with production values:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://admin:STRONG_PASSWORD_HERE@mongodb:27017/vpn_detector?authSource=admin
REDIS_URL=redis://:STRONG_PASSWORD_HERE@redis:6379
JWT_SECRET=YOUR_64_CHARACTER_RANDOM_STRING_HERE
FRONTEND_URL=https://yourdomain.com
```

Generate strong secrets:
```bash
# JWT Secret
openssl rand -hex 32

# MongoDB Password
openssl rand -base64 32

# Redis Password
openssl rand -base64 32
```

### 4. SSL Certificate Setup

#### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot -y

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Set permissions
sudo chown $USER:$USER nginx/ssl/*
```

#### Self-Signed Certificate (Development)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### 5. Configure Nginx

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:5000;
    }

    upstream frontend {
        server frontend:80;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API proxy
        location /api/ {
            proxy_pass http://backend/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Socket.io WebSocket
        location /socket.io/ {
            proxy_pass http://backend/socket.io/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        # Frontend
        location / {
            proxy_pass http://frontend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 6. Update Docker Compose for Production

Edit `docker-compose.yml`, update passwords to match .env:

```yaml
services:
  mongodb:
    environment:
      MONGO_INITDB_ROOT_PASSWORD: YOUR_STRONG_PASSWORD

  redis:
    command: redis-server --appendonly yes --requirepass YOUR_STRONG_PASSWORD
```

### 7. Deploy Application

```bash
# Build and start services
docker-compose --profile production up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Verify health
curl http://localhost:5000/health
```

### 8. Create Admin User

```bash
# Create first admin user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123!"
  }'
```

### 9. Setup Monitoring & Backups

#### MongoDB Backup Script

Create `scripts/backup-mongodb.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec vpn_detector_mongodb mongodump \
  --username admin \
  --password YOUR_MONGO_PASSWORD \
  --authenticationDatabase admin \
  --out /data/backup

docker cp vpn_detector_mongodb:/data/backup $BACKUP_DIR/$DATE

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup-mongodb.sh
```

#### Log Rotation

Create `/etc/logrotate.d/vpn-detector`:

```
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
```

### 10. Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to MongoDB and Redis
sudo ufw deny 27017/tcp
sudo ufw deny 6379/tcp

# Enable firewall
sudo ufw enable
```

### 11. Performance Optimization

#### MongoDB Indexes

```bash
docker exec -it vpn_detector_mongodb mongosh -u admin -p YOUR_PASSWORD --authenticationDatabase admin

use vpn_detector
db.lookups.createIndex({ "userId": 1, "timestamp": -1 })
db.lookups.createIndex({ "verdict": 1, "timestamp": -1 })
db.lookups.createIndex({ "ip": 1 })
db.users.createIndex({ "email": 1 }, { unique: true })
```

#### Redis Memory Limit

```bash
docker exec -it vpn_detector_redis redis-cli
CONFIG SET maxmemory 512mb
CONFIG SET maxmemory-policy allkeys-lru
```

### 12. SSL Certificate Auto-Renewal

```bash
# Create renewal script
sudo nano /etc/cron.daily/certbot-renew

#!/bin/bash
certbot renew --quiet --deploy-hook "docker-compose -f /path/to/docker-compose.yml restart nginx"

# Make executable
sudo chmod +x /etc/cron.daily/certbot-renew
```

## Maintenance

### Update Application

```bash
git pull origin main
docker-compose --profile production up -d --build
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mongodb
```

### Database Maintenance

```bash
# MongoDB shell access
docker exec -it vpn_detector_mongodb mongosh -u admin -p PASSWORD

# Redis CLI access
docker exec -it vpn_detector_redis redis-cli -a PASSWORD
```

### Scaling

To handle more traffic, update `docker-compose.yml`:

```yaml
backend:
  deploy:
    replicas: 3
    resources:
      limits:
        cpus: '2'
        memory: 2G
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs backend

# Restart specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build --force-recreate backend
```

### Database Connection Issues

```bash
# Test MongoDB connection
docker exec vpn_detector_backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
"
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check MongoDB slow queries
docker exec -it vpn_detector_mongodb mongosh -u admin -p PASSWORD
db.setProfilingLevel(2)
db.system.profile.find().sort({ts: -1}).limit(10)
```

## Security Checklist

- [ ] Strong passwords for MongoDB, Redis, JWT
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules applied
- [ ] Regular backups scheduled
- [ ] Log rotation configured
- [ ] Security headers enabled
- [ ] Rate limiting active
- [ ] Environment variables secured
- [ ] Docker containers running as non-root
- [ ] Regular security updates applied

## Support

For issues or questions:
- Open GitHub issue
- Check documentation
- Review logs: `docker-compose logs`
