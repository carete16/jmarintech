const Bot2 = require('./src/core/Bot2_Explorer');

const URL_TEST = 'https://slickdeals.net/f/19109737-6-pack-better-homes-gardens-porcelain-square-bowls-white-10-02-more-free-s-h-w-walmart-or-on-35';

async function test() {
    console.log('🚀 PROBANDO BOT 2 (CORREGIDO) ...');
    try {
        const res = await Bot2.explore(URL_TEST);
        console.log('\n--- RESULTADO FINAL ---');
        console.log('TIENDA:', res.store);
        console.log('URL FINAL:', res.finalUrl);
        console.log('CUPÓN:', res.coupon);

        if (res.finalUrl.includes('slickdeals') && res.store !== 'Oferta USA') {
            console.log('⚠️ ALERTA: Detectamos tienda (' + res.store + ') pero seguimos con URL de Slickdeals.');
            console.log('Esto indica que el scraping falló en sacar el link limpio.');
        } else if (!res.finalUrl.includes('slickdeals')) {
            console.log('✅ ÉXITO: URL limpia obtenida!');
        }
    } catch (e) {
        console.error('CRASH:', e);
    }
}

test();
