require("dotenv").config();
const Queue = require("bull");
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { redisConfig } = require("./redisConfig"); // Nueva configuración Redis
const fs = require("fs");
const path = require("path");
const { downloadFile } = require("../services/tradeinDownService");

// Configuración de la cola
const downloadQueue = new Queue("csv-downloads", {
  redis: redisConfig,
  limiter: {
    max: 3, // Máximo de trabajos concurrentes
    duration: 1000,
  },
});

// Procesador de trabajos
downloadQueue.process(async (job) => {
  const { store, priority } = job.data;

  let lastProgress = 0;

  // Función para reportar progreso
  const reportProgress = (percentage) => {
    if (Math.floor(percentage) > Math.floor(lastProgress)) {
      job.progress(percentage);
      lastProgress = percentage;
    }
  };

  // syncQueue.add()
  const downFile = await downloadFile(store, job.id, reportProgress);

  return downFile;
});

// Eventos de la cola
downloadQueue.on("completed", (job, result) => {
  console.log(`Job ${job.id} completado: ${result.storeName}`);
});

downloadQueue.on("failed", (job, err) => {
  console.error(`Job ${job.id} falló:`, err.message);
});

downloadQueue.on("progress", (job, progress) => {
  console.log(`Job ${job.id} (${job.data.store.name}) progreso: ${progress}%`);
});

// Función para agregar trabajos a la cola
async function addDownloadJobs(stores) {
  const jobs = stores.map((store) => ({
    store,
    priority: 1, // Prioridad por defecto
  }));

  const addedJobs = await Promise.all(
    jobs.map((jobData) =>
      downloadQueue.add(jobData, {
        attempts: 3, // Reintentos
        backoff: 5000, // Esperar 5 segundos entre reintentos
        removeOnComplete: true, // Eliminar trabajos completados
        removeOnFail: true, // Eliminar trabajos fallidos
      })
    )
  );

  return addedJobs;
}

// Función para limpiar archivos CSV antiguos
function cleanupOldFiles(days = 0.25) {
  const csvDir = "./csv";
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  fs.readdirSync(csvDir).forEach((file) => {
    const filePath = path.join(csvDir, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && stats.mtimeMs < cutoff && file.endsWith(".csv")) {
      fs.unlinkSync(filePath);
      console.log(`Eliminado archivo antiguo: ${file}`);
    }
  });
}

// --------- seccion para la sincronizacion de productos ---------------

// Configuración optimizada de la cola
const syncQueue = new Queue("syncronize-inventory", {
  redis: redisConfig,
  settings: {
    lockDuration: 300000, // 5 minutos para procesar un job
    stalledInterval: 30000, // Verificar jobs estancados cada 30 segundos
    maxStalledCount: 2, // Reintentar jobs estancados máximo 2 veces
    retryProcessDelay: 2000, // Delay entre reintentos de procesamiento
    backoffStrategies: {
      exponential: (attemptsMade) => Math.min(attemptsMade * 5000, 60000), // Backoff exponencial hasta 1 minuto
    },
  },
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential" },
    removeOnComplete: 100, // Mantener los últimos 100 jobs completados
    removeOnFail: 500, // Mantener los últimos 500 jobs fallidos
    timeout: 120000, // 2 minutos de timeout por job
  },
});

syncQueue.process(async (job) => {
  const { product, priority } = job.data;

  // return await downloadFile(store, job.id, reportProgress);
});

// Función para agregar trabajos a la cola
// continuar
async function addProducts2SyncronizeJobs(products) {
  const jobs = products.map((prod) => ({
    product: prod,
    priority: 1, // Prioridad por defecto
  }));

  const addedJobs = await Promise.all(
    jobs.map((jobData) =>
      syncQueue.add(jobData, {
        attempts: 3, // Reintentos
        backoff: 5000, // Esperar 5 segundos entre reintentos
        removeOnComplete: true, // Eliminar trabajos completados
        removeOnFail: false, // Eliminar trabajos fallidos
      })
    )
  );

  return addedJobs;
}

// Eventos de la cola
syncQueue.on("completed", (job, result) => {
  console.log(`Sync Job ${job.id} completado: ${result.productSku}`);
});

syncQueue.on("failed", (job, err) => {
  console.error(`Sync Job ${job.id} falló:`, err.message);
});

// Configuración del dashboard de monitoreo
const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [/*new BullAdapter(syncQueue),*/ new BullAdapter(downloadQueue)],
  serverAdapter,
  options: {
    uiConfig: {
      boardTitle: "Monitor de Sincronización GO-SPORTING-GOODS",
      refreshInterval: 5000,
    },
  },
});
serverAdapter.setBasePath("/admin/queues");

// Limpieza programada de jobs antiguos
setInterval(async () => {
  await downloadQueue.clean(10000, "completed");
  await downloadQueue.clean(10000, "failed");
}, 3600000); // Cada hora

module.exports = {
  // syncQueue,
  bullBoardRouter: serverAdapter.getRouter(),
  downloadQueue,
  addDownloadJobs,
  cleanupOldFiles,
};
