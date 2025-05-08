import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import promClient from "prom-client";
import express_prom_bundle from "express-prom-bundle";

// Assuming a logger is available, similar to other services. Adjust path if necessary.
import logger from "./config/logger";
import productRoutes from './product/product.routes'
import { initRedis } from "./db/redis";

const COMPONENT_NAME = "ProductsMicroserviceApp";

logger.info("Products Microservice - Initialization started.", { component: COMPONENT_NAME });

const register = new promClient.Registry();

promClient.collectDefaultMetrics({
  register,
  prefix: 'products_'
});

const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true
});
logger.info("Prometheus metrics configured.", { component: COMPONENT_NAME });

const app = express();
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());
logger.info("Core middleware (metrics, CORS, JSON parser) configured.", { component: COMPONENT_NAME });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

initRedis().then(() => {
  logger.info("Redis initialized successfully.", { component: COMPONENT_NAME });
}).catch(err => {
  logger.error("Redis initialization failed.", { error: err, component: COMPONENT_NAME });
});

app.use("/product", productRoutes);
logger.info("Product routes configured.", { component: COMPONENT_NAME });

app.get("/", (req, res) => {
  return res.status(200).send("Products Microservice is running!");
});

const PORT = process.env.PORT || 8002;
app.listen(PORT, () => {
  logger.info(`🚀 Products Microservice has started on port ${PORT}`, { port: PORT, component: COMPONENT_NAME });
});