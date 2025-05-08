import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import express_prom_bundle from "express-prom-bundle";
import morgan from "morgan"; // For HTTP request logging
import logger, { morganStream } from './config/logger'; 

import userRoutes from './user/user.routes';

const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true
})

const app = express();

app.use(morgan('combined', { stream: morganStream }));

app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.use("/user", userRoutes);

app.get("/", (req, res) => {
  logger.info("Health check endpoint called for Authentication Microservice", {
    component: "HealthCheck",
    remoteAddress: req.ip
  });
  return res.status(200).send("Authentication Microservice is running!");
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  logger.info(`🚀 Authentication Microservice has started on port ${PORT}`, {
    port: PORT,
    node_env: process.env.NODE_ENV || 'development'
  });
});


// Graceful shutdown and error handling
const unexpectedErrorHandler = (error: Error, origin: string) => {
  logger.error(`Unhandled ${origin}`, {
    error: error.message,
    stack: error.stack,
    origin: origin,
    component: "GlobalErrorHandler"
  });

  setTimeout(() => process.exit(1), 1000).unref(); // .unref() allows the program to exit if this is the only event
};

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(`Unhandled Rejection: ${reason}`);
  logger.error('Unhandled Rejection', {
    promise: promise,
    reason: reason, // This could be an error object or any other value
    error_message: error.message,
    stack: error.stack,
    component: "GlobalErrorHandler"
  });
  unexpectedErrorHandler(error, 'unhandledRejection');
});

process.on('uncaughtException', (error: Error) => {
  unexpectedErrorHandler(error, 'uncaughtException');
  logger.on('finish', () => {
    process.exit(1);
  });
  logger.end(); // End the logger to flush transports
});