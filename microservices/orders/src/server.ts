import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import promClient from "prom-client";
import express_prom_bundle from "express-prom-bundle";

import logger, { morganStream } from "./config/logger";
import orderRoutes from "./order/order.routes";
import cartRoutes from "./cart/cart.routes";
import { initRedis } from "./db/redis";

const COMPONENT_NAME = "OrderServiceApp";

const register = new promClient.Registry();

promClient.collectDefaultMetrics({
  register,
  prefix: 'orders_'
});
logger.info("Default Prometheus metrics collected", { component: COMPONENT_NAME, prefix: 'orders_' });

const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
});
logger.info("Prometheus metrics middleware configured", { component: COMPONENT_NAME });

const app = express();

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: morganStream }));
logger.info("Morgan HTTP request logger middleware initialized", { component: COMPONENT_NAME, format: process.env.NODE_ENV === 'production' ? 'combined' : 'dev' });

app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.get('/metrics', async (req: Request, res: Response) => {
  logger.info("Metrics endpoint requested", { ip: req.ip, component: COMPONENT_NAME, subComponent: "MetricsEndpoint" });
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
    logger.info("Metrics successfully served", { component: COMPONENT_NAME, subComponent: "MetricsEndpoint" });
  } catch (error: any) {
    logger.error("Error serving metrics", { errorMessage: error.message, stack: error.stack, component: COMPONENT_NAME, subComponent: "MetricsEndpoint" });
    res.status(500).send("Error serving metrics");
  }
});

logger.info("Attempting to initialize Redis from external module.", { component: COMPONENT_NAME, subComponent: "RedisInitCall" });
initRedis();

app.use('/order', orderRoutes);
app.use('/cart', cartRoutes);

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get("/", (req: Request, res: Response) => {
  logger.info("Root health check endpoint hit", { ip: req.ip, path: req.originalUrl, component: COMPONENT_NAME });
  return res.status(200).send("Orders Microservice is running!");
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  logger.info(`🚀 Orders Microservice has started on port ${PORT}`, { component: COMPONENT_NAME, port: PORT });
});