// src/config/axios.ts
import axios from "axios";
import axiosRetry from "axios-retry";

// Attach retries
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) ||
    (err.response?.status ?? 0) >= 500,
});

// Intercept every retry attempt
axios.interceptors.response.use(undefined, (err) => {
  const config = err.config as any;
  // axios-retry writes `config['axios-retry']` with attempt count
  const retryCount = config?.["axios-retry"]?.retryCount ?? 0;
  if (retryCount > 0) {
    console.warn(`[axios-retry] retry #${retryCount} for ${config.url}`);
  }
  return Promise.reject(err);
});

export default axios;
