const { storeUrl, apiVersion, accessToken } = require("../config/shopify");
const { logger } = require("../utils/logger");
const { retry } = require("../utils/retry");

// Configuración de reintentos
const RETRY_CONFIG = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 5000,
};

/**
 * Ajusta cantidades de inventario en Shopify
 * @param {Object} params
 * @param {Array} params.adjustments - Array de ajustes a realizar
 * @param {string} [params.reason] - Razón del ajuste (opcional)
 * @param {string} [params.referenceUri] - URI de referencia (opcional)
 * @returns {Promise<Object>} Resultado de la operación
 */
async function adjustShopifyInventory({
  adjustments,
  reason = "correction",
  referenceUri = null,
}) {
  const query = `
    mutation InventorySet($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup {
        createdAt
        reason
        referenceDocumentUri
        changes {
          name
          delta
        }
      }
      userErrors {
        field
        message
      }
    }
  }
  `;

  const variables = {
    input: {
      reason,
      name: "available",
      referenceDocumentUri:
        referenceUri || `app://inventory-sync/${new Date().toISOString()}`,
      ignoreCompareQuantity: true,
      quantities: adjustments.map((adj) => ({
        quantity: adj.delta,
        inventoryItemId: adj.inventoryItemId.startsWith("gid://")
          ? adj.inventoryItemId
          : `gid://shopify/InventoryItem/${adj.inventoryItemId}`,
        locationId: adj.locationId.startsWith("gid://")
          ? adj.locationId
          : `gid://shopify/Location/${adj.locationId}`,
      })),
    },
  };

  try {
    const response = await retry(
      async () => {
        const startTime = Date.now();
        const result = await makeShopifyRequest(query, variables);
        logger.debug(`Shopify API request took ${Date.now() - startTime}ms`, {
          adjustmentsCount: adjustments.length,
          firstSku: adjustments[0]?.sku,
        });
        return result;
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 10000,
        factor: 2,
        onRetry: (error, attempt) => {
          logger.warn(`Reintento ${attempt} para ajuste de inventario`, {
            firstSku: adjustments[0]?.sku,
            error: error.message,
            attempt,
          });
        },
      }
    );

    // Manejo de errores de GraphQL
    if (response.errors) {
      const errorDetails = {
        skus: adjustments.map((a) => a.sku),
        errors: response.errors,
        queryVariables: variables,
      };
      logger.error("Error en mutación GraphQL", errorDetails);
      return {
        success: false,
        errors: response.errors.map((e) => ({
          message: e.message,
          type: "GRAPHQL_ERROR",
        })),
        adjustmentsCount: adjustments.length,
      };
    }

    const result = response.data.inventorySetQuantities;

    // Manejo de userErrors
    if (result.userErrors && result.userErrors.length > 0) {
      logger.error("User errors en ajuste de inventario", {
        skus: adjustments.map((a) => a.sku),
        userErrors: result.userErrors,
        changesAttempted: variables.input.changes,
      });
      return {
        success: false,
        errors: result.userErrors.map((e) => ({
          message: `${e.field ? `${e.field}: ` : ""}${e.message}`,
          type: "USER_ERROR",
        })),
        adjustmentsCount: adjustments.length,
      };
    }

    // Éxito - registrar métricas
    const successfulChanges = result.inventoryAdjustmentGroup?.changes || [];
    logger.info("Ajuste de inventario completado", {
      adjustmentsCount: adjustments.length,
      successfulChanges: successfulChanges.length,
      firstSku: adjustments[0]?.sku,
      referenceUri: variables.input.referenceDocumentUri,
    });

    return {
      success: true,
      processedCount: successfulChanges.length,
      adjustmentGroup: result.inventoryAdjustmentGroup,
      adjustmentsCount: adjustments.length,
    };
  } catch (error) {
    logger.error("Error fatal en adjustShopifyInventory", {
      error: error.message,
      stack: error.stack,
      firstSku: adjustments[0]?.sku,
      adjustmentsCount: adjustments.length,
    });
    return {
      success: false,
      errors: [
        {
          message: error.message,
          type: "NETWORK_ERROR",
        },
      ],
      adjustmentsCount: adjustments.length,
    };
  }
}

/**
 * Función para hacer requests a Shopify con manejo de rate limiting
 */
async function makeShopifyRequest(query, variables) {
  const url = `https://${storeUrl}/admin/api/${apiVersion}/graphql.json`;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    // Manejo de rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || 2;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return makeShopifyRequest(query, variables);
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

module.exports = {
  adjustShopifyInventory,
  makeShopifyRequest,
};
