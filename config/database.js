require("dotenv").config();

const { Pool } = require("pg");

// Conexión a PostgreSQL
const pool = new Pool({
  user: process.env.PG_USER || "postgres",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "gosporting_stock_db",
  password: process.env.PG_PASSWORD || "postgres",
  port: process.env.PG_PORT || 5432,
  ssl: {
    rejectUnauthorized: false, // Solo para desarrollo/testing
    // Para producción, usa esto:
    // ca: fs.readFileSync('/path/to/server-ca.pem').toString(),
    // key: fs.readFileSync('/path/to/client-key.pem').toString(),
    // cert: fs.readFileSync('/path/to/client-cert.pem').toString()
  },
});

// Crear tabla si no existe (solo para desarrollo)
async function initializeDB() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Creación de tablas (sin cambios)
    await client.query(`
          CREATE TABLE IF NOT EXISTS gosporting_products (
            id SERIAL PRIMARY KEY,
            product_id VARCHAR(50) NOT NULL,
            erp_id VARCHAR(50) NOT NULL,
            store_id VARCHAR(50) NOT NULL,
            price NUMERIC(10,2),
            locations JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            sync_status VARCHAR(20) DEFAULT 'pending',
            CONSTRAINT product_store_unique UNIQUE (product_id, store_id)
          );
        `);

    await client.query(`
          CREATE TABLE IF NOT EXISTS inventory_sync_queue (
            id SERIAL PRIMARY KEY,
            product_id VARCHAR(50) NOT NULL,
            inventory_item_id VARCHAR(50), -- Nueva columna
            location_id VARCHAR(50) NOT NULL,
            quantity INTEGER NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            attempt_count INTEGER DEFAULT 0, -- Nueva columna
            next_attempt_at TIMESTAMP,
            error_message TEXT, -- Nueva columna
            created_at TIMESTAMP DEFAULT NOW(),
            last_attempt TIMESTAMP,
            processed_at TIMESTAMP -- Nueva columna
          );
        `);

    // Crear índices adicionales

    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_sync_queue_status_attempt 
          ON inventory_sync_queue(status, attempt_count)
          WHERE status = 'pending';
        `);

    await client.query(`
          CREATE TABLE IF NOT EXISTS shopify_products (
            id SERIAL PRIMARY KEY,
            shopify_id VARCHAR(50) NOT NULL,
            sku VARCHAR(50) NOT NULL,
            title TEXT NOT NULL,
            inventory_quantity INTEGER DEFAULT 0,
            price DECIMAL(10,2),
            status VARCHAR(20),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT shopify_product_unique UNIQUE (shopify_id, sku)
          );
        `);

    //agregando inventory item id a la tabla shopify products
    await client.query(`ALTER TABLE shopify_products
        ADD COLUMN IF NOT EXISTS inventory_item_id VARCHAR(50);`);

    await client.query(`ALTER TABLE shopify_products
        ADD COLUMN IF NOT EXISTS product_id VARCHAR(50);`);

    // 2. Índices corregidos (sintaxis universal)
    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_qubbos_product_id 
          ON gosporting_products(product_id);
        `);

    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_qubbos_sync_status 
          ON gosporting_products(sync_status);
        `);

    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_qubbos_store_id 
          ON gosporting_products(store_id);
        `);

    // 3. Índices para inventory_sync_queue
    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_sync_queue_product 
          ON inventory_sync_queue(product_id);
        `);

    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_sync_queue_status 
          ON inventory_sync_queue(status);
        `);

    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_sync_queue_composite 
          ON inventory_sync_queue(product_id, location_id);
        `);

    // 4. Índices condicionales como consultas separadas (opcional para PostgreSQL 12+)
    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_qubbos_pending 
          ON gosporting_products(sync_status) 
          WHERE sync_status = 'pending';
        `);

    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_sync_pending 
          ON inventory_sync_queue(status) 
          WHERE status = 'pending';
        `);
    // 5. indices para la tabla shopify_products
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_shopify_products_sku ON shopify_products(sku);`
    );
    await client.query(
      ` CREATE INDEX IF NOT EXISTS idx_shopify_products_status ON shopify_products(status);`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_shopify_products_inventory ON shopify_products(inventory_quantity) WHERE inventory_quantity > 0;`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_shopify_products_price ON shopify_products(price);`
    );

    await client.query(`
    CREATE TABLE IF NOT EXISTS shopify_locations (
      id SERIAL PRIMARY KEY,
      shopify_location_id VARCHAR(255) NOT NULL UNIQUE,
      location_name VARCHAR(255) NOT NULL,
      location_number VARCHAR(255),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_shopify_locations_location_id 
    ON shopify_locations(shopify_location_id);

    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_updated_at ON shopify_locations;
    
    CREATE TRIGGER trigger_update_updated_at
    BEFORE UPDATE ON shopify_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
  `);

    await client.query("COMMIT");
    console.log("✅ Base de datos e índices inicializados correctamente");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error al inicializar la base de datos:", err);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initializeDB,
};
