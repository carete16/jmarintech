#!/usr/bin/env node

/**
 * 📊 SCRIPT DE ESTADÍSTICAS - MasbaratoDeals
 * 
 * Uso: node stats.js
 * 
 * Muestra estadísticas rápidas de tu sitio:
 * - Ofertas publicadas hoy
 * - Total de clics
 * - Suscriptores de newsletter
 * - Top 10 ofertas más clickeadas
 */

const Database = require('better-sqlite3');
const path = require('path');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'src', 'database', 'deals.db');
const db = new Database(dbPath);

console.log('\n🎯 ========================================');
console.log('   ESTADÍSTICAS MASBARATODEALS');
console.log('========================================\n');

try {
    // 1. Ofertas publicadas hoy
    const today = db.prepare(`
        SELECT COUNT(*) as count 
        FROM published_deals 
        WHERE date(posted_at) = date('now')
    `).get();

    console.log('📅 OFERTAS PUBLICADAS HOY:');
    console.log(`   ${today.count} ofertas\n`);

    // 2. Total de ofertas
    const total = db.prepare(`
        SELECT COUNT(*) as count 
        FROM published_deals
    `).get();

    console.log('📦 TOTAL DE OFERTAS:');
    console.log(`   ${total.count} ofertas publicadas\n`);

    // 3. Total de clics
    const clicks = db.prepare(`
        SELECT SUM(clicks) as total 
        FROM published_deals
    `).get();

    console.log('👆 TOTAL DE CLICS:');
    console.log(`   ${clicks.total || 0} clics en enlaces de Amazon\n`);

    // 4. Suscriptores de newsletter
    const subscribers = db.prepare(`
        SELECT COUNT(*) as count 
        FROM newsletter_subscribers 
        WHERE active = 1
    `).get();

    console.log('📧 SUSCRIPTORES DE NEWSLETTER:');
    console.log(`   ${subscribers.count} suscriptores activos\n`);

    // 5. Top 10 ofertas más clickeadas
    const topDeals = db.prepare(`
        SELECT title, clicks, discount_percentage, posted_at
        FROM published_deals 
        WHERE clicks > 0
        ORDER BY clicks DESC 
        LIMIT 10
    `).all();

    console.log('🏆 TOP 10 OFERTAS MÁS CLICKEADAS:');
    if (topDeals.length === 0) {
        console.log('   (Aún no hay clics registrados)\n');
    } else {
        topDeals.forEach((deal, index) => {
            const date = new Date(deal.posted_at).toLocaleDateString();
            console.log(`   ${index + 1}. ${deal.title.substring(0, 50)}...`);
            console.log(`      Clics: ${deal.clicks} | Descuento: ${deal.discount_percentage}% | Fecha: ${date}\n`);
        });
    }

    // 6. Estadísticas de esta semana
    const thisWeek = db.prepare(`
        SELECT 
            COUNT(*) as deals,
            SUM(clicks) as clicks
        FROM published_deals 
        WHERE date(posted_at) >= date('now', '-7 days')
    `).get();

    console.log('📊 ESTA SEMANA (Últimos 7 días):');
    console.log(`   ${thisWeek.deals} ofertas publicadas`);
    console.log(`   ${thisWeek.clicks || 0} clics generados\n`);

    // 7. Promedio de descuento
    const avgDiscount = db.prepare(`
        SELECT AVG(discount_percentage) as avg
        FROM published_deals
        WHERE discount_percentage > 0
    `).get();

    console.log('💰 DESCUENTO PROMEDIO:');
    console.log(`   ${avgDiscount.avg ? avgDiscount.avg.toFixed(1) : 0}% de descuento promedio\n`);

    // 8. Proyección de ingresos (estimado)
    const totalClicks = clicks.total || 0;
    const estimatedPurchases = totalClicks * 0.10; // 10% conversión
    const avgPurchase = 50; // $50 promedio
    const commission = 0.03; // 3% comisión Amazon
    const estimatedEarnings = estimatedPurchases * avgPurchase * commission;

    console.log('💵 PROYECCIÓN DE INGRESOS (Estimado):');
    console.log(`   ${totalClicks} clics × 10% conversión = ${estimatedPurchases.toFixed(0)} compras estimadas`);
    console.log(`   ${estimatedPurchases.toFixed(0)} compras × $${avgPurchase} × 3% = $${estimatedEarnings.toFixed(2)} USD estimados\n`);

    console.log('========================================');
    console.log('💡 TIP: Ejecuta este script diariamente para');
    console.log('   monitorear tu progreso.\n');

} catch (error) {
    console.error('❌ Error al obtener estadísticas:', error.message);
    console.log('\n⚠️  Asegúrate de que el servidor esté corriendo');
    console.log('   y la base de datos esté inicializada.\n');
}

db.close();
