const { pool } = require("../config/database");
const { makeShopifyRequest } = require("./shopifyProducts.service");

async function getShopifyLocationsGraphQL() {
  console.log(`📌 Obteniendo sucursales de Shopify`);
  try {
    const query = `
        query {
          locations(first: 250) {
            edges {
              node {
                id
                name
                isActive
              }
            }
          }
        }
      `;

    const response = await makeShopifyRequest(query, {});
    const Locations = response?.data?.locations?.edges || [];
    // salvando las sucursales
    await saveShopifyLocations(Locations);

    if (response.errors) {
      throw new Error(response.errors.map((e) => e.message).join(", "));
    }
  } catch (error) {
    console.error(
      "Error fetching Shopify locations with GraphQL:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch Shopify locations");
  }
}

/**
 * Guarda las ubicaciones de Shopify en la base de datos
 * @param {Array} locations - Array de ubicaciones de Shopify
 * @returns {Promise<Array>} - Resultados de la inserción
 */
async function saveShopifyLocations(locations) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertQuery = `
        INSERT INTO shopify_locations 
          (shopify_location_id, location_name, location_number, is_active)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (shopify_location_id) 
        DO UPDATE SET
          location_name = EXCLUDED.location_name,
          location_number = EXCLUDED.location_number,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
        RETURNING *;
      `;

    const results = [];

    for (const { node } of locations) {
      const locationNumber = extractLocationNumber(node.name);

      const res = await client.query(insertQuery, [
        node.id,
        node.name,
        locationNumber,
        node.isActive,
      ]);

      results.push(res.rows[0]);
    }

    await client.query("COMMIT");
    return results;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving Shopify locations:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Extrae el número del nombre de la ubicación (ej: "Alcobendas 03" → 3)
 * @param {string} locationName - Nombre de la ubicación
 * @returns {number|null} - Número extraído o null si no hay número
 */
function extractLocationNumber(locationName) {
  const matches = locationName.match(/\d+/);
  return matches ? parseInt(matches[0], 10) : null;
}

async function getValidLocationNumbers() {
  const { rows } = await pool.query(
    "SELECT location_number FROM shopify_locations WHERE is_active = true"
  );
  return rows.map((row) => row.location_number);
}

module.exports = {
  getShopifyLocationsGraphQL,
  getValidLocationNumbers,
};
