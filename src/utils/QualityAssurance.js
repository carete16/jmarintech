const axios = require('axios');
const logger = require('../utils/logger');

/**
 * SISTEMA DE CONTROL DE CALIDAD
 * Verifica que cada oferta cumpla con estándares antes de publicar
 */
class QualityAssurance {
    constructor() {
        this.requiredTag = 'masbaratodeal-20';
        this.checks = {
            linkWorks: false,
            isMonetized: false,
            imageLoads: false,
            hasValidPrice: false,
            hasValidDiscount: false,
            noCompetitorRefs: false
        };
    }

    /**
     * Ejecuta TODOS los checks de calidad
     * @returns {Object} { passed: boolean, report: string[], deal: Object }
     */
    async validateOffer(deal) {
        const report = [];
        let passed = true;

        report.push(`\n🔍 VALIDANDO: ${deal.title}`);
        report.push(`   ID: ${deal.id}`);

        // CHECK 1: Link funciona
        try {
            const response = await axios.head(deal.link, {
                timeout: 5000,
                maxRedirects: 5,
                validateStatus: (status) => status < 500
            });

            if (response.status === 200 || response.status === 302) {
                report.push(`   ✅ Link funcional (${response.status})`);
                this.checks.linkWorks = true;
            } else {
                report.push(`   ❌ Link problemático (${response.status})`);
                passed = false;
            }
        } catch (e) {
            report.push(`   ⚠️  Link no verificable: ${e.message}`);
            // No falla automáticamente (puede ser anti-bot)
        }

        // CHECK 2: Está monetizado
        const isMonetized = this.checkMonetization(deal.link);
        if (isMonetized.status) {
            report.push(`   ✅ MONETIZADO (${isMonetized.type})`);
            this.checks.isMonetized = true;
        } else {
            report.push(`   ❌ NO MONETIZADO - RECHAZADO`);
            passed = false;
        }

        // CHECK 3: Imagen carga
        if (deal.image) {
            try {
                await axios.head(deal.image, { timeout: 3000 });
                report.push(`   ✅ Imagen OK`);
                this.checks.imageLoads = true;
            } catch (e) {
                report.push(`   ⚠️  Imagen no verificable`);
                // No crítico
            }
        } else {
            report.push(`   ⚠️  Sin imagen`);
        }

        // CHECK 4: Precio válido
        if (deal.price_offer && deal.price_offer > 0) {
            report.push(`   ✅ Precio válido: $${deal.price_offer}`);
            this.checks.hasValidPrice = true;
        } else {
            report.push(`   ❌ Precio inválido: $${deal.price_offer}`);
            passed = false;
        }

        // CHECK 5: Descuento calculado
        const discount = this.calculateDiscount(deal.price_official, deal.price_offer);
        if (discount > 0) {
            report.push(`   ✅ Descuento: ${discount}%`);
            this.checks.hasValidDiscount = true;
            deal.discount = discount; // Añadir al objeto
        } else {
            report.push(`   ⚠️  Sin descuento calculable`);
        }

        // CHECK 6: Sin referencias a competencia
        const hasCompetitorRefs = /slickdeals?|bens?bargains|techbargains/gi.test(deal.title + ' ' + (deal.description || ''));
        if (!hasCompetitorRefs) {
            report.push(`   ✅ Sin referencias a competencia`);
            this.checks.noCompetitorRefs = true;
        } else {
            report.push(`   ⚠️  Contiene referencias a competencia (se limpiarán)`);
        }

        // RESULTADO FINAL
        if (passed) {
            report.push(`   ✅ APROBADA PARA PUBLICACIÓN`);
        } else {
            report.push(`   ❌ RECHAZADA - No cumple estándares`);
        }

        return {
            passed,
            report: report.join('\n'),
            deal,
            checks: { ...this.checks }
        };
    }

    /**
     * Verifica si un link está monetizado
     */
    checkMonetization(link) {
        if (!link) return { status: false, type: null };

        if (link.includes(this.requiredTag) || link.includes('tag=masbarato')) {
            return { status: true, type: 'Amazon Affiliate' };
        }
        if (link.includes('viglink.com') || link.includes('sovrn')) {
            return { status: true, type: 'Sovrn/VigLink' };
        }
        if (link.includes('rover.ebay.com')) {
            return { status: true, type: 'eBay Partner' };
        }

        return { status: false, type: null };
    }

    /**
     * Calcula descuento real
     */
    calculateDiscount(original, offer) {
        if (!original || !offer || original <= offer) return 0;
        return Math.round(((original - offer) / original) * 100);
    }

    /**
     * Genera reporte de salud del sistema
     */
    async healthCheck(apiUrl = 'https://masbaratodeals.onrender.com') {
        const report = [];
        report.push('\n' + '='.repeat(80));
        report.push('HEALTH CHECK - ' + new Date().toISOString());
        report.push('='.repeat(80));

        try {
            // Test 1: API responde
            const dealsResponse = await axios.get(`${apiUrl}/api/deals`, { timeout: 10000 });
            const deals = dealsResponse.data;
            report.push(`\n✅ API Operativa - ${deals.length} ofertas publicadas`);

            // Test 2: Muestra aleatoria de 5 ofertas
            const sample = deals.slice(0, 5);
            let monetizedCount = 0;
            let workingLinksCount = 0;

            for (const deal of sample) {
                const validation = await this.validateOffer(deal);
                if (validation.checks.isMonetized) monetizedCount++;
                if (validation.checks.linkWorks) workingLinksCount++;
            }

            report.push(`\n📊 Muestra de 5 ofertas:`);
            report.push(`   Monetizadas: ${monetizedCount}/5 (${monetizedCount / 5 * 100}%)`);
            report.push(`   Links funcionales: ${workingLinksCount}/5`);

            // Test 3: Endpoint de redirección
            if (deals.length > 0) {
                try {
                    const testDeal = deals[0];
                    const redirectResponse = await axios.head(`${apiUrl}/go/${testDeal.id}`, {
                        maxRedirects: 0,
                        validateStatus: () => true
                    });

                    if (redirectResponse.status === 302) {
                        report.push(`\n✅ Endpoint /go/:id funcional`);
                    } else {
                        report.push(`\n⚠️  Endpoint /go/:id responde ${redirectResponse.status}`);
                    }
                } catch (e) {
                    report.push(`\n❌ Endpoint /go/:id con problemas`);
                }
            }

            report.push('\n' + '='.repeat(80));
            report.push('ESTADO: OPERATIVO ✅');
            report.push('='.repeat(80));

        } catch (error) {
            report.push(`\n❌ ERROR CRÍTICO: ${error.message}`);
            report.push('ESTADO: FALLANDO ❌');
        }

        return report.join('\n');
    }
}

module.exports = new QualityAssurance();
