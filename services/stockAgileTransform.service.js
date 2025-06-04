const transformProductToStockAgile = (shopifyProduct) => {
  // Extraer la primera imagen como cover_url
  const coverUrl = shopifyProduct.images[0]?.src.split("||")[0] || "";

  // Procesar imágenes
  const images = shopifyProduct.images.flatMap((img) => {
    const urls = img.src.split("||");
    return urls.map((url, index) => ({
      url: url,
      position: null, // index + 1,
    }));
  });

  const uniqueImages = [...new Set(images.map(JSON.stringify))].map(JSON.parse);

  // Procesar variantes
  const productVariants = shopifyProduct.variants.map((variant) => ({
    identifier_type: "sku",
    identifier: variant.sku,
    sku: variant.sku,
    barcode: variant.barcode || null,
    color_variant: {
      name: variant.option1 || "Default",
      code: (variant.option1 || "default").toLowerCase().replace(/\s+/g, "_"),
      variant_category: {
        name: "Color",
        code: "color",
      },
    },
    size_variant: {
      name: variant.option2 || "One Size",
      code: (variant.option2 || "one_size").toLowerCase().replace(/\s+/g, "_"),
      variant_category: {
        name: "Size",
        code: "size",
      },
    },
  }));

  // Determinar la categoría y subcategoría basado en tags o product_type
  const categoryFromTags = shopifyProduct.tags?.[0] || "Clothing";
  const category = {
    name: categoryFromTags,
    code: categoryFromTags.toLowerCase().replace(/\s+/g, "_"),
  };

  const subcategory = {
    name: shopifyProduct.product_type || "General",
    code: (shopifyProduct.product_type || "general")
      .toLowerCase()
      .replace(/\s+/g, "_"),
  };

  // Procesar precios de la primera variante
  const mainVariant = shopifyProduct.variants[0];
  const prices = [
    {
      price_incl_tax: mainVariant.price,
      //   discount_price_incl_tax: mainVariant.compare_at_price || "0",
      tax_id: 44812, // corresponde al IVA (21)
      pricing_tier_id: 12307, // Nivel de precio por defecto (Precios Web)
    },
  ];

  // Construir el objeto final
  const stockAgileProduct = {
    code: shopifyProduct.sku,
    name: shopifyProduct.title,
    description: shopifyProduct.description,
    description_long: shopifyProduct.description, // Mismo que description si no hay largo
    cover_url: coverUrl,
    origin_code: shopifyProduct.sku,
    provider_id: 2423014, // proveedor TradeINN en stockAgile
    prices: prices,
    brand: {
      name: shopifyProduct.vendor,
      code: shopifyProduct.vendor.toLowerCase().replace(/\s+/g, "_"),
    },
    season: {
      name: "All Seasons",
      code: "all_seasons",
    },
    category: category,
    subcategory: subcategory,
    images: uniqueImages, // images,
    attribute_category_values: [
      {
        attributecategory: {
          name: "Gender",
          type: 1,
        },
        value: shopifyProduct.product_type.includes("Men") ? "Male" : "Unisex",
        attributes: [
          {
            name: "Gender",
          },
        ],
      },
    ],
    cost_price: "0", // No disponible en los datos de origen
    manage_uids: true,
    manage_lots: true,
    discount_active: !!mainVariant.compare_at_price,
    product_variants: productVariants,
  };

  return [stockAgileProduct];
};

// // Ejemplo de uso:
// const shopifyProduct = {
//   sku: "140929510",
//   title: "+8000 Gorro 8gr2311 24i",
//   description: "Conquista el frío con estilo con el gorro +8000 8gr2311 24i.",
//   vendor: "+8000",
//   product_type: "Men´s clothing",
//   tags: ["Beanies"],
//   google_product_category:
//     "Apparel & Accessories > Clothing Accessories > Hats",
//   images: [
//     {
//       src: "https://storage.googleapis.com/tradeinn-images/web/products_image/14092/fotos/140929510.webp",
//     },
//     {
//       src: "https://storage.googleapis.com/tradeinn-images/web/products_image/14092/fotos/140929510.webp||https://storage.googleapis.com/tradeinn-images/web/products_image/14092/fotos/140929510_2.webp",
//     },
//   ],
//   status: "active",
//   variants: [
//     {
//       sku: "143454686",
//       price: "8.55",
//       compare_at_price: "10.26",
//       barcode: "8445402636099",
//       weight: 0.25,
//       weight_unit: "kg",
//       inventory_quantity: 14,
//       inventory_management: "shopify",
//       option1: "Anthracite",
//       option2: "One Size",
//       requires_shipping: true,
//       taxable: true,
//       stock_warehouse: "0",
//       date_delivery: "2025-04-11",
//     },
//   ],
// };

// const stockAgileProduct = transformProductToStockAgile(shopifyProduct);
// console.log(JSON.stringify(stockAgileProduct, null, 2));

module.exports = { transformProductToStockAgile };
