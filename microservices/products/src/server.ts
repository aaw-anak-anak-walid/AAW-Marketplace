import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import promClient from "prom-client";
import express_prom_bundle from "express-prom-bundle";

import productRoutes from './product/product.routes'
import { initRedis } from "./db/redis";

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
})

const app = express();
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

initRedis();

app.use("/product", productRoutes)

app.get("/", (req, res) => {
  return res.status(200).send("Products Microservice is running!");
});

const PORT = process.env.PORT || 8002;
app.listen(PORT, () => {
  console.log(`🚀 Products Microservice has started on port ${PORT}`);
});
