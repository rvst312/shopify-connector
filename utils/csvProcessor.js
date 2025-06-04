const csv = require("csv-parser");
const fs = require("fs");
const Shopify = require("shopify-api-node"); // npm install shopify-api-node
const axios = require("axios"); // Para Stock Agile API
const {
  transformProductToStockAgile,
} = require("../services/stockAgileTransform.service.js");

class CSVProcessor {
  constructor(shopifyConfig, stockAgileConfig) {
    this.shopify = new Shopify(shopifyConfig);
    this.stockAgileConfig = stockAgileConfig;
    this.processedProducts = new Map();
    this.stockData = {};
  }

  async processCSV(filePath) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ separator: ";" }))
        .on("data", (row) => this.processRow(row))
        .on("end", async () => {
          try {
            await this.syncProcessedProducts();
            resolve(this.processedProducts.size);
          } catch (error) {
            reject(error);
          }
        })
        .on("error", reject);
    });
  }

  processRow(row) {
    // Normalizar datos
    const productData = this.normalizeProductData(row);
    const variantData = this.normalizeVariantData(row);
    this.stockData = this.normalizeStockData(row);

    // Agrupar variantes por producto
    if (!this.processedProducts.has(productData.sku)) {
      this.processedProducts.set(productData.sku, {
        ...productData,
        variants: [variantData],
      });
    } else {
      this.processedProducts.get(productData.sku).variants.push(variantData);
    }
  }

  normalizeProductData(row) {
    return {
      sku: row.item_group_id || row.id,
      title: row.title,
      description: this.cleanDescription(row.description),
      vendor: row.brand,
      product_type: row.category,
      tags: [row.subcategory],
      google_product_category: row.google_product_category,
      images: this.processImages(row),
      status: "active",
    };
  }

  normalizeVariantData(row) {
    return {
      sku: row.id,
      price: row.price,
      compare_at_price: this.calculateComparePrice(row.price),
      barcode: row.gtin || row.mpn,
      weight: row.shipping_weight ? parseFloat(row.shipping_weight) : 0,
      weight_unit: "kg",
      inventory_quantity: parseInt(row.quantity, 10),
      inventory_management: "shopify",
      option1: row.color || "Default",
      option2: row.size_eu || "One Size",
      requires_shipping: true,
      taxable: true,
      stock_warehouse: row.stock_warehouse,
      date_delivery: row.date_delivery,
    };
  }

  normalizeStockData(row) {
    return {
      identifier_type: "sku",
      identifier: row.id,
      quantity: parseInt(row.quantity),
      warehouse_id: 12569,
    };
  }

  cleanDescription(htmlDescription) {
    // Eliminar etiquetas HTML y limpiar espacios
    return htmlDescription
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?[^>]+(>|$)/g, "")
      .trim();
  }

  processImages(row) {
    const images = [];
    if (row.image_link) {
      images.push({ src: row.image_link });
    }

    if (row.images_links) {
      const additionalImages = row.images_links.split(",");
      additionalImages.forEach((img) => images.push({ src: img.trim() }));
    }

    return images;
  }

  calculateComparePrice(price) {
    const basePrice = parseFloat(price);
    return (basePrice * 1.2).toFixed(2); // 20% más como precio de comparación
  }

  async syncProcessedProducts() {
    for (const [sku, product] of this.processedProducts) {
      console.log(sku);
      // if (sku == "140458743")
      try {
        // console.log("📑 Product", JSON.stringify(product));
        // 1. Sincronizar con Shopify
        // await this.syncWithShopify(product);

        const transfProd = transformProductToStockAgile(product);
        // console.log("📑 Product Transf StockAgile", JSON.stringify(transfProd));
        // 2. Sincronizar stock con Stock Agile
        const syncroResult = await this.syncStockWithAgile(transfProd);

        const {
          productResponse: { errors: errProd, success: respProd },
          stockResponse: { errors: errStock, success: respStock },
        } = syncroResult;

        console.log(JSON.stringify(syncroResult));

        console.log(`✅ Producto ${sku} sincronizado correctamente`);
      } catch (error) {
        console.error(`❌ Error sincronizando ${sku}:`, error.message);
      }
    }
  }

  //bloque para sincronizacion en shopify
  async syncWithShopify(product) {
    // Verificar si el producto ya existe
    const existingProducts = await this.shopify.product.list({
      fields: "id,variants",
      sku: product.sku,
    });

    if (existingProducts.length > 0) {
      // Actualizar producto existente
      const shopifyProduct = existingProducts[0];
      console.log("Existe", shopifyProduct);
      await this.updateShopifyProduct(shopifyProduct.id, product);
    } else {
      // Crear nuevo producto
      await this.createShopifyProduct(product);
      console.log("No Existe");
    }
  }

  async createShopifyProduct(product) {
    const options = {
      title: product.title,
      body_html: product.description,
      vendor: product.vendor,
      product_type: product.product_type,
      tags: product.tags.join(","),
      variants: product.variants.map((v) => ({
        ...v,
        inventory_quantity: v.inventory_quantity,
        inventory_management: "shopify",
      })),
      images: product.images,
    };

    return this.shopify.product.create(options);
  }

  async updateShopifyProduct(productId, product) {
    const options = {
      id: productId,
      title: product.title,
      body_html: product.description,
      vendor: product.vendor,
      product_type: product.product_type,
      tags: product.tags.join(","),
      images: product.images,
    };

    // Actualizar producto
    await this.shopify.product.update(productId, options);

    // Actualizar variantes
    await this.updateShopifyVariants(productId, product.variants);
  }

  async updateShopifyVariants(productId, variants) {
    const existingVariants = await this.shopify.productVariant.list(productId);

    for (const variant of variants) {
      const existingVariant = existingVariants.find(
        (v) => v.sku === variant.sku
      );

      if (existingVariant) {
        // Actualizar variante existente
        await this.shopify.productVariant.update(existingVariant.id, {
          price: variant.price,
          compare_at_price: variant.compare_at_price,
          inventory_quantity: variant.inventory_quantity,
          option1: variant.option1,
          option2: variant.option2,
        });
      } else {
        // Añadir nueva variante
        await this.shopify.productVariant.create(productId, variant);
      }
    }
  }

  //bloque para la sincronizacion con stock agile
  async syncStockWithAgile(product) {
    const responseProduct = await fetch(
      `${this.stockAgileConfig.baseUrl}/public/api/v2/products`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${this.stockAgileConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(product),
      }
    );
    console.log(responseProduct.status);
    const respJson = await responseProduct.json();
    const resultProduct =
      responseProduct.status === 400
        ? { errors: respJson }
        : { errors: [], success: respJson };
    // console.log("Product Create/Update", result);

    const responseStock = await fetch(
      `${this.stockAgileConfig.baseUrl}/public/api/v2/stock`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${this.stockAgileConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.stockData),
      }
    );
    const resultStock = await responseStock.json();
    console.log("Stock Create/Update", resultStock);

    return { productResponse: resultProduct, stockResponse: resultStock };
  }
}

module.exports = CSVProcessor;
