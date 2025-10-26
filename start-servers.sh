#!/bin/bash

echo "Starting VPN Detection System..."

# Start backend in background
echo "🚀 Starting backend on port 5000..."
cd backend
npm run dev:simple &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend on port 5173..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servers started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Access the app at:"
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
wait
