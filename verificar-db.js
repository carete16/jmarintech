#!/usr/bin/env node

/**
 * 🔍 VERIFICAR OFERTAS EN BASE DE DATOS
 * Revisa que NO haya links de Slickdeals en las ofertas publicadas
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'database', 'deals.db');
const db = new Database(dbPath);

console.log('\n🔍 ========================================');
console.log('   VERIFICACIÓN DE BASE DE DATOS');
console.log('========================================\n');

try {
    // Obtener todas las ofertas
    const allDeals = db.prepare('SELECT id, title, link FROM published_deals ORDER BY posted_at DESC LIMIT 20').all();

    console.log(`📊 Revisando las últimas ${allDeals.length} ofertas...\n`);

    let slickdealsFound = 0;
    let cleanDeals = 0;

    allDeals.forEach((deal, index) => {
        const hasSlickdeals = deal.link && deal.link.includes('slickdeals.net');
        const titleHasSlickdeals = deal.title && deal.title.toLowerCase().includes('slickdeal');

        if (hasSlickdeals || titleHasSlickdeals) {
            slickdealsFound++;
            console.log(`❌ OFERTA ${index + 1}:`);
            console.log(`   Título: ${deal.title.substring(0, 60)}...`);
            console.log(`   Link: ${deal.link.substring(0, 80)}...`);
            if (hasSlickdeals) console.log(`   ⚠️  Link contiene "slickdeals.net"`);
            if (titleHasSlickdeals) console.log(`   ⚠️  Título contiene "Slickdeal"`);
            console.log('');
        } else {
            cleanDeals++;
        }
    });

    console.log('========================================');
    console.log('   RESULTADO');
    console.log('========================================\n');

    if (slickdealsFound === 0) {
        console.log('✅ PERFECTO: Ninguna oferta contiene referencias a Slickdeals');
        console.log(`   ${cleanDeals} ofertas están limpias\n`);
        console.log('🔒 El filtro anti-competencia está funcionando correctamente.\n');
    } else {
        console.log(`⚠️  ATENCIÓN: Se encontraron ${slickdealsFound} ofertas con referencias a Slickdeals`);
        console.log(`   ${cleanDeals} ofertas están limpias\n`);
        console.log('📝 NOTA: Las ofertas antiguas pueden tener referencias.');
        console.log('   El filtro solo afecta ofertas NUEVAS desde hoy.\n');
        console.log('💡 SOLUCIÓN: Reinicia el servidor para aplicar el filtro:');
        console.log('   1. Detén el servidor (Ctrl+C)');
        console.log('   2. Ejecuta: node index.js\n');
    }

    // Mostrar ejemplo de oferta limpia
    const cleanExample = allDeals.find(d => !d.link.includes('slickdeals.net'));
    if (cleanExample) {
        console.log('📋 EJEMPLO DE OFERTA LIMPIA:');
        console.log(`   Título: ${cleanExample.title.substring(0, 60)}...`);
        console.log(`   Link: ${cleanExample.link.substring(0, 80)}...\n`);
    }

} catch (error) {
    console.error('❌ Error:', error.message);
}

db.close();
