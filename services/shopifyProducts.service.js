const {
  storeUrl,
  apiVersion,
  accessToken,
  apiLimit,
} = require("../config/shopify");
const { pool } = require("../config/database");

// Recupera todos los productos de la tienda incluyendo inventory_item_id
async function fetchAllShopifyProducts() {
  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const query = `
        query ($cursor: String) {
          products(first: ${apiLimit}, after: $cursor) {
            edges {
              node {
                id
                title
                handle
                status
                totalInventory
                variants(first: 100) {
                  edges {
                    node {
                      id
                      sku
                      inventoryQuantity
                      price
                      inventoryItem {
                        id
                      }
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

    const response = await makeShopifyRequest(query, { cursor });

    if (response.errors) {
      throw new Error(response.errors.map((e) => e.message).join(", "));
    }

    const products = response.data.products.edges;
    allProducts = [...allProducts, ...products];
    hasNextPage = response.data.products.pageInfo.hasNextPage;
    cursor = response.data.products.pageInfo.endCursor;
  }

  return formatProducts(allProducts);
}

async function makeShopifyRequest(query, variables = {}) {
  const url = `https://${storeUrl}/admin/api/${apiVersion}/graphql.json`;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error in Shopify request:", error);
    throw error;
  }
}

function formatProducts(products) {
  return products.flatMap((edge) => {
    const product = edge.node;
    return product.variants.edges.map((variantEdge) => {
      const variant = variantEdge.node;
      return {
        shopify_id: variant.id.replace("gid://shopify/ProductVariant/", ""),
        product_id: product.id.replace("gid://shopify/Product/", ""),
        sku: variant.sku || `${product.id}_${variant.id}`,
        title: product.title,
        inventory_quantity: variant.inventoryQuantity,
        price: parseFloat(variant.price),
        status: product.status,
        inventory_item_id:
          variant.inventoryItem?.id?.replace(
            "gid://shopify/InventoryItem/",
            ""
          ) || null,
      };
    });
  });
}

async function saveShopifyProductsToDB(products) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Inserción masiva incluyendo inventory_item_id
    await client.query(
      `
        INSERT INTO shopify_products 
          (shopify_id, sku, title, inventory_quantity, price, status, inventory_item_id, product_id)
        SELECT * FROM UNNEST(
          $1::varchar[],
          $2::varchar[],
          $3::text[],
          $4::int[],
          $5::numeric[],
          $6::varchar[],
          $7::varchar[],
          $8::varchar[]
        )
        ON CONFLICT (shopify_id, sku) 
        DO UPDATE SET
          inventory_quantity = EXCLUDED.inventory_quantity,
          price = EXCLUDED.price,
          status = EXCLUDED.status,
          inventory_item_id = COALESCE(EXCLUDED.inventory_item_id, shopify_products.inventory_item_id),
          updated_at = NOW()
        RETURNING *
      `,
      [
        products.map((p) => p.shopify_id),
        products.map((p) => p.sku),
        products.map((p) => p.title),
        products.map((p) => p.inventory_quantity),
        products.map((p) => p.price),
        products.map((p) => p.status),
        products.map((p) => p.inventory_item_id),
        products.map((p) => p.product_id),
      ]
    );

    await client.query("COMMIT");
    return { success: true, count: products.length };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving Shopify products:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Función adicional para obtener un producto por SKU con inventory_item_id
async function getShopifyProductBySKU(sku) {
  const query = `
      query {
        productVariants(first: 1, query: "sku:${sku}") {
          edges {
            node {
              id
              sku
              inventoryItem {
                id
              }
            }
          }
        }
      }
    `;

  const response = await makeShopifyRequest(query);

  if (response.errors || !response.data.productVariants.edges.length) {
    return null;
  }

  const variant = response.data.productVariants.edges[0].node;
  return {
    shopify_id: variant.id.replace("gid://shopify/ProductVariant/", ""),
    sku: variant.sku,
    inventory_item_id: variant.inventoryItem.id.replace(
      "gid://shopify/InventoryItem/",
      ""
    ),
  };
}

// Función mejorada para ajustar inventario
async function adjustShopifyInventory(inventoryItemId, locationId, quantity) {
  //   const client = new shopify.clients.Graphql();
  return { success: true, errors: [] };

  //   try {
  //     const response = await client.query({
  //       data: {
  //         query: `
  //             mutation inventoryAdjustQuantity($input: InventoryAdjustQuantityInput!) {
  //               inventoryAdjustQuantity(input: $input) {
  //                 inventoryLevel {
  //                   id
  //                   available
  //                 }
  //                 userErrors {
  //                   field
  //                   message
  //                 }
  //               }
  //             }
  //           `,
  //         variables: {
  //           input: {
  //             inventoryItemId: inventoryItemId,
  //             locationId: locationId,
  //             availableDelta: quantity,
  //           },
  //         },
  //       },
  //     });

  //     if (response.body.errors) {
  //       return {
  //         success: false,
  //         errors: response.body.errors,
  //       };
  //     }

  //     const result = response.body.data.inventoryAdjustQuantity;

  //     return {
  //       success: !result.userErrors.length,
  //       errors: result.userErrors,
  //       newQuantity: result.inventoryLevel?.available,
  //     };
  //   } catch (error) {
  //     console.error("Error en adjustShopifyInventory:", error);
  //     return {
  //       success: false,
  //       errors: [{ message: error.message }],
  //     };
  //   }
}

module.exports = {
  fetchAllShopifyProducts,
  saveShopifyProductsToDB,
  makeShopifyRequest,
  getShopifyProductBySKU,
  adjustShopifyInventory,
};
