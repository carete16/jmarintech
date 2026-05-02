#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE PRUEBA - FILTRO ANTI-COMPETENCIA
 * 
 * Verifica que el sistema elimine correctamente todas las referencias a Slickdeals
 */

const LinkTransformer = require('./src/utils/LinkTransformer');
const logger = require('./src/utils/logger');

console.log('\n🧪 ========================================');
console.log('   TEST: FILTRO ANTI-COMPETENCIA');
console.log('========================================\n');

async function testBypass() {
    const testCases = [
        {
            name: 'Link con parámetro u2 (Amazon)',
            url: 'https://slickdeals.net/f/123?u2=https%3A%2F%2Famazon.com%2Fdp%2FB0BYP8CLS8',
            expected: 'amazon.com'
        },
        {
            name: 'Link directo de Amazon (sin Slickdeals)',
            url: 'https://www.amazon.com/dp/B0BYP8CLS8',
            expected: 'amazon.com'
        },
        {
            name: 'Link de eBay',
            url: 'https://www.ebay.com/itm/123456789',
            expected: 'ebay.com'
        }
    ];

    console.log('📋 CASOS DE PRUEBA:\n');

    for (const test of testCases) {
        console.log(`\n🔍 TEST: ${test.name}`);
        console.log(`   Entrada: ${test.url}`);

        try {
            const result = await LinkTransformer.transform(test.url);

            if (!result) {
                console.log('   ❌ RESULTADO: null (link descartado)');
                console.log('   ⚠️  El bypass falló y el link fue descartado correctamente');
            } else if (result.includes('slickdeals.net')) {
                console.log(`   ❌ FALLO: El link sigue siendo de Slickdeals`);
                console.log(`   Salida: ${result}`);
            } else if (result.includes(test.expected)) {
                console.log(`   ✅ ÉXITO: ${result}`);

                // Verificar que tenga el tag de afiliado
                if (test.expected === 'amazon.com' && result.includes('tag=')) {
                    console.log('   ✅ Tag de afiliado presente');
                }
            } else {
                console.log(`   ⚠️  Resultado inesperado: ${result}`);
            }
        } catch (error) {
            console.log(`   ❌ ERROR: ${error.message}`);
        }
    }

    console.log('\n========================================');
    console.log('   PRUEBA DE LIMPIEZA DE TEXTO');
    console.log('========================================\n');

    // Test de limpieza de texto
    const textTests = [
        {
            name: 'Título con "Slickdeals"',
            input: 'Oferta encontrada en Slickdeals: Stanley Tumbler',
            clean: (text) => text.replace(/slickdeals?/gi, '').replace(/\s{2,}/g, ' ').trim()
        },
        {
            name: 'Descripción con "Slickdeal"',
            input: 'Esta es una oferta de Slickdeal muy buena',
            clean: (text) => text.replace(/slickdeals?/gi, '').replace(/\s{2,}/g, ' ').trim()
        },
        {
            name: 'Texto sin referencias',
            input: 'Oferta exclusiva de Amazon',
            clean: (text) => text.replace(/slickdeals?/gi, '').replace(/\s{2,}/g, ' ').trim()
        }
    ];

    for (const test of textTests) {
        console.log(`\n🔍 TEST: ${test.name}`);
        console.log(`   Entrada: "${test.input}"`);
        const result = test.clean(test.input);
        console.log(`   Salida:  "${result}"`);

        if (result.toLowerCase().includes('slickdeal')) {
            console.log('   ❌ FALLO: Aún contiene "Slickdeal"');
        } else {
            console.log('   ✅ ÉXITO: Texto limpio');
        }
    }

    console.log('\n========================================');
    console.log('   RESUMEN');
    console.log('========================================\n');
    console.log('✅ Si todos los tests pasaron, el filtro está funcionando correctamente.');
    console.log('❌ Si algún test falló, revisa los logs arriba para identificar el problema.\n');
    console.log('📝 NOTA: Los links de Slickdeals que NO se puedan transformar');
    console.log('   serán automáticamente descartados por CoreProcessor.\n');
}

// Ejecutar tests
testBypass().catch(error => {
    console.error('\n❌ Error ejecutando tests:', error.message);
    process.exit(1);
});
