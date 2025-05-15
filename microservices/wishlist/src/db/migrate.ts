import dotenv from 'dotenv';
dotenv.config();

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index';
import logger from '@src/config/logger'; 

const COMPONENT_NAME = "DatabaseMigration";

const main = async () => {
    try {
        logger.info("Starting database migration", { component: COMPONENT_NAME });

        await migrate(db, { migrationsFolder: './drizzle' });

        logger.info("Database migration completed successfully", { component: COMPONENT_NAME });
    } catch (error: any) {
        logger.error("An error occurred during database migration", {
            component: COMPONENT_NAME,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        });
        throw error;
    } finally {
        await pool.end();
        logger.info("Database connection pool closed", { component: COMPONENT_NAME });
    }
};

main().catch((error) => {
    logger.error("Unhandled error in migration script", {
        component: COMPONENT_NAME,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
});