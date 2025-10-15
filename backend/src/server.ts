import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'http';

// Configuration
import { connectDatabase } from './config/database';
import { redisClient } from './config/redis';
import { logger, stream } from './config/logger';

// Middleware
import { errorMiddleware } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rate-limit.middleware';

// Routes
import detectRouter from './routes/detect-simple';
import authRoutes from './routes/auth.routes';
import historyRoutes from './routes/history.routes';
import bulkRoutes from './routes/bulk.routes';

const app = express();
const port = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in routes
app.set('io', io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', { stream }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: 'connected',
    redis: redisClient.isReady() ? 'connected' : 'disconnected',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/detect', rateLimiter, detectRouter);
app.use('/api/history', rateLimiter, historyRoutes);
app.use('/api/bulk', rateLimiter, bulkRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handling middleware
app.use(errorMiddleware);

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  socket.on('error', (error) => {
    logger.error('Socket error:', error);
  });
});

// Initialize application
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Connect to Redis (optional)
    try {
      await redisClient.connect();
    } catch (error) {
      logger.warn('Redis connection failed, continuing without cache');
    }

    // Start server
    httpServer.listen(port, () => {
      logger.info(`
      ═══════════════════════════════════════════════
      🚀 VPN Detector Server Started Successfully!
      ═══════════════════════════════════════════════
      📡 Port: ${port}
      🌍 Environment: ${process.env.NODE_ENV || 'development'}
      🗄️  MongoDB: Connected
      💾 Redis: ${redisClient.isReady() ? 'Connected' : 'Disconnected'}
      🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
      ⏰ Timestamp: ${new Date().toISOString()}
      ═══════════════════════════════════════════════
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      httpServer.close(async () => {
        await redisClient.disconnect();
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export { io };