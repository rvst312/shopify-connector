const { pool } = require("../config/database");
// const { storeUrl, apiVersion, accessToken } = require("../config/shopify");
const { makeShopifyRequest } = require("./shopifyProducts.service");

/**
 * Exporta todos los productos de shopify_products a Shopify
 * y los activa en todas las sucursales con el stock correspondiente
 */
async function exportProductsToShopify() {
  const client = await pool.connect();
  try {
    // 1. Obtener todos los productos de la base de datos
    const { rows: products } = await client.query(`
      SELECT
            sp.sku,
            sp.title,
            sp.price,
            sp.inventory_item_id,
            json_agg(
                json_build_object(
                    'location_id', sl.shopify_location_id,
                    'quantity', isq.quantity
                )
            ) AS locations_data
        FROM
            pending_products_sync pps
        INNER JOIN
            inventory_sync_queue isq
            ON isq.product_id = pps.product_id
        INNER JOIN
            shopify_locations sl
            ON isq.location_id::INTEGER = sl.location_number::INTEGER
        INNER JOIN
            shopify_products sp
            ON pps.product_id = sp.sku
        GROUP BY
            sp.sku, sp.title, sp.price, sp.inventory_item_id;
    `);

    if (products.length === 0) {
      return { success: true, message: "No hay productos para exportar" };
    }

    // 2. Procesar cada producto
    const results = [];
    for (const product of products) {
      try {
        let result = await createShopifyProduct(product);
        results.push(result);
      } catch (error) {
        console.error(`Error procesando producto ${product.sku}:`, error);
        results.push({
          sku: product.sku,
          success: false,
          error: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
      }
    }

    return {
      success: true,
      total: products.length,
      processed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      details: results,
    };
  } catch (error) {
    console.error("Error en exportProductsToShopify:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Crea un nuevo producto en Shopify (versión corregida)
 */
async function createShopifyProduct(product) {
  console.log(product);

  // 1. Primero creamos el producto con la variante básica
  const createQuery = `mutation {
        productSet(input: {
            title: "${product.title}",
            descriptionHtml: "<p>Este es un producto sin opciones.</p>",
            productType: "Tipo de Producto",
            vendor: "Proveedor",
            productOptions:[],
            variants:[],
        }) {
            product {
            id
            title
            variants(first: 1) {
                edges {
                node {
                    id
                    sku
                    price
                    inventoryQuantity
                    inventoryItem {
                        id
                    }
                }
                }
            }
            }
            userErrors {
            field
            message
            }
          }
        }`;

  const createVariables = {};

  const createResponse = await makeShopifyRequest(createQuery, createVariables);
  console.log(createResponse);
  if (
    createResponse.errors ||
    createResponse.data.productSet.userErrors.length > 0
  ) {
    const errors =
      createResponse.errors || createResponse.data.productSet.userErrors;
    console.log(JSON.stringify(errors));
    throw new Error(errors.map((e) => e.message).join(", "));
  }

  const newProduct = createResponse.data.productSet.product;
  const variant = newProduct.variants.edges[0].node;
  const inventoryItemId = variant.inventoryItem.id.replace(
    "gid://shopify/InventoryItem/",
    ""
  );

  //actualizar la variante con sku precio
  const updateVariantQuery = `mutation UpdateProductVariants {
            productVariantsBulkUpdate(
                productId: "${newProduct.id}", 
                variants: [
                {
                    id: "${variant.id}", 
                    price: "${product.price}",
                    inventoryItem:{ sku: "${product.sku}", tracked:true }                    
                }
                ]
            ) {
                productVariants {
                id
                sku
                price
                }
                userErrors {
                field
                message
                }
            }
            }`;

  const createResponse2 = await makeShopifyRequest(updateVariantQuery, {});
  console.log("update variant", createResponse2);

  //activar las sucursales en la variante
  const activateLocationsQuery = `mutation inventoryBulkToggleActivation($inventoryItemId: ID!, $inventoryItemUpdates: [InventoryBulkToggleActivationInput!]!) {
            inventoryBulkToggleActivation(inventoryItemId: $inventoryItemId, inventoryItemUpdates: $inventoryItemUpdates) {
                inventoryItem {
                id
                }
                inventoryLevels {
                id
                quantities(names: ["available"]) {
                    name
                    quantity
                }
                location {
                    id
                }
                }
                userErrors {
                field
                message
                code
                }
            }
            }`;

  const aactivateLocsVariables = {
    inventoryItemId: variant.inventoryItem.id,
    inventoryItemUpdates: product.locations_data.map((ml) => ({
      activate: true,
      locationId: ml.location_id,
    })),
  };

  const createResponse4 = await makeShopifyRequest(
    activateLocationsQuery,
    aactivateLocsVariables
  );
  console.log("activate stock locations", JSON.stringify(createResponse4));

  //actualizar el stock
  const adjustStockQuery = `mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
                            inventoryAdjustQuantities(input: $input) {
                                userErrors {
                                field
                                message
                                }
                                inventoryAdjustmentGroup {
                                createdAt
                                reason
                                referenceDocumentUri
                                changes {
                                    name
                                    delta
                                }
                                }
                            }
                            }`;

  const adjustQuantVariables = {
    input: {
      reason: "correction",
      name: "available",
      changes: product.locations_data.map((ml) => ({
        delta: ml.quantity,
        inventoryItemId: `${variant.inventoryItem.id}`,
        locationId: ml.location_id,
      })),
    },
  };

  const stockAdjustResults = await makeShopifyRequest(
    adjustStockQuery,
    adjustQuantVariables
  );
  console.log("adjust stock", JSON.stringify(stockAdjustResults));

  // 2. Actualizar la base de datos con los IDs de Shopify
  await pool.query(
    `
      UPDATE shopify_products 
      SET 
        shopify_id = $1,
        inventory_item_id = $2,
        updated_at = NOW()
      WHERE sku = $3
    `,
    [
      variant.id.replace("gid://shopify/ProductVariant/", ""),
      inventoryItemId,
      product.sku,
    ]
  );

  return {
    sku: product.sku,
    success: true,
    action: "created",
    shopify_id: variant.id,
    inventory_item_id: variant.inventoryItem.id,
    stockUpdates: stockAdjustResults,
  };
}

module.exports = {
  exportProductsToShopify,
};
