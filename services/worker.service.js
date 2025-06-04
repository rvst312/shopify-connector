const { processAllPendingJobs } = require("./queueProcessor.service");

class InventoryWorker {
  constructor() {
    this.isRunning = false;
    this.interval = null;
  }

  start(intervalMinutes = 5) {
    this.isRunning = true;
    this.run(); // Ejecutar inmediatamente
    this.interval = setInterval(() => this.run(), intervalMinutes * 60 * 1000);
  }

  async run() {
    if (!this.isRunning) return;

    try {
      logger.info("Iniciando procesamiento de cola de inventario");
      const result = await processAllPendingJobs();
      logger.info(`Procesamiento completado: ${result.totalProcessed} items`);
    } catch (error) {
      logger.error("Error en el worker de inventario:", error);
    }
  }

  stop() {
    this.isRunning = false;
    clearInterval(this.interval);
  }
}

module.exports = new InventoryWorker();
