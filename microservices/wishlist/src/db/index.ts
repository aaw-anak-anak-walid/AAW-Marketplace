import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import "dotenv/config";
import fs from 'fs';


const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_PORT = parseInt(process.env.DB_PORT ?? "5432", 10);
const DB_USER = process.env.DB_USER ?? "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "postgres";
const DB_NAME = process.env.DB_NAME ?? "postgres";
const DB_SSL_ENV = process.env.DB_SSL;
const NODE_EXTRA_CA_CERTS_PATH = process.env.NODE_EXTRA_CA_CERTS;


console.log(`[db/index.ts] DB_HOST: ${DB_HOST}`);
console.log(`[db/index.ts] DB_SSL_ENV: ${DB_SSL_ENV}`);
console.log(`[db/index.ts] NODE_EXTRA_CA_CERTS_PATH: ${NODE_EXTRA_CA_CERTS_PATH}`);

let sslOptions: PoolConfig['ssl'] = undefined;

if (DB_SSL_ENV === 'true') {
  console.log(`[db/index.ts] SSL is enabled via DB_SSL.`);
  sslOptions = {
    rejectUnauthorized: false,
  };

  if (NODE_EXTRA_CA_CERTS_PATH) {
    console.log(`[db/index.ts] Attempting to load CA from: ${NODE_EXTRA_CA_CERTS_PATH}`);
    if (fs.existsSync(NODE_EXTRA_CA_CERTS_PATH)) {
      try {
        sslOptions.ca = fs.readFileSync(NODE_EXTRA_CA_CERTS_PATH).toString();
        console.log(`[db/index.ts] Successfully loaded CA from ${NODE_EXTRA_CA_CERTS_PATH}`);
      } catch (e: any) {
        console.error(`[db/index.ts] Error reading CA file ${NODE_EXTRA_CA_CERTS_PATH}: ${e.message}`);
      }
    } else {
      console.warn(`[db/index.ts] CA file specified in NODE_EXTRA_CA_CERTS_PATH (${NODE_EXTRA_CA_CERTS_PATH}) does not exist.`);
    }
  } else {
    console.log(`[db/index.ts] NODE_EXTRA_CA_CERTS_PATH is not set. SSL will use system CAs.`);
  }
} else {
  console.log(`[db/index.ts] SSL is disabled or DB_SSL is not 'true'.`);
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
  console.log('[db/index.ts] pg.Pool: New client connected to the database.');
});

pool.on('error', (err, client) => {
  console.error('[db/index.ts] pg.Pool: Unexpected error on idle client', err);

});

export const db = drizzle(pool);

console.log('[db/index.ts] Database pool and Drizzle instance configured.');