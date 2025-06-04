const { pool, initializeDB, refreshMaterializedView } = require("./database");
const { shopify, getShopifyClient } = require("./shopify");
const { syncQueue, shopifySyncQueue, bullBoardRouter } = require("./queue");

module.exports = {
  // Configuraciones
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || "development",

  // Instancias
  db: {
    pool,
    initializeDB,
    refreshMaterializedView,
  },
  shopify: {
    instance: shopify,
    getClient: getShopifyClient,
  },
  queues: {
    syncQueue,
    shopifySyncQueue,
    bullBoardRouter,
  },
};
