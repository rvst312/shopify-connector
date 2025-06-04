module.exports = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === "true" ? {} : undefined,
  connectTimeout: 30000,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 1000, 5000);
    return delay;
  },
};
