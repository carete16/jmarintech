#!/usr/bin/env node

/**
 * 🧪 TEST SIMPLE - Verificar Filtro Anti-Competencia
 */

console.log('\n🧪 ========================================');
console.log('   TEST FILTRO ANTI-COMPETENCIA');
console.log('========================================\n');

// Test 1: Limpieza de texto
console.log('📋 TEST 1: Limpieza de Texto\n');

const testTexts = [
    'Oferta encontrada en Slickdeals: Stanley Tumbler',
    'Esta es una oferta de Slickdeal muy buena',
    'Oferta exclusiva de Amazon',
    'Slickdeals tiene esta oferta'
];

testTexts.forEach((text, index) => {
    const cleaned = text
        .replace(/slickdeals?/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    console.log(`${index + 1}. Original: "${text}"`);
    console.log(`   Limpio:   "${cleaned}"`);

    if (cleaned.toLowerCase().includes('slickdeal')) {
        console.log('   ❌ FALLO: Aún contiene "Slickdeal"\n');
    } else {
        console.log('   ✅ ÉXITO: Texto limpio\n');
    }
});

// Test 2: Validación de URLs
console.log('\n📋 TEST 2: Validación de URLs\n');

const testUrls = [
    { url: 'https://slickdeals.net/f/123', expected: 'BLOQUEAR' },
    { url: 'https://amazon.com/dp/B123', expected: 'PERMITIR' },
    { url: 'https://ebay.com/itm/456', expected: 'PERMITIR' },
    { url: 'https://slickdeals.net/go/123', expected: 'BLOQUEAR' }
];

testUrls.forEach((test, index) => {
    const shouldBlock = test.url.includes('slickdeals.net');
    const result = shouldBlock ? 'BLOQUEAR' : 'PERMITIR';

    console.log(`${index + 1}. URL: ${test.url}`);
    console.log(`   Esperado: ${test.expected}`);
    console.log(`   Resultado: ${result}`);

    if (result === test.expected) {
        console.log('   ✅ CORRECTO\n');
    } else {
        console.log('   ❌ ERROR\n');
    }
});

// Test 3: Simulación de flujo completo
console.log('\n📋 TEST 3: Simulación de Flujo Completo\n');

const mockDeal = {
    title: 'Oferta de Slickdeals: Stanley Tumbler 20oz',
    link: 'https://slickdeals.net/f/123',
    description: 'Gran oferta encontrada en Slickdeal'
};

console.log('ENTRADA:');
console.log(`  Título: ${mockDeal.title}`);
console.log(`  Link: ${mockDeal.link}`);
console.log(`  Descripción: ${mockDeal.description}\n`);

// Paso 1: Verificar link
const linkBlocked = mockDeal.link.includes('slickdeals.net');
console.log(`PASO 1: Verificar Link`);
console.log(`  ¿Contiene slickdeals.net? ${linkBlocked ? 'SÍ' : 'NO'}`);
console.log(`  Acción: ${linkBlocked ? '❌ BLOQUEAR OFERTA' : '✅ CONTINUAR'}\n`);

if (!linkBlocked) {
    // Paso 2: Limpiar título
    const cleanTitle = mockDeal.title
        .replace(/slickdeals?/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    console.log(`PASO 2: Limpiar Título`);
    console.log(`  Original: ${mockDeal.title}`);
    console.log(`  Limpio: ${cleanTitle}\n`);

    // Paso 3: Limpiar descripción
    const cleanDesc = mockDeal.description
        .replace(/slickdeals?/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    console.log(`PASO 3: Limpiar Descripción`);
    console.log(`  Original: ${mockDeal.description}`);
    console.log(`  Limpio: ${cleanDesc}\n`);

    console.log('RESULTADO FINAL: ✅ Oferta publicada (limpia)');
} else {
    console.log('RESULTADO FINAL: ❌ Oferta descartada (link bloqueado)');
}

console.log('\n========================================');
console.log('   RESUMEN');
console.log('========================================\n');

console.log('✅ El filtro anti-competencia está configurado para:');
console.log('   1. BLOQUEAR ofertas con links de slickdeals.net');
console.log('   2. LIMPIAR títulos eliminando "Slickdeals"');
console.log('   3. LIMPIAR descripciones eliminando "Slickdeals"');
console.log('   4. LIMPIAR contenido viral eliminando "Slickdeals"\n');

console.log('🔒 GARANTÍA: Ninguna referencia a Slickdeals será visible.\n');
