const CSVProcessor = require("../utils/csvProcessor");
const path = require("path");
const fs = require("fs");
const {
  storeUrl,
  apiKey,
  apiSecret,
  accessToken,
} = require("../config/shopify");
const { stockAgileToken, stockAgileURL } = require("../config/stockAgile");

// Configuración
const config = {
  shopify: {
    shopName: storeUrl,
    // apiKey: apiKey,
    // password: apiSecret,
    accessToken: accessToken,
  },
  stockAgile: {
    baseUrl: stockAgileURL,
    apiKey: stockAgileToken,
  },
};

// Procesar todos los archivos CSV en un directorio
async function processAllCSVs(directory) {
  const processor = new CSVProcessor(config.shopify, config.stockAgile);
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".csv"));

  for (const file of files) {
    const filePath = path.join(directory, file);
    console.log(`🔍 Procesando archivo: ${file}`);

    try {
      const processedCount = await processor.processCSV(filePath);
      console.log(`✅ ${processedCount} productos procesados de ${file}`);

      // Opcional: Mover el archivo a un directorio de procesados
      //   const processedDir = path.join(directory, "processed");
      //   if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir);
      //   fs.renameSync(filePath, path.join(processedDir, file));
    } catch (error) {
      console.error(`❌ Error procesando ${file}:`, error);
    }
  }
}

module.exports = { processAllCSVs };
