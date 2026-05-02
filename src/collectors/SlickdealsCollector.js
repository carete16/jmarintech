const axios = require('axios');
const logger = require('../utils/logger');

class SlickdealsCollector {
    constructor() {
        // Reddit r/deals es una fuente inagotable de productos USA de alta calidad
        // Es mucho más estable que Slickdeals para scraping directo.
        this.url = 'https://www.reddit.com/r/deals/new/.json?limit=25';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MasbaratoBot/2.0'
        };
    }

    extractAsin(url) {
        if (!url) return null;
        const match = url.match(/\/([A-Z0-9]{10})(?:[\/?]|$)/);
        return match ? match[1] : null;
    }

    async getDeals() {
        try {
            logger.info('Recolectando ofertas USA Premium (Reddit Engine)...');
            const response = await axios.get(this.url, { headers: this.headers });
            const items = response.data.data.children;
            const deals = [];

            for (const item of items) {
                const data = item.data;
                const title = data.title;

                // Solo nos interesan ofertas de USA (filtramos por tiendas conocidas o etiquetas)
                const isUSA = title.toLowerCase().includes('amazon') ||
                    title.toLowerCase().includes('walmart') ||
                    title.toLowerCase().includes('usa') ||
                    data.url.includes('amazon.com');

                if (!isUSA) continue;

                const priceMatch = title.match(/\$(\d+(\.\d{2})?)/);
                const offerPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;

                // Extraer precio ANTERIOR (Was $XX)
                let originalPrice = 0;

                // Patrones comunes en Reddit r/deals: "was $XX", "$XX -> $YY", "List: $XX"
                const wasMatch = title.match(/(?:was|list|reg|regular)\:?\s*\$(\d+(\.\d{2})?)/i);

                if (wasMatch) {
                    originalPrice = parseFloat(wasMatch[1]);
                }

                // Detección de Mínimo Histórico en Reddit
                const isAllTimeLow = /lowest|all[\s-]time[\s-]low|ATL|best[\s-]price|historic/i.test(title);

                // Eliminado fallback artificial 1.25x
                // if (originalPrice === 0 && offerPrice > 0) {
                //    originalPrice = parseFloat((offerPrice * 1.25).toFixed(2));
                // }

                const asin = this.extractAsin(data.url) || this.extractAsin(data.title);
                let imageUrl = data.thumbnail && data.thumbnail.startsWith('http') ? data.thumbnail : '';

                // MOTOR DE IMAGENES HD AMAZON
                if (asin) {
                    imageUrl = `https://m.media-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`;
                } else if (data.preview && data.preview.images && data.preview.images[0]) {
                    imageUrl = data.preview.images[0].source.url.replace(/&amp;/g, '&');
                }

                // Validar imagen
                if (!imageUrl || imageUrl.includes('default') || imageUrl.includes('self')) {
                    if (asin) {
                        imageUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`;
                    } else continue;
                }

                // Determinar tienda real
                let realTienda = 'USA Store';
                const lowerTitle = title.toLowerCase();
                if (lowerTitle.includes('amazon')) realTienda = 'Amazon USA';
                else if (lowerTitle.includes('ebay')) realTienda = 'eBay';
                else if (lowerTitle.includes('walmart')) realTienda = 'Walmart';
                else if (lowerTitle.includes('best buy') || lowerTitle.includes('bestbuy')) realTienda = 'Best Buy';

                // Score base (Reddit Ups) + Bonus por Mínimo Histórico
                let score = data.ups || 10;
                if (isAllTimeLow) score += 50; // Bonus por ser mínimo histórico

                deals.push({
                    id: `rd_${data.id}`,
                    title: title.split(' - ')[0].replace(/\[.*?\]/g, '').trim(),
                    price_offer: offerPrice,
                    price_official: originalPrice,
                    link: data.url,
                    image: imageUrl,
                    tienda: realTienda,
                    categoria: 'Tecnología',
                    score: score,
                    is_historic_low: isAllTimeLow
                });

                if (deals.length >= 10) break;
            }

            logger.info(`SlickdealsCollector: Se obtuvieron ${deals.length} ofertas USA de alta calidad.`);
            return deals;
        } catch (error) {
            logger.error(`Error en RedditCollector: ${error.message}`);
            return this.getMockDeals();
        }
    }

    getMockDeals() {
        return [
            {
                id: 'mock_usa_1',
                title: 'Apple AirPods Pro (2nd Gen) with MagSafe Case (USB-C)',
                price_offer: 189,
                price_official: 249,
                link: 'https://www.amazon.com/dp/B0CHWRXH8B',
                image: 'https://m.media-amazon.com/images/I/61f1Yf71HeL._AC_SX679_.jpg',
                tienda: 'Amazon USA',
                categoria: 'Tecnología',
                score: 245
            },
            {
                id: 'mock_usa_2',
                title: 'Samsung 990 PRO SSD 2TB PCIe 4.0 NVMe Gen4 Gaming',
                price_offer: 149,
                price_official: 219,
                link: 'https://www.amazon.com/dp/B0BHJJ9Y77',
                image: 'https://m.media-amazon.com/images/I/71Y8S9dO15L._AC_SX679_.jpg',
                tienda: 'Amazon USA',
                categoria: 'Tecnología',
                score: 180
            }
        ];
    }
}

module.exports = new SlickdealsCollector();
