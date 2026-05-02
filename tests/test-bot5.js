const Bot5 = require('./src/core/Bot5_BrowserSim');

const testUrl = 'https://slickdeals.net/f/19109737-6-pack-better-homes-gardens-porcelain-square-bowls-white-10-02-more-free-s-h-w-walmart-or-on-35';

async function test() {
    console.log('🧪 PROBANDO BOT 5 (Browser Simulator)...\n');

    const result = await Bot5.extractRealLink(testUrl);

    console.log('\n--- RESULTADO ---');
    console.log('Éxito:', result.success);
    console.log('Link extraído:', result.link);

    if (result.success && !result.link.includes('slickdeals.net')) {
        console.log('\n✅ BOT 5 FUNCIONA CORRECTAMENTE');
    } else {
        console.log('\n⚠️ BOT 5 no pudo extraer el link limpio');
    }
}

test();
