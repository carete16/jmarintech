const Radar = require('./src/core/Bot1_Scraper');
const Auditor = require('./src/core/Bot3_Auditor');
const Validator = require('./src/core/Bot2_Explorer');
const logger = require('./src/utils/logger');

async function detectarGanadores() {
    console.log('🚀 INICIANDO RADAR DE GANADORES (ARBITRAJE USA -> COLOMBIA)\n');
    
    // 1. Obtener oportunidades del Radar (RSS por ahora)
    const opportunities = await Radar.getMarketOpportunities();
    console.log(`📡 Se detectaron ${opportunities.length} ofertas potenciales en USA.\n`);

    const ganadores = [];

    // 2. Validar y Auditar cada una (Solo las top 15 para la prueba)
    for (let opp of opportunities.slice(0, 15)) {
        try {
            process.stdout.write(`🔍 Analizando: ${opp.title.substring(0, 40)}... `);
            
            // Validación de stock y precio real
            const validation = await Validator.validate(opp);
            if (!validation.isValid) {
                console.log('❌ (Sin stock o precio inválido)');
                continue;
            }

            // Auditoría de Arbitraje (Busca en MercadoLibre y calcula profit)
            const audit = await Auditor.audit(validation);
            
            if (audit.profit > 0) {
                console.log(`✅ PROFIT: $${audit.profit.toLocaleString()} COP`);
                if (audit.profit > 100000) {
                    ganadores.push({
                        title: validation.title,
                        tienda: validation.storeName,
                        precioUsa: validation.realPrice,
                        precioMeli: audit.meliPrice,
                        costoImportacion: audit.costoTotal,
                        profit: audit.profit,
                        badge: audit.badge
                    });
                }
            } else {
                console.log('📉 (No rentable)');
            }
        } catch (e) {
            console.log(`⚠️ Error: ${e.message}`);
        }
    }

    // 3. Resultado Final
    console.log('\n🏆 --- RESULTADOS DEL RADAR DE GANADORES --- 🏆\n');
    if (ganadores.length === 0) {
        console.log('No se encontraron ganadores con margen > $100.000 COP en este ciclo.');
    } else {
        ganadores.sort((a, b) => b.profit - a.profit).forEach((g, i) => {
            console.log(`${i+1}. [${g.badge}] ${g.title}`);
            console.log(`   🏬 Tienda: ${g.tienda} | 💰 USA: $${g.precioUsa} USD`);
            console.log(`   🇨🇴 Precio Meli: $${g.precioMeli.toLocaleString()} COP`);
            console.log(`   🚚 Costo Importado: $${g.costoImportacion.toLocaleString()} COP`);
            console.log(`   🔥 GANANCIA ESTIMADA: $${g.profit.toLocaleString()} COP\n`);
        });
    }
}

detectarGanadores();
