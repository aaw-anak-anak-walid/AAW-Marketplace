import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import "dotenv/config";
import fs from 'fs';
import logger from '../config/logger';

const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_PORT = parseInt(process.env.DB_PORT ?? "5432", 10);
const DB_USER = process.env.DB_USER ?? "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "postgres";
const DB_NAME = process.env.DB_NAME ?? "postgres";
const DB_SSL_ENV = process.env.DB_SSL;
const NODE_EXTRA_CA_CERTS_PATH = process.env.NODE_EXTRA_CA_CERTS;

const component = "db/index.ts";

logger.debug(`DB_HOST: ${DB_HOST}`, { component });
logger.debug(`DB_SSL_ENV: ${DB_SSL_ENV}`, { component });
logger.debug(`NODE_EXTRA_CA_CERTS_PATH: ${NODE_EXTRA_CA_CERTS_PATH}`, { component });

let sslOptions: PoolConfig['ssl'] = undefined;

if (DB_SSL_ENV === 'true') {
  logger.info(`SSL is enabled via DB_SSL.`, { component });
  sslOptions = {
    rejectUnauthorized: true,
  };

  if (NODE_EXTRA_CA_CERTS_PATH) {
    logger.debug(`Attempting to load CA from: ${NODE_EXTRA_CA_CERTS_PATH}`, { component });
    if (fs.existsSync(NODE_EXTRA_CA_CERTS_PATH)) {
      try {
        sslOptions.ca = fs.readFileSync(NODE_EXTRA_CA_CERTS_PATH).toString();
        logger.info(`Successfully loaded CA from ${NODE_EXTRA_CA_CERTS_PATH}`, { component });
      } catch (e: any) {
        logger.error(`Error reading CA file ${NODE_EXTRA_CA_CERTS_PATH}: ${e.message}`, { component, stack: e.stack });
      }
    } else {
      logger.warn(`CA file specified in NODE_EXTRA_CA_CERTS_PATH (${NODE_EXTRA_CA_CERTS_PATH}) does not exist.`, { component });
    }
  } else {
    logger.debug(`NODE_EXTRA_CA_CERTS_PATH is not set. SSL will use system CAs.`, { component });
  }
} else {
  logger.info(`SSL is disabled or DB_SSL is not 'true'.`, { component });
}

const poolConfig: PoolConfig = {
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
};

if (sslOptions) {
  poolConfig.ssl = sslOptions;
}

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.debug('pg.Pool: New client connected to the database.', { component });
});

pool.on('error', (err, client) => {
  logger.error('pg.Pool: Unexpected error on idle client', { component, stack: err.stack, client });
});

export const db = drizzle(pool);

logger.info('Database pool and Drizzle instance configured.', { component });