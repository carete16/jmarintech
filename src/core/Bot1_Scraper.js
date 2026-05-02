const axios = require('axios');
const RSSParser = require('rss-parser');
const parser = new RSSParser({
    customFields: {
        item: ['vendorname', 'imagelink', 'description'],
    }
});
const logger = require('../utils/logger');

/**
 * BOT 1: EL RADAR (Referencia de Mercado)
 * Detecta oportunidades basándose en múltiples fuentes RSS de USA.
 */
class RadarBot {
    constructor() {
        this.sources = [
            // FUENTES DE TECNOLOGÍA PURA
            { name: 'TechBargains Tech', url: 'https://feeds.feedburner.com/Techbargains' },
            { name: 'eBay Refurbished Laptops', url: 'https://www.ebay.com/sch/i.html?_nkw=refurbished+laptop&_rss=1' },
            { name: 'eBay PC Towers', url: 'https://www.ebay.com/sch/i.html?_nkw=gaming+pc+desktop&_rss=1' },
            { name: 'eBay Monitors', url: 'https://www.ebay.com/sch/i.html?_nkw=gaming+monitor&_rss=1' },
            { name: 'eBay Cell Phones', url: 'https://www.ebay.com/sch/i.html?_nkw=iphone+samsung+galaxy+unlocked&_rss=1' },
            { name: 'MicroCenter Deals', url: 'https://www.microcenter.com/rss/all_deals.xml' },
            { name: 'BensBargains Tech', url: 'https://bensbargains.com/categories/all/rss/' }
        ];

        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
        ];
    }

    async getMarketOpportunities() {
        let allOpportunities = [];
        logger.info(`📡 Iniciando escaneo multi-radar (${this.sources.length} fuentes)`);

        for (const source of this.sources) {
            try {
                logger.info(`🔍 Escaneando: ${source.name}...`);

                let response;
                let errorOccurred = false;

                try {
                    response = await axios.get(source.url, {
                        headers: {
                            'User-Agent': this.userAgents[0],
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Cache-Control': 'no-cache'
                        },
                        timeout: 10000
                    });
                } catch (e) {
                    if (e.response && e.response.status === 403) {
                        // Silenciar errores 403 para no molestar al usuario según su petición
                        logger.warn(`🔇 Fuente ${source.name} temporalmente inaccesible (403). Moviendo a la siguiente.`);
                        errorOccurred = true;
                    } else {
                        logger.warn(`⚠️ Error en fuente ${source.name}: ${e.message}`);
                        errorOccurred = true;
                    }
                }

                if (errorOccurred || !response) continue;

                const feed = await parser.parseString(response.data);
                let count = 0;

                for (const item of feed.items) {
                    try {
                        const opp = await this.parseReference(item, source.name);
                        if (opp && this.validateReference(opp)) {
                            allOpportunities.push(opp);
                            count++;
                        }
                    } catch (e) { }
                }
                logger.info(`✅ ${source.name}: ${count} potenciales encontradas.`);
            } catch (error) { }
        }

        const uniqueOpps = [];
        const seen = new Set();
        for (const opp of allOpportunities) {
            const key = (opp.title || '').substring(0, 30).toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueOpps.push(opp);
            }
        }

        logger.info(`🏆 Escaneo completado. Total oportunidades únicas: ${uniqueOpps.length}`);
        return uniqueOpps;
    }

    async parseReference(item, sourceName) {
        try {
            const title = item.title || '';
            const link = item.link || item.guid || '';

            let priceOffer = 0;
            const priceMatch = title.match(/\$(\d{1,5}(?:\.\d{2})?)/);
            if (priceMatch) {
                priceOffer = parseFloat(priceMatch[1]);
            }

            let storeName = item.vendorname || 'USA Store';
            const lowTitle = title.toLowerCase();
            const lowLink = link.toLowerCase();

            if (storeName === 'Global' || storeName === 'USA Store' || storeName === 'Marketplace') {
                if (lowTitle.includes('amazon') || lowLink.includes('amazon.com')) storeName = 'Amazon';
                else if (lowTitle.includes('walmart') || lowLink.includes('walmart.com')) storeName = 'Walmart';
                else if (lowTitle.includes('ebay') || lowLink.includes('ebay.com')) storeName = 'eBay';
                else if (lowTitle.includes('target') || lowLink.includes('target.com')) storeName = 'Target';
                else if (lowTitle.includes('best buy') || lowTitle.includes('bestbuy')) storeName = 'Best Buy';
                else if (lowTitle.includes('newegg')) storeName = 'Newegg';
                else if (lowTitle.includes('home depot') || lowTitle.includes('homedepot')) storeName = 'Home Depot';
                else if (lowTitle.includes('micro center') || lowTitle.includes('microcenter')) storeName = 'Micro Center';
                else if (lowTitle.includes('nike')) storeName = 'Nike';
                else if (lowTitle.includes('adidas')) storeName = 'Adidas';
            }

            // --- BLOQUEO PROACTIVO DE TIENDAS DE SERVICIOS (Evitar spam) ---
            const storeBlacklist = ['NordVPN', 'Disney+', 'IPVanish', 'AT&T', 'WSJ', 'CIT Bank', 'Bitdefender', 'Surfshark', 'McAfee', 'Norton'];
            if (storeBlacklist.some(s => storeName.includes(s) || lowTitle.includes(s.toLowerCase()))) {
                return null;
            }

            let imageUrl = item.imagelink || '';
            if (!imageUrl && (item.content || item.description)) {
                const content = item.content || item.description;
                const imgMatch = content.match(/src="([^"]+\.(?:jpg|png|jpeg|webp)[^"]*)"/i);
                if (imgMatch) imageUrl = imgMatch[1];
            }

            let category = 'General';

            // --- FILTRO DE NICHO (Solo lo que el usuario pidió) ---
            const techKeywords = /laptop|portatil|desktop|pc|torre|tower|monitor|display|phone|iphone|galaxy|pixel|celular|smartphone|tablet|ipad/i;
            if (!lowTitle.match(techKeywords)) {
                return null; // Omitir cualquier cosa que no sea tecnología solicitada
            }

            // --- CATEGORIZACIÓN SIMPLIFICADA ---
            category = 'Tecnología';

            const cleanTitle = title.replace(/\s*\$\d+\.?\d*\s*$/, '').trim();

            return {
                title: cleanTitle,
                sourceLink: link,
                referencePrice: priceOffer,
                msrp: 0,
                tienda: storeName,
                categoria: category,
                image: imageUrl,
                description: item.contentSnippet || item.content || item.description || '',
                pubDate: item.pubDate,
                source: sourceName
            };
        } catch (error) {
            return null;
        }
    }

    async searchProduct(query) {
        // --- CAPA DE TRADUCCIÓN INTELIGENTE (Español -> Inglés) ---
        let searchTerms = query.toLowerCase();
        const translations = {
            'consola': 'console',
            'portatil': 'laptop',
            'celular': 'phone',
            'audifonos': 'headphones',
            'reloj': 'watch',
            'zapatos': 'shoes',
            'tenis': 'sneakers',
            'camara': 'camera',
            'juego': 'game',
            'parlante': 'speaker'
        };
        
        Object.keys(translations).forEach(key => {
            searchTerms = searchTerms.replace(new RegExp(key, 'g'), translations[key]);
        });

        logger.info(`🔍 Iniciando búsqueda dirigida en USA para: "${searchTerms}" (Original: "${query}")`);
        const searchSources = [
            { name: 'eBay Search', url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerms)}&_rss=1` },
            { name: 'Best Buy Search', url: `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(searchTerms)}` },
            { name: 'Newegg Search', url: `https://www.newegg.com/p/pl?d=${encodeURIComponent(query)}` },
            { name: 'Amazon Search (Ref)', url: `https://feeds.feedburner.com/Techbargains?q=${encodeURIComponent(query)}` },
            { name: 'Walmart Search (Ref)', url: `https://www.dealnews.com/c142/z0/f/rss.html?q=${encodeURIComponent(query)}` }
        ];

        let results = [];
        const DeepScraper = require('../utils/DeepScraper');

        for (const source of searchSources) {
            try {
                // Para fuentes RSS (eBay, TechBargains, DealNews)
                if (source.url.includes('_rss=1') || source.url.includes('feeds.') || source.url.includes('rss')) {
                    const response = await axios.get(source.url, {
                        headers: { 'User-Agent': this.userAgents[0] },
                        timeout: 10000
                    });
                    
                    if (response.data) {
                        const feed = await parser.parseString(response.data);
                        for (const item of feed.items) {
                            const opp = await this.parseReference(item, source.name);
                            // Filtro más flexible: cualquier palabra clave importante
                            const keywords = searchTerms.split(' ').filter(w => w.length > 3);
                            const matches = keywords.length === 0 || keywords.some(k => opp.title.toLowerCase().includes(k));
                            
                            if (opp && matches) {
                                results.push(opp);
                            }
                        }
                    }
                } 
                // Para fuentes que requieren Deep Scraper (Best Buy, Newegg)
                else {
                    const data = await DeepScraper.scrape(source.url);
                    if (data && data.offerPrice > 0) {
                        results.push({
                            title: data.title,
                            sourceLink: data.finalUrl,
                            referencePrice: data.offerPrice,
                            tienda: source.name.replace(' Search', ''),
                            image: data.image,
                            source: source.name
                        });
                    }
                }
            } catch (e) {
                logger.warn(`⚠️ Error buscando en ${source.name}: ${e.message}`);
            }
        }

        // Ordenar por precio más bajo garantizado
        return results
            .filter(r => r.referencePrice > 0)
            .sort((a, b) => a.referencePrice - b.referencePrice)
            .slice(0, 15);
    }

    validateReference(opp) {
        return opp.title && opp.sourceLink;
    }
}

module.exports = new RadarBot();
