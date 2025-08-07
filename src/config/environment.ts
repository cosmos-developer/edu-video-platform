import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variables schema with validation
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_VERSION: z.string().default('v1'),

  // Database Configuration
  DATABASE_URL: z.string().url(),

  // JWT Configuration
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google Cloud Storage
  GOOGLE_CLOUD_PROJECT_ID: z.string(),
  GOOGLE_CLOUD_STORAGE_BUCKET: z.string(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // Redis Configuration
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),

  // AI Provider Configuration
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_PALM_API_KEY: z.string().optional(),

  // Email Configuration (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.coerce.number().default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),

  // Session Configuration
  SESSION_TIMEOUT: z.coerce.number().default(30),

  // Security Configuration
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  MAX_FILE_SIZE: z.string().default('100MB'),
  ALLOWED_FILE_TYPES: z.string().default('mp4,avi,mov,wmv'),

  // Analytics Configuration
  ENABLE_ANALYTICS: z.coerce.boolean().default(true),
  ANALYTICS_RETENTION_DAYS: z.coerce.number().default(90),

  // CORS Configuration
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(issue => issue.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

export const env = parseEnv();

// Configuration object
export const config = {
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    apiVersion: env.API_VERSION,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },
  
  database: {
    url: env.DATABASE_URL,
  },
  
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  
  googleCloud: {
    projectId: env.GOOGLE_CLOUD_PROJECT_ID,
    storageBucket: env.GOOGLE_CLOUD_STORAGE_BUCKET,
    credentials: env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  
  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
  },
  
  ai: {
    openai: {
      apiKey: env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
    },
    googlePalm: {
      apiKey: env.GOOGLE_PALM_API_KEY,
    },
  },
  
  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    password: env.SMTP_PASS,
  },
  
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000, // Convert minutes to milliseconds
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  
  logging: {
    level: env.LOG_LEVEL,
    file: env.LOG_FILE,
  },
  
  session: {
    timeoutMinutes: env.SESSION_TIMEOUT,
  },
  
  security: {
    bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
    maxFileSize: env.MAX_FILE_SIZE,
    allowedFileTypes: env.ALLOWED_FILE_TYPES.split(','),
  },
  
  analytics: {
    enabled: env.ENABLE_ANALYTICS,
    retentionDays: env.ANALYTICS_RETENTION_DAYS,
  },
  
  cors: {
    origins: env.CORS_ORIGINS.split(','),
  },
  
  frontend: {
    url: env.FRONTEND_URL,
  },
} as const;

// Export both named and default
export const environment = config;
export default config;