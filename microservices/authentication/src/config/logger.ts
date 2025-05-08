import winston from 'winston';
import path from 'path'; 

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Determine log level based on environment
const getCurrentLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Define log format for structured logging (JSON)
const structuredLogFormat = winston.format.combine(
  winston.format.timestamp(), // Adds a 'timestamp' field
  winston.format.errors({ stack: true }), // Standardize error logging, include stack trace
  winston.format.splat(), // Enables string interpolation: logger.info('User %s logged in', userId)
  winston.format.json()    // Core change for JSON output
);

// Define log format for development console (human-readable)
const developmentConsoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, stack, component, ...meta } = info;
      let log = `${timestamp} ${level}:`;
      if (component) {
        log += ` [${component}]`;
      }
      log += ` ${message}`;
      if (stack) {
        log += `\n${stack}`;
      }
      // Print any additional meta fields
      if (Object.keys(meta).length) {
        log += ` ${JSON.stringify(meta)}`;
      }
      return log;
    }
  )
);

// Determine which format to use for the console based on the environment
const consoleFormat = process.env.NODE_ENV === 'production' ? structuredLogFormat : developmentConsoleFormat;

// Define transports
const loggerTransports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    level: getCurrentLevel(), // Allow console to show debug messages in development
  }),

  // File transport for all logs (always use structured format for files)
  new winston.transports.File({
    filename: path.join(__dirname, '../../../logs/all-structured.log'),
    format: structuredLogFormat,
    level: 'info', // Log info and above to this file
  }),

  // File transport for error logs (always use structured format for files)
  new winston.transports.File({
    filename: path.join(__dirname, '../../../logs/error-structured.log'),
    format: structuredLogFormat,
    level: 'error',
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: getCurrentLevel(), 
  levels: logLevels,
  format: structuredLogFormat,
  transports: loggerTransports,
  exitOnError: false, 
  defaultMeta: { service: 'authentication-service' }, // Add a default field to all logs
});

// Stream for Morgan (HTTP request logger middleware)
export const morganStream = {
    write: (message: string) => {
        // Morgan messages are typically strings. This will wrap Morgan's output in Winston's JSON structure.
        logger.http(message.trim());
    },
};

// If not in production, also log to the console with a simpler format for readability
if (process.env.NODE_ENV !== 'production') {
  logger.debug('Logging initialized in development mode (debug level active for console)');
} else {
  logger.info('Logging initialized in production mode (info level active)');
}

export default logger;