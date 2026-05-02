/**
 * TEST SUITE AUTOMATIZADO
 * Ejecuta pruebas completas del sistema y genera reporte
 */

const QA = require('./src/utils/QualityAssurance');
const fs = require('fs');

async function runTests() {
    console.log('\n🧪 INICIANDO TEST SUITE AUTOMATIZADO\n');
    console.log('='.repeat(80));

    const results = [];

    // TEST 1: Health Check del sistema
    console.log('\n📋 TEST 1: Health Check del Sistema');
    console.log('-'.repeat(80));

    const healthReport = await QA.healthCheck();
    console.log(healthReport);
    results.push(healthReport);

    // TEST 2: Validación de ofertas individuales
    console.log('\n\n📋 TEST 2: Validación Individual de Ofertas');
    console.log('-'.repeat(80));

    try {
        const axios = require('axios');
        const response = await axios.get('https://masbaratodeals.onrender.com/api/deals');
        const deals = response.data;

        // Probar 10 ofertas aleatorias
        const sample = deals.sort(() => 0.5 - Math.random()).slice(0, 10);

        let passedCount = 0;
        let failedCount = 0;

        for (const deal of sample) {
            const validation = await QA.validateOffer(deal);
            console.log(validation.report);

            if (validation.passed) {
                passedCount++;
            } else {
                failedCount++;
            }

            results.push(validation.report);
        }

        console.log('\n' + '='.repeat(80));
        console.log(`\n📊 RESUMEN DE VALIDACIÓN:`);
        console.log(`   Aprobadas: ${passedCount}/10`);
        console.log(`   Rechazadas: ${failedCount}/10`);
        console.log(`   Tasa de éxito: ${passedCount / 10 * 100}%`);

    } catch (error) {
        console.error(`\n❌ Error en validación: ${error.message}`);
        results.push(`ERROR: ${error.message}`);
    }

    // TEST 3: Verificación de monetización
    console.log('\n\n📋 TEST 3: Verificación de Monetización');
    console.log('-'.repeat(80));

    try {
        const axios = require('axios');
        const response = await axios.get('https://masbaratodeals.onrender.com/api/deals');
        const deals = response.data;

        let monetizedCount = 0;
        const requiredTag = 'masbaratodeal-20';

        for (const deal of deals) {
            if (deal.link.includes(requiredTag) ||
                deal.link.includes('viglink') ||
                deal.link.includes('rover.ebay')) {
                monetizedCount++;
            }
        }

        const monetizationRate = (monetizedCount / deals.length * 100).toFixed(2);

        console.log(`   Total ofertas: ${deals.length}`);
        console.log(`   Monetizadas: ${monetizedCount}`);
        console.log(`   Tasa de monetización: ${monetizationRate}%`);

        if (monetizationRate >= 95) {
            console.log(`   ✅ EXCELENTE - Monetización óptima`);
        } else if (monetizationRate >= 80) {
            console.log(`   ⚠️  ACEPTABLE - Revisar ofertas sin monetizar`);
        } else {
            console.log(`   ❌ CRÍTICO - Muchas ofertas sin monetizar`);
        }

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
    }

    // Guardar reporte
    const reportPath = 'TEST_REPORT_' + Date.now() + '.txt';
    fs.writeFileSync(reportPath, results.join('\n\n'));

    console.log('\n' + '='.repeat(80));
    console.log(`\n📄 Reporte completo guardado en: ${reportPath}`);
    console.log('\n✅ TEST SUITE COMPLETADO\n');
}

runTests().catch(console.error);
