const CoreProcessor = require('./src/core/CoreProcessor');
const AIProcessor = require('./src/core/AIProcessor');
const logger = require('./src/utils/logger');

// Mock para evitar llamadas reales a OpenAI y DB durante el test
AIProcessor.rewriteViral = async (deal, discount) => {
    const isHistoric = deal.isHistoricLow;
    if (isHistoric) {
        return `🚨 ¡MÍNIMO HISTÓRICO DETECTADO! Producto: ${deal.title} - Descuento: ${discount}% (SIMULADO)`;
    }
    return `🚀 Oferta Normal: ${deal.title} - Descuento: ${discount}% (SIMULADO)`;
};

console.log('\n🧪 ========================================');
console.log('   PRUEBA DE INTELIGENCIA DE PRECIOS');
console.log('========================================\n');

// Caso 1: Oferta Normal
const normalDeal = {
    title: 'Samsung SSD 1TB - $99',
    price_offer: 99,
    price_official: 120, // Calculado o extraído
    link: 'https://amazon.com/dp/test1',
    tienda: 'Amazon USA',
    score: 20,
    is_historic_low: false
};

// Caso 2: Oferta "All Time Low" (Detectada por Regex en Collector)
const historicDeal = {
    title: 'Apple iPad - Lowest price ever seen!', // El collector detecta esto
    price_offer: 250,
    price_official: 329,
    link: 'https://amazon.com/dp/test2',
    tienda: 'Amazon USA',
    score: 150, // Alto score
    is_historic_low: true // FLAG ACTIVADO
};

// Caso 3: Descuento bajo pero es Histórico (Ej. Apple 15%)
const appleDeal = {
    title: 'MacBook Air M2 - All time low',
    price_offer: 899,
    price_official: 999, // Solo 10% de descuento
    link: 'https://amazon.com/dp/test3',
    tienda: 'Amazon USA',
    score: 200,
    is_historic_low: true
};

async function runTest() {
    console.log('📊 ANALIZANDO CASO 1: Oferta Normal (Descuento moderado, sin flag)');
    await processSimulated(normalDeal);

    console.log('\n📊 ANALIZANDO CASO 2: GEMA DETECTADA (Flag Historic Low activado)');
    await processSimulated(historicDeal);

    console.log('\n📊 ANALIZANDO CASO 3: CASO ESPECIAL (Descuento bajo 10%, pero es Histórico)');
    await processSimulated(appleDeal);
}

async function processSimulated(deal) {
    const discount = Math.round(((deal.price_official - deal.price_offer) / deal.price_official) * 100);
    const isHistoric = deal.is_historic_low;

    // Lógica del CoreProcessor (Simulada para visualización)
    const minDiscount = 30;
    const minDiscountAdjusted = isHistoric ? 15 : minDiscount; // Ajuste dinámico

    // CORRECCIÓN: Permitir si es histórico incluso si el descuento es bajo, O si cumple criterio normal
    // En el código real: isLegendaryDeal || isHighDemand || isHistoricLow
    // El flag isHistoricLow DA EL PASE AUTOMÁTICO

    const passesFilter = (discount >= minDiscountAdjusted) || (deal.score >= 50) || isHistoric;

    console.log(`   Producto: ${deal.title}`);
    console.log(`   Descuento: ${discount}% (Umbral requerido: ${minDiscountAdjusted}%)`);
    console.log(`   Es Mínimo Histórico: ${isHistoric ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   ¿Pasa el filtro?: ${passesFilter ? '✅ APROBADO' : '❌ RECHAZADO'}`);

    if (passesFilter) {
        const viralMsg = await AIProcessor.rewriteViral({ ...deal, isHistoricLow: isHistoric }, discount);
        console.log(`   📝 Mensaje Generado: "${viralMsg}"`);
    }
}

runTest();
