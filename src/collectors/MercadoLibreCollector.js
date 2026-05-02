const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class MercadoLibreCollector {
    constructor() {
        this.url = 'https://www.mercadolibre.com.co/ofertas';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'es-CO,es;q=0.9',
        };
    }

    async getDeals() {
        try {
            logger.info('Solicitando ofertas de MercadoLibre (v2)...');
            const response = await axios.get(this.url, { headers: this.headers });
            const $ = cheerio.load(response.data);
            const deals = [];

            // Selector actualizado para la cuadrícula de ofertas de ML
            $('.promotion-item__container').each((i, element) => {
                if (i >= 15) return;

                const title = $(element).find('.promotion-item__title').text().trim();
                const link = $(element).find('a.promotion-item__link-container').attr('href');
                const originalPriceStr = $(element).find('.promotion-item__oldprice').text().trim();
                const offerPriceStr = $(element).find('.promotion-item__price').text().trim();

                const originalPrice = this.cleanPrice(originalPriceStr);
                const offerPrice = this.cleanPrice(offerPriceStr);

                if (title && link) {
                    deals.push({
                        id: `ml_${i}_${Date.now()}`,
                        nombre_producto: title,
                        price_offer: offerPrice || 0,
                        price_official: originalPrice || (offerPrice ? offerPrice * 1.3 : 0),
                        link: link,
                        tienda: 'MercadoLibre',
                        categoria: 'Ofertas'
                    });
                }
            });

            // Si falla el selector específico, probamos uno más genérico de tarjetas
            if (deals.length === 0) {
                $('.poly-card').each((i, element) => {
                    if (i >= 15) return;
                    const title = $(element).find('.poly-component__title').text().trim();
                    const link = $(element).find('.poly-component__title a').attr('href');
                    const offerPriceStr = $(element).find('.poly-price__current .andes-money-amount__fraction').first().text().trim();
                    const originalPriceStr = $(element).find('.poly-price__comparison .andes-money-amount__fraction').text().trim();

                    if (title && link) {
                        deals.push({
                            id: `ml_alt_${i}_${Date.now()}`,
                            nombre_producto: title,
                            price_offer: this.cleanPrice(offerPriceStr),
                            price_official: this.cleanPrice(originalPriceStr) || this.cleanPrice(offerPriceStr) * 1.3,
                            link: link,
                            tienda: 'MercadoLibre',
                            categoria: 'Ofertas'
                        });
                    }
                });
            }

            logger.info(`MercadoLibre: Extraídas ${deals.length} ofertas.`);
            return deals;
        } catch (error) {
            logger.error(`Error en MercadoLibreCollector: ${error.message}`);
            return [];
        }
    }

    cleanPrice(priceStr) {
        if (!priceStr) return null;
        const cleaned = priceStr.replace(/[^\d]/g, '');
        return cleaned ? parseFloat(cleaned) : null;
    }
}

module.exports = new MercadoLibreCollector();
