import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Import configurations
import { environment } from './config/environment';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

// Import middleware
import { errorHandler } from './middleware/error/errorHandler';
import { notFoundHandler } from './middleware/error/notFoundHandler';
import { requestLogger } from './middleware/logger/requestLogger';
import { corsMiddleware } from './middleware/security/corsMiddleware';
import { securityMiddleware } from './middleware/security/securityMiddleware';
import { rateLimitMiddleware } from './middleware/security/rateLimitMiddleware';

// Import routes
import routes from './routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: environment.frontend.url,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Trust proxy if behind reverse proxy
if (environment.server.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Apply security middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(securityMiddleware);

// Apply rate limiting
app.use(rateLimitMiddleware);

// Apply general middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply logging middleware
if (environment.server.nodeEnv !== 'test') {
  app.use(morgan('combined', { 
    stream: { 
      write: (message: string) => logger.info(message.trim()) 
    } 
  }));
}
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: environment.server.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
const API_PREFIX = '/api/v1';
app.use(API_PREFIX, routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    connectDatabase.disconnect();
    
    // Close Socket.IO server
    io.close(() => {
      logger.info('Socket.IO server closed');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    logger.info('Starting server...');

    // Start server
    const port = environment.server.port;
    server.listen(port, () => {
      logger.info(`Server running on port ${port} in ${environment.server.nodeEnv} mode`);
      logger.info(`Health check available at http://localhost:${port}/health`);
      logger.info(`API endpoints available at http://localhost:${port}${API_PREFIX}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

export { app, io };