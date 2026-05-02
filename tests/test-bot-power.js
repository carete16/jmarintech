const GlobalDealsCollector = require('./src/collectors/GlobalDealsCollector');
const CoreProcessor = require('./src/core/CoreProcessor');
const logger = require('./src/utils/logger');

async function testDrive() {
    console.log("🚀 INICIANDO PRUEBA DE AUTOMATIZACIÓN (MODO LECTURA)...");

    // 1. Recolectar
    const rawDeals = await GlobalDealsCollector.getDeals();
    console.log(`📡 Recolectadas: ${rawDeals.length} de fuentes USA.`);

    // 2. Procesar con filtros de élite (Ganga Real)
    const validDeals = await CoreProcessor.processDeals(rawDeals);

    if (validDeals.length === 0) {
        console.log("⚠️ No hay 'Gangas Reales' (>30% dcto o alta demanda) en este momento.");
        return;
    }

    console.log(`✅ Filtradas ${validDeals.length} ofertas de alta calidad.`);

    // 3. Mostrar el mejor resultado
    const best = validDeals[0];
    console.log("\n--- EJEMPLO DE POST GENERADO ---");
    console.log(best.viralContent);
    console.log("\n--- DATOS TÉCNICOS ---");
    console.log(`Tienda: ${best.tienda}`);
    console.log(`Link Monetizado: ${best.link}`);
}

testDrive().catch(err => console.error(err));
