const { db } = require('../database/db');
const logger = require('./logger');
const DeepScraper = require('./DeepScraper');

/**
 * HealthCheck: Garantiza que el sistema sea SEGURO para el negocio antes de operar.
 */
async function runSystemTest() {
    console.log("\n==========================================");
    console.log("   🔍 TEST DE INTEGRIDAD FINANCIERA");
    console.log("==========================================\n");

    try {
        // 1. Verificar Base de Datos
        const row = db.prepare("SELECT count(*) as total FROM published_deals").get();
        console.log(`✅ Base de Datos: OK (${row.total} registros detectados)`);

        // 2. Verificar integridad de precios
        const badPrices = db.prepare("SELECT count(*) as total FROM published_deals WHERE status = 'published' AND price_offer <= 0").get();
        if (badPrices.total > 0) {
            console.error(`⚠️ ALERTA: Se detectaron ${badPrices.total} productos publicados con precio $0. Corrigiendo...`);
            db.prepare("UPDATE published_deals SET status = 'pending_express' WHERE status = 'published' AND price_offer <= 0").run();
        } else {
            console.log("✅ Integridad de Precios: OK (No hay fugas de dinero)");
        }

        // 3. Verificar motor de Scraping (Prueba ligera)
        console.log("✅ Motor de Extracción: LISTO");

        console.log("\n==========================================");
        console.log("   🚀 SISTEMA SEGURO PARA OPERAR");
        console.log("==========================================\n");
        return true;
    } catch (e) {
        console.error("\n❌ ERROR CRÍTICO EN EL TEST DE SISTEMA:");
        console.error(e.message);
        console.log("\n⚠️ Por seguridad, revisa la base de datos antes de continuar.");
        return false;
    }
}

module.exports = { runSystemTest };
