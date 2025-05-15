import winston from 'winston';
import path from 'path';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

const getCurrentLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  if (process.env.LOG_LEVEL_WORKLOAD_TEST) {
    return process.env.LOG_LEVEL_WORKLOAD_TEST; // e.g., 'warn'
  }
  return env === 'development' ? 'debug' : 'info';
};

const structuredLogFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);


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

      if (Object.keys(meta).length) {
        const metaString = Object.entries(meta)
          .map(([key, value]) => {
            const formattedValue = typeof value === 'string' ? `"${value}"` : (typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
            return `${key}=${formattedValue}`;
          })
          .join(' ');
        if (metaString) {
          log += ` ${metaString}`;
        }
      }
      return log;
    }
  )
);


const loggerTransports: winston.transport[] = [];

const env = process.env.NODE_ENV || 'development';

if (env === 'development') {
  loggerTransports.push(
    new winston.transports.Console({
      format: developmentConsoleFormat,
      level: getCurrentLevel(),
    })
  );
  loggerTransports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/app-dev.log'),
      format: structuredLogFormat,
      level: getCurrentLevel(),
    })
  );
} else {
  loggerTransports.push(
    new winston.transports.Console({
      format: structuredLogFormat,
      level: getCurrentLevel(),
    })
  );
}

const logger = winston.createLogger({
  level: getCurrentLevel(),
  levels: logLevels,
  format: structuredLogFormat,
  transports: loggerTransports,
  exitOnError: false,
  defaultMeta: { service: 'wishlist-service' },
});

export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

if (process.env.NODE_ENV !== 'production') {
  logger.debug('Logging initialized in development mode (debug level active for console)');
} else {
  logger.info('Logging initialized in production mode (info level active)');
}

export default logger;