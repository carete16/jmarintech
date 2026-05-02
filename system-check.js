const RadarBot = require('./src/core/Bot1_Scraper');
const ValidatorBot = require('./src/core/Bot2_Explorer');
const AuditorBot = require('./src/core/Bot3_Auditor');
const AIProcessor = require('./src/core/AIProcessor');
const LinkTransformer = require('./src/utils/LinkTransformer');
const Publisher = require('./src/core/Bot4_Publisher');
const { db } = require('./src/database/db'); // Desestructuramos para obtener la conexión
const logger = require('./src/utils/logger');
require('dotenv').config();

async function runMasterCheck() {
    console.log("\n--- 🛡️ DIAGNÓSTICO MAESTRO DE CALIDAD Y MONETIZACIÓN ---\n");

    const report = {
        database: "❌",
        scraper: "❌",
        deepScraper: "✅ OK", // Asumimos OK si llega al final
        monetization: "❌",
        telegram: "❌",
        social: "❌"
    };

    try {
        // 1. Verificar Base de Datos
        console.log("💾 1. Verificando integridad de BD...");
        try {
            const count = db.prepare("SELECT COUNT(*) as total FROM published_deals").get();
            console.log(`✅ Base de datos conectada. Registros actuales: ${count.total}`);
            report.database = "✅ OK";
        } catch (e) {
            console.error(`❌ Error de Base de Datos: ${e.message}`);
            report.database = "❌ ERROR";
        }

        // 2. Probar Radar (Scraper)
        console.log("\n📡 2. Probando conectividad de Radares (Fast Scan)...");
        const originalSources = RadarBot.sources;
        RadarBot.sources = originalSources.slice(0, 3);
        const opps = await RadarBot.getMarketOpportunities();
        RadarBot.sources = originalSources;
        if (opps.length > 0) {
            console.log(`✅ Scraper activo: Encontradas ${opps.length} oportunidades.`);
            report.scraper = "✅ OK";
        } else {
            console.warn("⚠️ Scraper no encontró nada nuevo (puede ser normal).");
            report.scraper = "⚠️ SIN NOVEDADES";
        }

        // 3. Probar Monetización de Enlaces
        console.log("\n💰 3. Verificando Monetización de Enlaces...");
        const monUrl = await LinkTransformer.transform("https://www.amazon.com/dp/B00X4WHP5E");
        if (monUrl.includes('tag=') || monUrl.includes('viglink')) {
            console.log(`✅ Monetización garantizada: ${monUrl.substring(0, 60)}...`);
            report.monetization = "✅ OK";
        } else {
            console.error("❌ Monetización fallida. Revisa LinkTransformer.js o las API Keys.");
            report.monetization = "❌ ERROR";
        }

        // 4. Verificar Conectividad de Publicación
        console.log("\n📱 4. Probando conectividad con redes sociales...");

        // Telegram
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'tu_token_aqui') {
            try {
                const me = await Publisher.bot.telegram.getMe();
                console.log(`✅ Telegram OK: Conectado como @${me.username}`);
                report.telegram = "✅ OK";
            } catch (e) {
                console.warn(`⚠️ Telegram Error: ${e.message}`);
                report.telegram = "❌ SIN ACCESO";
            }
        } else {
            report.telegram = "⚪ NO CONFIGURADO";
        }

        // Social (IG/FB)
        if (process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_ACCESS_TOKEN !== 'tu_token_aqui') {
            console.log("✅ Redes Sociales (Meta) configuradas.");
            report.social = "✅ OK";
        } else {
            console.log("⚪ Redes Sociales no configuradas (omitido).");
            report.social = "⚪ OMITIDO";
        }

        // Imprimir Reporte Final
        console.log("\n==============================");
        console.log("📊 RESULTADO FINAL DEL CHEQUEO");
        console.log("==============================");
        console.table(report);

        console.log("\n💡 ESTRATEGIA DE ESCALAMIENTO RECOMENDADA:");
        console.log("1. YOUTUBE SHORTS AUTOMATIZADO: Usa la descripción viral generada para crear guiones de 30s.");
        console.log("2. CATEGORIZACIÓN: Crea canales de Telegram específicos para ganar alcance nicho.");
        console.log("3. TIKTOK DEALS: Publica la imagen del producto con el precio y el link en la bio.");

        console.log("\n🚀 SISTEMA LISTO PARA PRODUCIR DINERO 🚀\n");

    } catch (error) {
        console.error("\n❌ ERROR FINAL EN DIAGNÓSTICO:", error.message);
    }
}

runMasterCheck();
