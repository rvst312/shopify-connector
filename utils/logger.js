const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize, json } = format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  if (metadata && Object.keys(metadata).length > 0) {
    msg += ` - ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    colorize(),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/queue_processor.log" }),
  ],
});

// Para errores no capturados
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
});

module.exports = { logger };
