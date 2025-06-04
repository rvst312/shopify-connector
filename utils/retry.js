/**
 * Implementación de reintentos con backoff exponencial
 */
async function retry(fn, options = {}) {
  const {
    retries = 3,
    factor = 2,
    minTimeout = 1000,
    maxTimeout = 5000,
  } = options;

  let attempt = 0;
  let lastError;

  while (attempt < retries) {
    attempt++;
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;

      const timeout = Math.min(
        minTimeout * Math.pow(factor, attempt - 1),
        maxTimeout
      );

      await new Promise((resolve) => setTimeout(resolve, timeout));
    }
  }

  throw lastError;
}

module.exports = { retry };
