#!/bin/bash

echo "========================================="
echo "VPN Detection System - Codespace Setup"
echo "========================================="

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Start Docker containers
echo "🐳 Starting Docker containers (MongoDB + Redis)..."
cd ..
docker-compose up -d

# Wait for containers to be ready
echo "⏳ Waiting for databases to start..."
sleep 10

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the application:"
echo "1. Backend:  cd backend && npm run dev:simple"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "Or use: ./start-servers.sh"
echo "========================================="
