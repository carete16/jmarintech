const Parser = require('rss-parser');
const parser = new Parser();
const logger = require('../utils/logger');

class GlobalDealsCollector {
    constructor() {
        // 🌍 LAS ARTERIAS DEL AHORRO (Fuentes RSS)
        this.sources = [
            { id: 'Slickdeals Frontpage', url: 'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1', category: 'General' },
            { id: 'TechBargains', url: 'https://www.techbargains.com/rss', category: 'Tecnología' },
            { id: 'BensBargains', url: 'https://bensbargains.com/rss/', category: 'Hogar' },
            // { id: 'Newegg Daily', url: 'https://www.newegg.com/rss/dailydeals.xml', category: 'Tecnología' } // Comentado por si falla formato
        ];
    }

    async getDeals() {
        let allDeals = [];
        logger.info(`🌐 GlobalDealsCollector: Escaneando ${this.sources.length} fuentes gigantes...`);

        const promises = this.sources.map(source => this.fetchSource(source));
        const results = await Promise.allSettled(promises);

        results.forEach(res => {
            if (res.status === 'fulfilled') {
                allDeals = allDeals.concat(res.value);
            }
        });

        // Ordenar por fecha (más reciente primero) para priorizar frescura
        return allDeals.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    }

    async fetchSource(source) {
        try {
            const feed = await parser.parseURL(source.url);
            logger.info(`✅ ${source.id}: ${feed.items.length} ofertas encontradas.`);

            return feed.items.map(item => {
                // Normalización inteligente de datos según la fuente
                let price = 0;
                let originalPrice = 0;
                let image = null;

                // 1. Extracción de PRECIO (Regex Universal)
                const content = item.content || item['content:encoded'] || item.snippet || '';
                const title = item.title;

                // Intentar sacar precio del título (ej: "Laptop - $499")
                const priceMatch = title.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
                if (priceMatch) {
                    price = parseFloat(priceMatch[1].replace(',', ''));
                    // Estimación precio original (si hay otro precio mayor tachado o mencionado)
                    // (Simplificado: asumimos un 20% más si no se detecta)
                    // originalPrice = price * 1.2; // Eliminado para evitar falsos descuentos del 17%
                }

                // 2. Extracción de IMAGEN
                // Slickdeals usa media:content, otros usan img src en content
                if (item['media:content']) {
                    image = item['media:content']['$']?.url;
                } else {
                    const imgMatch = content.match(/src="([^"]+)"/);
                    if (imgMatch) image = imgMatch[1];
                }

                return {
                    id: item.guid || item.link, // ID Único
                    title: this.cleanTitle(title),
                    link: item.link,
                    image: image,
                    price_offer: price,
                    price_official: originalPrice,
                    description: this.cleanDescription(content),
                    pubDate: item.pubDate,
                    origin: source.id,
                    tienda: 'Tienda USA', // Se refinará en CoreProcessor
                    categoria: source.category,
                    score: 99 // Damos score alto por defecto si viene de estos sitios curados
                };
            });
        } catch (error) {
            logger.error(`❌ Error leyendo ${source.id}: ${error.message}`);
            return [];
        }
    }

    cleanTitle(title) {
        // Limpia basura típica de RSS
        return title.replace(/&amp;/g, '&').replace(/\[.*?\]/g, '').trim();
    }

    cleanDescription(html) {
        // Quita etiquetas HTML para tener texto limpio para la IA
        return html.replace(/<[^>]*>?/gm, '').substring(0, 500) + '...';
    }
}

module.exports = new GlobalDealsCollector();
