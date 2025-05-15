import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import promClient from "prom-client";
import express_prom_bundle from "express-prom-bundle";

// Import logger dan morgan
import morgan from "morgan";
import logger, { morganStream } from "./config/logger"; // Sesuaikan path jika perlu

import wishlistRoutes from "./wishlist/wishlist.routes";

const COMPONENT_NAME = "WishlistMicroserviceApp";

logger.info("Wishlist Microservice - Initialization started.", { component: COMPONENT_NAME });

const register = new promClient.Registry();

promClient.collectDefaultMetrics({
  register,
  prefix: 'wishlist_'
});

const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
});
logger.info("Prometheus metrics configured.", { component: COMPONENT_NAME });

const app = express();

// Tambahkan morgan middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: morganStream }));

app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());
logger.info("Core middleware (morgan, metrics, CORS, JSON parser) configured.", { component: COMPONENT_NAME });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/wishlist', wishlistRoutes);
logger.info("Wishlist routes configured.", { component: COMPONENT_NAME });

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get("/", (req, res) => {
  return res.status(200).send("Wishlist Microservice is running!");
});

const PORT = process.env.PORT || 8004;
app.listen(PORT, () => {
  // Ganti console.log dengan logger.info
  logger.info(`🚀 Wishlist Microservice has started on port ${PORT}`, { port: PORT, component: COMPONENT_NAME });
});