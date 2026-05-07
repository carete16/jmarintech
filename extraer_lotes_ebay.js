/**
 * extraer_lotes_ebay.js
 * Extrae un listado de productos de eBay basado en una búsqueda.
 * Uso: node extraer_lotes_ebay.js "laptops refurbished bulk"
 */
require('dotenv').config();
const EbayAPI = require('./src/core/EbayAPIRadar');

async function extraer(query) {
    if (!query) {
        console.log("❌ Por favor, ingresa una búsqueda. Ej: node extraer_lotes_ebay.js \"lot laptops\"");
        return;
    }

    console.log(`🚀 Buscando lotes para: "${query}"...`);
    const results = await EbayAPI.searchItems(query, 10);

    if (results.length === 0) {
        console.log("⚠️ No se encontraron resultados. Verifica tus credenciales de eBay en el .env");
        return;
    }

    console.log("\n--- RESULTADOS ENCONTRADOS ---\n");
    
    results.forEach((item, index) => {
        const totalEbay = (item.price + item.shipping).toFixed(2);
        console.log(`${index + 1}. ${item.title.toUpperCase()}`);
        console.log(`   💰 Precio: $${item.price} ${item.currency}`);
        console.log(`   📦 Envío eBay: $${item.shipping} ${item.currency}`);
        console.log(`   💵 TOTAL EBAY: $${totalEbay} ${item.currency}`);
        console.log(`   📸 Foto: ${item.image}`);
        console.log(`   🔗 Link: ${item.link}`);
        console.log(`   --------------------------------------------------\n`);
    });

    console.log(`✅ Se extrajeron ${results.length} productos.`);
}

const busqueda = process.argv.slice(2).join(' ') || "laptops refurbished bulk";
extraer(busqueda);
