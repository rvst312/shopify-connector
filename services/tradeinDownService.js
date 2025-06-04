const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");

// Configuración
const CSV_DIR = "./csv";
const DEFAULT_HEADERS = {
  Accept: "*/*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "es-US,es-419;q=0.9,es;q=0.8,en;q=0.7",
  Referer: "https://b2b.tradeinn.com/bikeinn",
  "Sec-Ch-Ua": `"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133")`,
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": `"Windows"`,
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  Cookie:
    "ip=143.105.23.253; id_cesta=1302744946; marge_c=23; id_pais=180; idioma=spa; ga_uid_ras=23760514; cidb2=%24argon2id%24v%3D19%24m%3D65536%2Ct%3D4%2Cp%3D1%24a20vcGpUbmpTZDJ1OW1XRg%24cub3Tw77gcl2Gpuu1Wj9tiv%2FYv%2F29jzSzGy3n5zaExU; mail_cliente=m.a@relocationibiza.com; user_name=Miguel; id_tienda=4; num_items=0",
};

// :authority
// b2b.tradeinn.com
// :method
// GET
// :path
// /?action=export&id_tienda=2
// :scheme
// https
// accept
// */*
// accept-encoding
// gzip, deflate, br, zstd
// accept-language
// es-ES,es;q=0.9
// cookie
// ip=143.105.23.253; id_cesta=1302744946; marge_c=23; id_pais=180; idioma=spa; ga_uid_ras=23760514; cidb2=%24argon2id%24v%3D19%24m%3D65536%2Ct%3D4%2Cp%3D1%24a20vcGpUbmpTZDJ1OW1XRg%24cub3Tw77gcl2Gpuu1Wj9tiv%2FYv%2F29jzSzGy3n5zaExU; mail_cliente=m.a@relocationibiza.com; user_name=Miguel; id_tienda=4; num_items=0
// priority
// u=1, i
// referer
// https://b2b.tradeinn.com/bikeinn
// sec-ch-ua
// "Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"
// sec-ch-ua-mobile
// ?0
// sec-ch-ua-platform
// "Windows"
// sec-fetch-dest
// empty
// sec-fetch-mode
// cors
// sec-fetch-site
// same-origin
// user-agent
// Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36

// Asegurar que el directorio existe
if (!fs.existsSync(CSV_DIR)) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
}

async function downloadFile(
  { value: id_tienda, name: storeName },
  jobId = null,
  progressCallback = null
) {
  const jobIdentifier = jobId ? `[Job ${jobId}]` : "";
  const tempFile = path.join(CSV_DIR, `${id_tienda}_${uuidv4()}.tmp`);
  const outputFile = path.join(CSV_DIR, `${id_tienda}.csv`);

  try {
    console.time(`Download Time: ${storeName}`);

    console.log(
      `${jobIdentifier} Iniciando descarga de ${storeName} (ID: ${id_tienda})`
    );

    const url = `https://b2b.tradeinn.com/?action=export&id_tienda=${id_tienda}`;

    const response = await fetch(url, {
      method: "GET",
      headers: DEFAULT_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fileStream = fs.createWriteStream(tempFile);
    const reader = response.body;

    await new Promise((resolve, reject) => {
      reader.on("data", (chunk) => {
        fileStream.write(chunk);
      });

      reader.on("end", () => {
        fileStream.end();
        resolve();
      });

      reader.on("error", (err) => {
        fileStream.destroy();
        reject(err);
      });
    });

    // Renombrar el archivo temporal al nombre final
    fs.renameSync(tempFile, outputFile);
    console.log(`${jobIdentifier} ✅ Descarga completada: ${outputFile}`);

    console.timeEnd(`Download Time: ${storeName}`);

    return {
      success: true,
      storeName,
      id_tienda,
      filePath: outputFile,
      // size: downloadedSize,
    };
  } catch (error) {
    // Eliminar archivo temporal en caso de error
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    console.error(`${jobIdentifier} ❌ Error en ${storeName}:`, error.message);
    return {
      success: false,
      storeName,
      id_tienda,
      error: error.message,
    };
  }
}

module.exports = {
  downloadFile,
};

// const fs = require("fs");
// const fetch = require("node-fetch"); // Instalar con: npm install node-fetch@2

// const stores = [
//   { value: 2, name: "Snowinn" },
//   // { value: 3, name: "Trekkinn" },
//   // { value: 4, name: "Bikeinn" },
//   // { value: 5, name: "Smashinn" },
//   // { value: 10, name: "Runnerinn" },

//   //   { value: 1, name: "Diveinn" },
//   // { value: 6, name: "Swiminn" },
//   // { value: 7, name: "Waveinn" },
//   // { value: 8, name: "Motardinn" },
//   // { value: 11, name: "Goalinn" },
//   // { value: 12, name: "Dressinn" },
//   // { value: 13, name: "Traininn" },
//   // { value: 14, name: "Xtremeinn" },
//   // { value: 15, name: "Kidinn" },
//   // { value: 16, name: "Techinn" },
//   // { value: 17, name: "Bricoinn" },
//   // { value: 18, name: "Sports" },
// ];

// async function downloadFile({ value: id_tienda, name: storeName }) {
//   try {
//     const url = `https://b2b.tradeinn.com/?action=export&id_tienda=${id_tienda}`;
//     const outputFile = `./csv/${id_tienda}.csv`;

//     console.log(`Iniciando descarga...${storeName}`);

//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         Accept: "*/*",
//         "Accept-Encoding": "gzip, deflate, br, zstd",
//         "Accept-Language": "es-US,es-419;q=0.9,es;q=0.8,en;q=0.7",
//         Referer: "https://b2b.tradeinn.com/bikeinn",
//         "Sec-Ch-Ua": `"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133")`,
//         "Sec-Ch-Ua-Mobile": "?0",
//         "Sec-Ch-Ua-Platform": `"Windows"`,
//         "Sec-Fetch-Dest": "empty",
//         "Sec-Fetch-Mode": "cors",
//         "Sec-Fetch-Site": "same-origin",
//         "User-Agent":
//           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
//         Cookie:
//           "ip=94.140.11.194; id_cesta=1261018460; marge_c=23; id_pais=180; idioma=spa; ga_uid_ras=23760514; cidb2=%24argon2id%24v%3D19%24m%3D65536%2Ct%3D4%2Cp%3D1%24bnUvZ1dBako3RGVKVmVVQg%24Cj0m%2BJMxd9bbPUcBEzdJn9zVD7d3ax%2BEDXY%2FhS9yU9k; mail_cliente=m.a@relocationibiza.com; user_name=Miguel; id_tienda=4; num_items=0", // Si es necesario autenticarse
//       },
//     });

//     if (!response.ok)
//       throw new Error(`Error en la solicitud: ${response.status}`);

//     const totalSize = response.headers.get("content-length"); // Tamaño total del archivo
//     let downloadedSize = 0;

//     const fileStream = fs.createWriteStream(outputFile);
//     const reader = response.body;

//     return await new Promise((resolve, reject) => {
//       reader.on("data", (chunk) => {
//         downloadedSize += chunk.length;
//         fileStream.write(chunk); // Escribir al archivo

//         if (totalSize) {
//           const percentage = ((downloadedSize / totalSize) * 100).toFixed(2);
//           console.log(`Descargando... ${percentage}%`);
//         } else {
//           console.log(`Descargados ${downloadedSize} bytes...`);
//         }
//       });

//       reader.on("end", () => {
//         fileStream.end(); // Cerrar el stream
//         console.log(`✅ Descarga completada: ${outputFile}`);
//         resolve();
//       });

//       reader.on("error", (err) => {
//         console.error("❌ Error en la descarga:", err);
//         reject(err);
//       });
//     });
//   } catch (error) {
//     console.error("❌ Error general:", error);
//   }
// }

// const downloadCSVFiles = async () => {
//   // Ejecutar la función
//   const result = [];
//   for (const store of stores) {
//     const res = await downloadFile(store);
//     result.push(res);
//     console.log(`Descargado: ${store.name}`);
//   }

//   return result;
// };

// module.exports = {
//   downloadCSVFiles,
// };
