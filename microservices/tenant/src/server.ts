import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import promClient from "prom-client";
import express_prom_bundle from "express-prom-bundle";

// Import logger dan morgan
import morgan from "morgan";
import logger, { morganStream } from "./config/logger"; // Sesuaikan path jika perlu

import tenantRoutes from './tenant/tenant.routes';

const COMPONENT_NAME = "TenantMicroserviceApp";

logger.info("Tenant Microservice - Initialization started.", { component: COMPONENT_NAME });

const register = new promClient.Registry();

promClient.collectDefaultMetrics({
  register,
  prefix: 'tenant_'
});

const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true
});
logger.info("Prometheus metrics configured.", { component: COMPONENT_NAME });

const app = express();

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: morganStream }));

app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());
logger.info("Core middleware (morgan, metrics, CORS, JSON parser) configured.", { component: COMPONENT_NAME });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use("/tenant", tenantRoutes);
logger.info("Tenant routes configured.", { component: COMPONENT_NAME });

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get("/", (req, res) => {
  return res.status(200).send("Tenant Microservice is running!");
});

const PORT = process.env.PORT || 8003;
app.listen(PORT, () => {
  logger.info(`🚀 Tenant Microservice has started on port ${PORT}`, { port: PORT, component: COMPONENT_NAME });
});