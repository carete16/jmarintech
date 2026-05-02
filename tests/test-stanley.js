const LinkTransformer = require('./src/utils/LinkTransformer');
const Bot2 = require('./src/core/Bot2_Explorer');
const logger = require('./src/utils/logger');

async function testSingleDeal(url) {
    console.log('\n🔍 ========================================');
    console.log('   PROBANDO BYPASS EN TIEMPO REAL');
    console.log('========================================\n');

    try {
        console.log(`Step 1: Entrando a Slickdeals...`);
        console.log(`URL: ${url}\n`);

        // Simular lo que hace el Bot 2 (Explorador)
        console.log(`Step 2: Buscando el enlace a la tienda real...`);
        const expedition = await Bot2.explore(url);

        console.log(`   Tienda Detectada: ${expedition.store}`);
        console.log(`   Precio Oferta: $${expedition.price_offer}`);
        console.log(`   Precio Original: $${expedition.price_official}`);
        console.log(`   URL Encontrada: ${expedition.finalUrl.substring(0, 80)}...\n`);

        // Simular el LinkTransformer (Paso 3: Limpieza y Re-monetización)
        console.log(`Step 3: Ejecutando Hyper-Bypass (Limpieza de códigos ajenos)...`);
        const finalLink = await LinkTransformer.transform(expedition.finalUrl);

        console.log(`\n🏆 RESULTADO FINAL:`);
        console.log(`   Link Limpio y Monetizado para MasbaratoDeals:`);
        console.log(`   👉 ${finalLink}\n`);

        if (finalLink.includes('masbaratodeal-20') || finalLink.includes('viglink.com')) {
            console.log('✅ EXITO: El enlace es 100% tuyo. Slickdeals ha sido eliminado.');
        } else {
            console.log('⚠️ ALERTA: Verifica los códigos de afiliado.');
        }

    } catch (e) {
        console.error(`❌ Error en el test: ${e.message}`);
    }
}

testSingleDeal('https://slickdeals.net/f/19106482-30-oz-stanley-iceflow-2-0-flip-straw-tumbler-with-handle-prickly-pear-18-23?attrsrc=JFYCarousel%3APosition%3A1%7CJFYCarousel%3AType%3Athread&src=jfy_carousel');
