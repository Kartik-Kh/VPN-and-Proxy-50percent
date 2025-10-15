#!/bin/bash

# VPN Detector - Automated Setup Script
# This script automates the setup process for local development

set -e  # Exit on error

echo "=================================================="
echo "  VPN & Proxy Detector - Setup Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on Windows (Git Bash/WSL)
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo -e "${YELLOW}Detected Windows environment${NC}"
    IS_WINDOWS=true
else
    IS_WINDOWS=false
fi

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION installed"
else
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm $NPM_VERSION installed"
else
    print_error "npm is not installed"
    exit 1
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker installed: $DOCKER_VERSION"
    HAS_DOCKER=true
else
    print_warning "Docker not found. MongoDB and Redis will need to be installed separately"
    HAS_DOCKER=false
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    print_success "Docker Compose installed: $COMPOSE_VERSION"
    HAS_COMPOSE=true
else
    print_warning "Docker Compose not found"
    HAS_COMPOSE=false
fi

echo ""
echo "=================================================="
echo "  Setting up Backend"
echo "=================================================="

cd backend

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    cp .env.example .env
    
    # Generate secrets
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -hex 32)
        REFRESH_SECRET=$(openssl rand -hex 32)
        
        # Update .env with generated secrets
        if [[ "$IS_WINDOWS" == true ]]; then
            sed -i "s/your-super-secret-jwt-key-change-this-in-production-min-32-chars/$JWT_SECRET/" .env
            sed -i "s/your-refresh-token-secret-change-this-too-min-32-chars/$REFRESH_SECRET/" .env
        else
            sed -i '' "s/your-super-secret-jwt-key-change-this-in-production-min-32-chars/$JWT_SECRET/" .env
            sed -i '' "s/your-refresh-token-secret-change-this-too-min-32-chars/$REFRESH_SECRET/" .env
        fi
        print_success "Generated secure JWT secrets"
    else
        print_warning "OpenSSL not found. Using default secrets (NOT SECURE FOR PRODUCTION!)"
    fi
    
    print_success "Created backend/.env"
else
    print_success "backend/.env already exists"
fi

# Create logs directory
mkdir -p logs
print_success "Created logs directory"

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
npm install
print_success "Backend dependencies installed"

# Build TypeScript
echo ""
echo "Building TypeScript..."
npm run build
print_success "TypeScript compiled successfully"

cd ..

echo ""
echo "=================================================="
echo "  Setting up Frontend"
echo "=================================================="

cd frontend

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "VITE_API_URL=http://localhost:5000/api" > .env
    print_success "Created frontend/.env"
else
    print_success "frontend/.env already exists"
fi

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
npm install
print_success "Frontend dependencies installed"

cd ..

echo ""
echo "=================================================="
echo "  Starting Services"
echo "=================================================="

if [[ "$HAS_DOCKER" == true ]] && [[ "$HAS_COMPOSE" == true ]]; then
    echo ""
    read -p "Do you want to start MongoDB and Redis with Docker Compose? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Starting Docker services..."
        docker-compose up -d mongodb redis
        
        # Wait for services to be ready
        echo "Waiting for services to start..."
        sleep 5
        
        print_success "Docker services started"
        
        # Show service status
        docker-compose ps
    fi
else
    print_warning "Docker not available. Please install and start MongoDB and Redis manually:"
    echo ""
    echo "MongoDB:"
    echo "  Download: https://www.mongodb.com/try/download/community"
    echo "  Start: mongod --dbpath /path/to/data"
    echo ""
    echo "Redis:"
    echo "  Download: https://redis.io/download"
    echo "  Start: redis-server"
fi

echo ""
echo "=================================================="
echo "  Setup Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start the backend:"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "2. Start the frontend (in a new terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   Health:   http://localhost:5000/health"
echo ""
echo "4. Create your first user:"
echo "   Visit http://localhost:3000/register"
echo ""

if [[ "$HAS_DOCKER" == true ]]; then
    echo "Docker commands:"
    echo "  View logs:    docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Restart:      docker-compose restart"
    echo ""
fi

print_success "Setup completed successfully!"
echo ""
