const GlobalDealsCollector = require('./src/collectors/GlobalDealsCollector');
const CoreProcessor = require('./src/core/CoreProcessor');
const LinkTransformer = require('./src/utils/LinkTransformer');
const db = require('./src/database/db');

// MOCK para evitar que el filtro de duplicados bloquee la prueba
db.isRecentlyPublished = () => false;

async function testDrive() {
    console.log("🚀 INICIANDO VERIFICACIÓN DE BYPASS (SIN BLOQUEO DE DUPLICADOS)...");

    const rawDeals = await GlobalDealsCollector.getDeals();
    const slickDeal = rawDeals.find(d => d.link && d.link.includes('slickdeals.net'));

    if (!slickDeal) {
        console.log("⚠️ No se encontró ninguna oferta de Slickdeals.");
        return;
    }

    console.log(`🔗 Link Original: ${slickDeal.link}`);

    // Llamada directa al transformador para ver los logs
    console.log("\n--- PROCESANDO BYPASS ---");
    const bypassLink = await LinkTransformer.transform(slickDeal.link);
    console.log(`\n✅ Link Resultante: ${bypassLink}`);

    if (bypassLink.includes('slickdeals.net')) {
        console.log("\n❌ FALLO: El bypass no eliminó Slickdeals.");
    } else {
        console.log("\n💎 EXITO: El enlace ahora es directo a la tienda.");
    }
}

testDrive().catch(err => console.error(err));
