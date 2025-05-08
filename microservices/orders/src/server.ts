import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import promClient from "prom-client";
import express_prom_bundle from "express-prom-bundle";

import orderRoutes from "./order/order.routes";
import cartRoutes from "./cart/cart.routes";
import { initRedis } from "./db/redis";

const register = new promClient.Registry();

promClient.collectDefaultMetrics({
  register,
  prefix: 'orders_'
});

const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
});

const app = express();
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

initRedis();

app.use('/order', orderRoutes);
app.use('/cart', cartRoutes);

app.get("/", (req, res) => {
  return res.status(200).send("Orders Microservice is running!");
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`🚀 Orders Microservice has started on port ${PORT}`);
});
