import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import promClient from "prom-client";
import express_prom_bundle from "express-prom-bundle";

import wishlistRoutes from "./wishlist/wishlist.routes";

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

const app = express();
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/wishlist', wishlistRoutes);

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get("/", (req, res) => {
  return res.status(200).send("Wishlist Microservice is running!");
});

const PORT = process.env.PORT || 8004;
app.listen(PORT, () => {
  console.log(`🚀 Wishlist Microservice has started on port ${PORT}`);
});
