import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import promClient from "prom-client";
import express_prom_bundle from "express-prom-bundle";

import tenantRoutes from './tenant/tenant.routes';

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
})

const app = express();
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use("/tenant", tenantRoutes);

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get("/", (req, res) => {
  return res.status(200).send("Tenant Microservice is running!");
});

const PORT = process.env.PORT || 8003;
app.listen(PORT, () => {
  console.log(`🚀 Tenant Microservice has started on port ${PORT}`);
});
