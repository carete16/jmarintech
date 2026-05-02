require('dotenv').config();
const Publisher = require('./src/core/Bot4_Publisher');
const logger = require('./src/utils/logger');

async function testFullPost() {
    console.log("🚀 Iniciando Test de Publicación Completo (Web + Telegram)...");

    // 1. Simular un deal real con la nueva lógica de precio corregida
    const mockDeal = {
        id: "test_" + Date.now(),
        title: "Test Publication: Apple AirPods Pro (2nd Generation)",
        price_offer: 189.99,
        price_official: 249.00,
        image: "https://m.media-amazon.com/images/I/61f1YfTkTDL._AC_SL1500_.jpg",
        tienda: "Amazon",
        categoria: "Tecnología",
        viralContent: "🔥 ¡PRECIO MÍNIMO! Los AirPods Pro 2 con USB-C vuelven a su precio más bajo.\n\n✅ Cancelación de ruido activa\n✅ Audio adaptativo\n✅ Estuche MagSafe (USB-C)\n\n💰 Ahorro real del 24%.",
        link: "https://www.amazon.com/dp/B0CHWRXH8B?tag=" + (process.env.AMAZON_TAG || "masbaratodeal-20"),
        original_link: "https://www.amazon.com/dp/B0CHWRXH8B"
    };

    console.log(`\n📦 Deal de prueba: ${mockDeal.title}`);
    console.log(`💰 Precio: $${mockDeal.price_offer} (Antes: $${mockDeal.price_official})`);
    console.log(`🔗 Link Monetizado: ${mockDeal.link}`);

    try {
        const success = await Publisher.sendOffer(mockDeal);

        if (success) {
            console.log("\n✅ RESULTADO: El deal se guardó en la DB y el intento de envío a Telegram se completó.");
            console.log("👉 Revisa tu Telegram (ID: " + process.env.TELEGRAM_CHANNEL_ID + ") para confirmar la recepción.");
        } else {
            console.log("\n❌ RESULTADO: Error en la publicación interna.");
        }
    } catch (e) {
        console.error("\n❌ ERROR CRÍTICO:", e.message);
    }
}

testFullPost();
