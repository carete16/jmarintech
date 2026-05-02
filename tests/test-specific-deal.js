const LinkResolver = require('./src/utils/LinkResolver');
const logger = require('./src/utils/logger');

// La URL específica que el usuario compartió
const testUrl = 'https://slickdeals.net/f/19073197-20-oz-stanley-stainless-steel-h2-0-flowstate-quencher-tumbler-frost-or-ash-17-50-free-shipping-w-prime-or-on-35?utm_source=rss&utm_content=fp&utm_medium=RSS2';

async function test() {
    console.log('🔍 Probando resolución de enlace específico...');
    console.log(`🔗 URL Original: ${testUrl}`);

    try {
        const finalLink = await LinkResolver.resolve(testUrl);
        console.log('\n✅ RESULTADO FINAL:');
        console.log(finalLink);

        if (finalLink.includes('amazon.com') || finalLink.includes('amzn.to')) {
            console.log('\n🎉 ¡ÉXITO! Se detectó un enlace de Amazon.');
        } else {
            console.log('\n⚠️ Advertencia: El enlace resultante no parece de Amazon.');
        }
    } catch (error) {
        console.error('❌ Error fatal:', error);
    }
}

test();
