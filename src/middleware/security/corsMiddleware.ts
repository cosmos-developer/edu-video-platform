import cors from 'cors';
import { environment } from '../../config/environment';
import { logger } from '../../utils/logger';

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = environment.cors.origins;
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow localhost with any port
    if (environment.server.isDevelopment && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Client-Version',
    'X-Request-ID'
  ],
  
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  
  credentials: true,
  
  // Preflight cache time
  maxAge: 86400, // 24 hours
  
  // Handle preflight for all routes
  preflightContinue: false,
  
  optionsSuccessStatus: 204
};

export const corsMiddleware = cors(corsOptions);