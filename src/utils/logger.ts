import winston from 'winston';
import { config } from '@/config/environment';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports: winston.transport[] = [
  new winston.transports.Console(),
];

// Add file transport in production
if (config.server.isProduction) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.file,
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/all.log',
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: config.server.isDevelopment ? 'debug' : config.logging.level,
  levels,
  format,
  transports,
});

export { logger };
export default logger;