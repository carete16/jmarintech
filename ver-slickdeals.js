#!/usr/bin/env node

/**
 * 🔥 MOSTRAR OFERTAS DE SLICKDEALS
 * Muestra las ofertas directas del feed RSS de Slickdeals
 */

const SlickRSSCollector = require('./src/collectors/SlickRSSCollector');

console.log('\n🔥 ========================================');
console.log('   OFERTAS DE SLICKDEALS (RSS)');
console.log('========================================\n');

console.log('📡 Fuente: https://slickdeals.net/newsearch.php');
console.log('   (Feed RSS de ofertas frontpage)\n');

async function showSlickdealsOffers() {
    try {
        console.log('⏳ Conectando a Slickdeals RSS...');
        console.log('   (Esto puede tardar 30-60 segundos)\n');

        const startTime = Date.now();
        const deals = await SlickRSSCollector.getDeals();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`✅ Se obtuvieron ${deals.length} ofertas en ${elapsed}s\n`);
        console.log('========================================\n');

        if (deals.length === 0) {
            console.log('⚠️  No se encontraron ofertas en este momento.');
            console.log('   Posibles razones:');
            console.log('   - El feed RSS está temporalmente vacío');
            console.log('   - Slickdeals bloqueó la conexión');
            console.log('   - Problemas de red\n');
            return;
        }

        deals.forEach((deal, index) => {
            console.log(`🔥 OFERTA ${index + 1}/${deals.length}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

            console.log(`📌 TÍTULO:`);
            console.log(`   ${deal.title}\n`);

            console.log(`🔗 LINK (Ya procesado - SIN Slickdeals):`);
            console.log(`   ${deal.link.substring(0, 80)}...`);

            // Verificar si el link todavía contiene slickdeals
            if (deal.link.includes('slickdeals.net')) {
                console.log(`   ⚠️  ADVERTENCIA: Este link aún contiene "slickdeals.net"`);
                console.log(`   El filtro anti-competencia lo bloqueará`);
            } else {
                console.log(`   ✅ Link directo a tienda (sin Slickdeals)`);
            }
            console.log('');

            if (deal.price_offer) {
                console.log(`💰 PRECIO: $${deal.price_offer}`);
            }

            if (deal.price_official) {
                console.log(`📊 PRECIO ORIGINAL: $${deal.price_official}`);
                const discount = Math.round(((deal.price_official - deal.price_offer) / deal.price_official) * 100);
                console.log(`📉 DESCUENTO: ${discount}%`);
            }

            console.log(`🏪 TIENDA: ${deal.tienda}`);
            console.log(`📂 CATEGORÍA: ${deal.categoria}`);
            console.log(`⭐ SCORE: ${deal.score}`);

            if (deal.image) {
                console.log(`🖼️  IMAGEN: ${deal.image.substring(0, 50)}...`);
            }

            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        });

        console.log('========================================');
        console.log('   RESUMEN');
        console.log('========================================\n');

        // Estadísticas por tienda
        const amazonDeals = deals.filter(d => d.tienda && d.tienda.toLowerCase().includes('amazon'));
        const ebayDeals = deals.filter(d => d.tienda && d.tienda.toLowerCase().includes('ebay'));
        const walmartDeals = deals.filter(d => d.tienda && d.tienda.toLowerCase().includes('walmart'));
        const otherDeals = deals.filter(d => !d.tienda ||
            (!d.tienda.toLowerCase().includes('amazon') &&
                !d.tienda.toLowerCase().includes('ebay') &&
                !d.tienda.toLowerCase().includes('walmart')));

        console.log(`📊 Total de ofertas: ${deals.length}`);
        console.log(`   🛒 Amazon: ${amazonDeals.length}`);
        console.log(`   🛒 eBay: ${ebayDeals.length}`);
        console.log(`   🛒 Walmart: ${walmartDeals.length}`);
        console.log(`   🛒 Otras: ${otherDeals.length}\n`);

        // Descuento promedio
        const dealsWithDiscount = deals.filter(d => d.price_official && d.price_offer);
        if (dealsWithDiscount.length > 0) {
            const avgDiscount = dealsWithDiscount
                .map(d => ((d.price_official - d.price_offer) / d.price_official) * 100)
                .reduce((a, b) => a + b, 0) / dealsWithDiscount.length;

            console.log(`💰 Descuento promedio: ${avgDiscount.toFixed(1)}%\n`);
        }

        // Verificar cuántos links todavía tienen slickdeals
        const slickdealsLinks = deals.filter(d => d.link.includes('slickdeals.net'));
        if (slickdealsLinks.length > 0) {
            console.log(`⚠️  ADVERTENCIA: ${slickdealsLinks.length} ofertas aún tienen links de Slickdeals`);
            console.log(`   Estas serán BLOQUEADAS por el filtro anti-competencia\n`);
        } else {
            console.log(`✅ PERFECTO: Todos los links son directos a tiendas\n`);
        }

        console.log('📝 NOTA: El filtro anti-competencia procesará estas ofertas:');
        console.log('   1. ✅ Bloqueará links que aún contengan "slickdeals.net"');
        console.log('   2. ✅ Eliminará "Slickdeals" de títulos y descripciones');
        console.log('   3. ✅ Agregará tu tag de afiliado');
        console.log('   4. ✅ Publicará solo las que pasen todos los filtros\n');

        console.log(`⏱️  Tiempo total: ${elapsed}s\n`);

    } catch (error) {
        console.error('❌ Error obteniendo ofertas:', error.message);
        console.log('\n⚠️  Posibles causas:');
        console.log('   - Slickdeals bloqueó la conexión');
        console.log('   - Problemas de red');
        console.log('   - El feed RSS cambió de formato');
        console.log('   - Timeout en resolución de links\n');
    }
}

showSlickdealsOffers();
