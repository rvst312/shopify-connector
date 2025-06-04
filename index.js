require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { db, shopify, queues, port } = require("./config");
const {
  fetchAllShopifyProducts,
  saveShopifyProductsToDB,
  adjustShopifyInventory,
} = require("./services/shopifyProducts.service");
const {
  getShopifyLocationsGraphQL,
  getValidLocationNumbers,
} = require("./services/shopifyLocationsServices");
const { exportProductsToShopify } = require("./services/shopifyExport.service");
const {
  processInventorySync,
  startDownloads,
} = require("./services/queueProcessor.service");

const { InventoryWorker } = require("./services/worker.service");
const {
  downloadCSVFiles,
  downloadFile,
} = require("./services/tradeinDownService");
const { processAllCSVs } = require("./services/csvService");
// Configuración básica
const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Panel de administración de colas
app.use("/admin/queues", queues.bullBoardRouter);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Inicialización asíncrona
async function start() {
  try {
    app.listen(port, () => {
      console.log(
        `🛒 Conector GOSporting-Shopify funcionando en http://localhost:${port}`
      );
      console.log(`📊 Panel de colas: http://localhost:${port}/admin/queues`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar la aplicación:", error);
    process.exit(1);
  }
}

//------------------------------------------------------
start();

// comenzar las descargas de ficheros
startDownloads();

// // procesar los ficheros
// processAllCSVs("./csv")
//   .then(() => console.log("🎉 Todos los archivos procesados exitosamente"))
//   .catch((err) => console.error("Error general:", err));
