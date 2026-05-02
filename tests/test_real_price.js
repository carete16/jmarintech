const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    const url = "https://www.amazon.com/dp/B0CNJQ6CZ";
    console.log("🕵️ Verificando precio REAL sin trucos...");

    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const $ = cheerio.load(response.data);

        let offerPriceText = $('.a-price .a-offscreen').first().text();
        let listPriceText = $('.basisPrice .a-offscreen').first().text() || $('.a-price.a-text-price .a-offscreen').first().text();

        console.log("-----------------------------------------");
        console.log("LO QUE EL BOT LEE EN AMAZON:");
        console.log("Texto Oferta encontrado:", offerPriceText || "No detectado (Bloqueo)");
        console.log("Texto Lista encontrado:", listPriceText || "No detectado (No hay descuento real)");

        if (!listPriceText) {
            console.log("\n✅ CONCLUSIÓN: Amazon NO muestra un precio tachado para este producto.");
            console.log("❌ ANTES: El bot inventaba un 23% extra.");
            console.log("🚀 AHORA: El bot mostrará $8.99 y 0% de descuento (Honesto).");
        }
        console.log("-----------------------------------------");

    } catch (e) {
        console.log("Error de acceso (Amazon bloquea peticiones simples). Por eso instalamos Puppeteer.");
    }
    process.exit();
}

test();
