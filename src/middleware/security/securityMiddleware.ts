import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { environment } from '../../config/environment';

// Security middleware configuration
export const securityMiddleware = [
  // Basic security headers
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: environment.server.isDevelopment 
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] 
          : ["'self'"],
        connectSrc: ["'self'", "https:", "wss:", "ws:"],
        mediaSrc: ["'self'", "blob:", "https:"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: environment.server.isProduction ? [] : null
      }
    },
    
    // Cross Origin Embedder Policy
    crossOriginEmbedderPolicy: false,
    
    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },
    
    // Frameguard (X-Frame-Options)
    frameguard: {
      action: 'deny'
    },
    
    // Hide Powered-By header
    hidePoweredBy: true,
    
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    
    // IE No Open
    ieNoOpen: true,
    
    // Don't Sniff Mimetype
    noSniff: true,
    
    // Origin Agent Cluster
    originAgentCluster: true,
    
    // Permitted Cross Domain Policies
    permittedCrossDomainPolicies: false,
    
    // Referrer Policy
    referrerPolicy: {
      policy: ['no-referrer', 'strict-origin-when-cross-origin']
    },
    
    // X-XSS-Protection
    xssFilter: true
  }),

  // Custom security headers
  (req: Request, res: Response, next: NextFunction) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add request ID for tracking
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = generateRequestId();
    }
    
    res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
    
    next();
  }
];

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}