import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import promClient from "prom-client";
import express_prom_bundle from "express-prom-bundle";

import userRoutes from './user/user.routes';

const register = new promClient.Registry();

promClient.collectDefaultMetrics({
  register,
  prefix: 'auth_' // Use a prefix specific to this service
});

const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
})

const app = express();
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use("/user", userRoutes);

app.get("/", (req, res) => {
  return res.status(200).send("Authentication Microservice is running!");
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Authentication Microservice has started on port ${PORT}`);
});
