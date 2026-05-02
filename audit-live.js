const axios = require('axios');

async function auditLive() {
    console.log("🔍 AUDITORÍA EN VIVO - VERIFICACIÓN DE MONETIZACIÓN\n");
    console.log("=".repeat(60));

    try {
        // 1. Obtener ofertas publicadas
        const response = await axios.get('https://masbaratodeals.onrender.com/api/deals');
        const deals = response.data;

        console.log(`\n📊 Total de ofertas en producción: ${deals.length}\n`);

        if (deals.length === 0) {
            console.log("⚠️  No hay ofertas publicadas. Ejecuta el seeder primero.");
            return;
        }

        let monetizedCount = 0;
        let errors = [];

        // 2. Verificar cada oferta
        for (const deal of deals) {
            console.log(`\n🔎 Analizando: ${deal.title}`);
            console.log(`   Tienda: ${deal.tienda}`);
            console.log(`   Precio: $${deal.price_offer} (antes: $${deal.price_official})`);
            console.log(`   Link: ${deal.link.substring(0, 80)}...`);

            // Verificar monetización
            let isMonetized = false;
            let monetizationType = '';

            if (deal.link.includes('tag=masbaratodeal-20') || deal.link.includes('tag=masbarato')) {
                isMonetized = true;
                monetizationType = 'Amazon Affiliate';
            } else if (deal.link.includes('redirect.viglink.com') || deal.link.includes('sovrn')) {
                isMonetized = true;
                monetizationType = 'Sovrn/VigLink';
            } else if (deal.link.includes('rover.ebay.com')) {
                isMonetized = true;
                monetizationType = 'eBay Partner Network';
            }

            if (isMonetized) {
                console.log(`   ✅ MONETIZADO (${monetizationType})`);
                monetizedCount++;
            } else {
                console.log(`   ❌ NO MONETIZADO - PROBLEMA CRÍTICO`);
                errors.push({
                    title: deal.title,
                    link: deal.link,
                    reason: 'No se detectó código de afiliado'
                });
            }
        }

        // 3. Resumen
        console.log("\n" + "=".repeat(60));
        console.log("\n📈 RESUMEN DE AUDITORÍA:");
        console.log(`   Total ofertas: ${deals.length}`);
        console.log(`   Monetizadas: ${monetizedCount} (${Math.round(monetizedCount / deals.length * 100)}%)`);
        console.log(`   Sin monetizar: ${errors.length}`);

        if (errors.length > 0) {
            console.log("\n⚠️  OFERTAS CON PROBLEMAS:");
            errors.forEach((err, i) => {
                console.log(`\n   ${i + 1}. ${err.title}`);
                console.log(`      Link: ${err.link}`);
                console.log(`      Razón: ${err.reason}`);
            });
        } else {
            console.log("\n🎉 ¡PERFECTO! Todas las ofertas están correctamente monetizadas.");
        }

        // 4. Verificar que los links funcionan
        console.log("\n🌐 Probando conectividad de enlaces...");
        const sampleDeal = deals[0];
        try {
            const testResponse = await axios.head(sampleDeal.link, {
                maxRedirects: 5,
                timeout: 5000,
                validateStatus: () => true
            });
            console.log(`   ✅ Link de prueba funcional (Status: ${testResponse.status})`);
        } catch (e) {
            console.log(`   ⚠️  Error al probar link: ${e.message}`);
        }

    } catch (error) {
        console.error(`\n❌ Error en auditoría: ${error.message}`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data)}`);
        }
    }
}

auditLive();
