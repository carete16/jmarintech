const RSSParser = require('rss-parser');
const logger = require('../utils/logger');

class SlickRSSCollector {
    constructor() {
        // Obtenemos el feed de "Frontpage" que son las ofertas ya votadas por la comunidad (Calidad Superior)
        this.url = 'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1';
        this.parser = new RSSParser();
    }

    async getDeals() {
        try {
            logger.info('🛰️ Iniciando recolección de Élite (Frontpage Slickdeals)...');
            const feed = await this.parser.parseURL(this.url);
            const deals = [];

            for (const item of feed.items) {
                let title = item.title;
                let link = item.link;

                if (!link || !link.startsWith('http')) continue;

                // 1. Extraer precio del título ($XX.XX)
                const priceMatch = title.match(/\$(\d+(\.\d{2})?)/);
                const offerPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;

                // 2. Extraer imagen del contenido con una expresión regular más robusta
                let image = 'https://wsrv.nl/?url=https://slickdeals.net/favicon.ico&w=256';
                const imgMatch = item.content?.match(/src="([^"]+)"/);
                if (imgMatch && imgMatch[1]) {
                    image = imgMatch[1].replace(/&amp;/g, '&');
                }

                // 3. Limpiar el título de etiquetas Slickdeals
                const cleanedTitle = title.replace(/Slickdeals/gi, '').replace(/\[.*\]/g, '').trim();

                deals.push({
                    title: cleanedTitle,
                    sourceLink: link,
                    referencePrice: offerPrice,
                    image: image,
                    tienda: 'Slickdeals' // Será refinado por el validador
                });
            }

            logger.info(`✅ ${deals.length} oportunidades detectadas en el radar.`);
            return deals;
        } catch (error) {
            logger.error(`❌ Error en SlickRSSCollector: ${error.message}`);
            return [];
        }
    }
}

module.exports = new SlickRSSCollector();
