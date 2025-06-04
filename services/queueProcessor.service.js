const { addDownloadJobs, cleanupOldFiles } = require("../config/queue");
const { downloadFile } = require("./tradeinDownService");

const stores = [
  { value: 2, name: "Snowinn" },
  // { value: 3, name: "Trekkinn" },
  // { value: 4, name: "Bikeinn" },
  // { value: 5, name: "Smashinn" },
  // { value: 10, name: "Runnerinn" },

  //   { value: 1, name: "Diveinn" },
  // { value: 6, name: "Swiminn" },
  // { value: 7, name: "Waveinn" },
  // { value: 8, name: "Motardinn" },
  // { value: 11, name: "Goalinn" },
  // { value: 12, name: "Dressinn" },
  // { value: 13, name: "Traininn" },
  // { value: 14, name: "Xtremeinn" },
  // { value: 15, name: "Kidinn" },
  // { value: 16, name: "Techinn" },
  // { value: 17, name: "Bricoinn" },
  // { value: 18, name: "Sports" },
];

// Agregar trabajos a la cola
async function startDownloads() {
  try {
    // const n = await downloadFile({ value: 2, name: "Snowinn" }, 1);
    // return n;

    console.log("Iniciando descargas...");
    const inicio = Date.now();

    const jobs = await addDownloadJobs(stores);

    console.log(`${jobs.length} trabajos agregados a la cola`);

    const duracion = Date.now() - inicio;
    console.log(`Descargas completadas en ${duracion} ms`);

    // Limpiar archivos antiguos
    // cleanupOldFiles();
  } catch (error) {
    console.error("Error al iniciar descargas:", error);
  }
}

module.exports = { startDownloads };
