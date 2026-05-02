const CoreProcessor = require('./src/core/CoreProcessor');
const TelegramNotifier = require('./src/notifiers/TelegramNotifier');
const logger = require('./src/utils/logger');
require('dotenv').config();

async function testLargeImage() {
    logger.info('🚀 PRUEBA DE IMAGEN DE MAYOR TAMAÑO (REQUERIMIENTO USUARIO)');

    const testDeals = [{
        id: 'test_large_img',
        nombre_producto: 'Apple MacBook Air M3 (2024) - Amazon USA Original',
        price_offer: 749,
        price_official: 1099,
        link: 'https://www.amazon.com/dp/B0CX24NYM1',
        // Imagen real de Amazon de alta resolución
        image: 'https://m.media-amazon.com/images/I/71ItM9VREaL._AC_SL1500_.jpg',
        tienda: 'Amazon USA',
        categoria: 'Tecnología'
    }];

    const processed = await CoreProcessor.processDeals(testDeals);

    if (processed.length > 0) {
        logger.info('Enviando oferta con IMAGEN GRANDE al canal...');
        const result = await TelegramNotifier.sendOffer(processed[0]);
        if (result) {
            console.log('✅ ¡PRUEBA EXITOSA! Revisa Telegram. La imagen debería salir arriba y en tamaño completo.');
        } else {
            console.log('❌ Error en el envío. Revisa los logs.');
        }
    }

    process.exit(0);
}

testLargeImage();
