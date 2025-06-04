require("dotenv").config();

module.exports = {
  storeUrl: process.env.SHOPIFY_STORE_URL, // 'tu-tienda.myshopify.com'
  apiVersion: "2025-01", // Usa la versión más reciente
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  apiLimit: 250, // Límite máximo de productos por solicitud
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
};
