const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const LinkResolver = require('../utils/LinkResolver');
const DeepScraper = require('../utils/DeepScraper');
const AIProcessor = require('./AIProcessor');

// PREVENIR CIERRES POR ERRORES NO CONTROLADOS (ESTABILIDAD CRÍTICA)
process.on('uncaughtException', (err) => {
    logger.error(`🔥 UNCAUGHT EXCEPTION: ${err.message}`);
    // No matamos el proceso, solo lo logueamos
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`🔥 UNHANDLED REJECTION: ${reason}`);
});

/**
 * BOT 2: EL EXPLORADOR (VALIDADOR ESTRICTO)
 */
class ValidatorBot {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
    }

    async validate(opportunity) {
        logger.info(`🔍 Validando Disponibilidad: ${opportunity.title.substring(0, 50)}...`);

        let result = {
            isValid: false,
            realPrice: null,
            officialPrice: 0,
            hasStock: false,
            image: opportunity.image,
            title: opportunity.title,
            finalUrl: opportunity.sourceLink,
            storeName: opportunity.tienda || 'Tienda USA',
            categoria: opportunity.categoria || 'Lifestyle & Street',
            weight: opportunity.weight || 0
        };

        try {
            // 1. Resolver link
            const finalUrl = await LinkResolver.resolve(opportunity.sourceLink);
            result.finalUrl = finalUrl;

            // 2. Tienda
            if (finalUrl.includes('amazon.com')) result.storeName = 'Amazon';
            else if (finalUrl.includes('walmart.com')) result.storeName = 'Walmart';
            else if (finalUrl.includes('ebay.com')) result.storeName = 'eBay';
            else if (finalUrl.includes('nike.com')) result.storeName = 'Nike';
            else {
                try {
                    const domain = new URL(finalUrl).hostname.replace('www.', '');
                    result.storeName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
                } catch (e) { result.storeName = 'Tienda USA'; }
            }

            // 3. Scrape Profundo
            const deepData = await DeepScraper.scrape(finalUrl);
            const providedPrice = opportunity.price_offer || opportunity.referencePrice || 0;

            if (deepData && (deepData.offerPrice > 0 || (result.storeName !== 'Amazon' && providedPrice > 0))) {
                if (deepData.isUnavailable) {
                    logger.warn(`❌ AGOTADO: ${opportunity.title}`);
                    return result;
                }

                result.realPrice = deepData.offerPrice || providedPrice;
                result.officialPrice = deepData.officialPrice || opportunity.msrp || 0;
                result.hasStock = true;
                result.isValid = true;
                result.weight = deepData.weight || 0;
                if (deepData.image) result.image = deepData.image;
                if (deepData.gallery) result.gallery = deepData.gallery;
                if (deepData.title) {
                    result.title = await AIProcessor.generateOptimizedTitle(deepData.title);
                }
            } else if (opportunity.isManual) {
                // Modo Rescate para Manual
                result.isValid = true;
                result.hasStock = true;
                result.realPrice = providedPrice;

                // Rescate de Título si falla
                if (!result.title || result.title.includes('Manual') || result.title.length < 5) {
                    try {
                        const pathParts = new URL(result.finalUrl).pathname.split('/').filter(p => p.length > 5);
                        if (pathParts[0]) {
                            const raw = pathParts[0].replace(/-/g, ' ');
                            result.title = await AIProcessor.generateOptimizedTitle(raw);
                        }
                    } catch (e) { }
                }
            } else if (providedPrice > 0 && opportunity.image) {
                // Fallback RSS básico
                result.isValid = true;
                result.hasStock = true;
                result.realPrice = providedPrice;
            }

            // --- IA DE CATEGORÍA Y PESO (SHIPPING WEIGHT USA) ---
            if (result.isValid) {
                const t = result.title.toLowerCase();

                // Categoría
                if (t.match(/laptop|macbook|computer|ssd|cpu|gpu|monitor|keyboard|mouse|headset|gaming|tech/)) {
                    result.categoria = "Electrónica Premium";
                } else if (t.match(/watch|reloj|smartwatch|apple watch|galaxy watch|casio|invicta/)) {
                    result.categoria = "Relojes & Wearables";
                } else {
                    result.categoria = "Lifestyle & Street";
                }

                // Peso con Empaque (LBS)
                if (!result.weight || result.weight <= 0) {
                    if (t.includes('laptop') || t.includes('macbook')) result.weight = 6.5;
                    else if (t.includes('monitor')) {
                        if (t.includes('27')) result.weight = 17.0;
                        else result.weight = 13.0;
                    }
                    else if (t.includes('iphone') || t.includes('phone') || t.includes('smartphone')) result.weight = 1.5;
                    else if (t.includes('tablet') || t.includes('ipad')) result.weight = 3.0;
                    else if (t.includes('watch') || t.includes('smartwatch')) result.weight = 1.0;
                    else if (t.match(/shoe|sneaker|tenis|nike|adidas/)) result.weight = 5.0;
                    else if (t.includes('headphone') || t.includes('earbuds')) result.weight = 1.2;
                    else if (t.includes('perfume') || t.includes('cologne')) result.weight = 2.0;
                    else if (t.includes('keyboard')) result.weight = 4.0;
                    else if (t.includes('backpack')) result.weight = 4.5;
                    else if (t.includes('camera')) result.weight = 6.0;
                    else result.weight = 3.5;

                    logger.info(`⚖️ IA SHIPPING (USA LBS): ${result.weight} lbs en "${result.title}"`);
                }
            }

            return result;
        } catch (error) {
            logger.error(`❌ Error en ValidatorBot: ${error.message}`);
            return result;
        }
    }

    cleanPrice(text) {
        if (!text) return 0;
        const cleaned = text.replace(/[^0-9,.]/g, '').replace(',', '');
        const price = parseFloat(cleaned);
        return isNaN(price) ? 0 : price;
    }
}

module.exports = new ValidatorBot();
