const axios = require('axios');
const logger = require('../utils/logger');

/**
 * BOT 5: BROWSER SIMULATOR (El Fantasma)
 * Su misión: Obtener el link final de la tienda usando ingeniería inversa 
 * sobre los endpoints de redirección de Slickdeals.
 */
class BrowserSimulator {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    }

    async extractRealLink(slickdealsUrl) {
        logger.info(`👻 BOT 5 (Fantasma) entrando en acción para: ${slickdealsUrl.substring(0, 50)}...`);

        try {
            // Extraer ID de la oferta
            const dealIdMatch = slickdealsUrl.match(/\/f\/(\d+)/);
            if (!dealIdMatch) return { success: false };
            const dealId = dealIdMatch[1];

            // ESTRATEGIA: REDIRECCIÓN POR CABECERAS (HEAD Request)
            // Intentamos engañar a Slickdeals usando endpoints de marketing/app
            const magicEndpoints = [
                `https://slickdeals.net/f/${dealId}?p=1&utm_source=dealalerts`,
                `https://slickdeals.net/f/${dealId}?utm_source=rss-portal`,
                `https://slickdeals.net/f/${dealId}?p=1`
            ];

            for (const endpoint of magicEndpoints) {
                try {
                    const res = await axios.get(endpoint, {
                        maxRedirects: 10,
                        timeout: 15000,
                        headers: {
                            'User-Agent': this.userAgent,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Referer': 'https://www.google.com/'
                        }
                    });

                    let finalUrl = res.request?.res?.responseUrl || res.config?.url;

                    // 1. ÉXITO POR REDIRECCIÓN DIRECTA
                    if (finalUrl && !finalUrl.includes('slickdeals.net') && !finalUrl.includes('google.com')) {
                        finalUrl = this.deepClean(finalUrl);
                        logger.info(`💎 BOT 5 EXTRACCIÓN DIRECTA: ${finalUrl.substring(0, 40)}...`);
                        return { success: true, link: finalUrl };
                    }

                    // 2. ÉXITO POR ESCANEO DE HTML (Si la redirección se detuvo en Slickdeals)
                    const html = res.data;
                    if (typeof html === 'string') {
                        const patterns = [
                            /https?:\/\/(?:www\.)?amazon\.com\/(?:dp|gp\/product)\/[A-Z0-9]{10}/i,
                            /https?:\/\/(?:www\.)?walmart\.com\/ip\/[^"'\s<>\[\]]+\/\d+/i,
                            /https?:\/\/(?:www\.)?ebay\.com\/itm\/\d+/i,
                            /https?:\/\/(?:www\.)?bestbuy\.com\/site\/[^"'\s<>\[\]]+\/\d+\.p/i,
                            /https?:\/\/(?:www\.)?target\.com\/p\/[^"'\s<>\[\]]+\/-\/A-\d+/i,
                            /[?&]u2=([^"'\s&<>\[\]]+)/i
                        ];

                        for (const pattern of patterns) {
                            const match = html.match(pattern);
                            if (match) {
                                let found = match[0];
                                if (match[1]) found = decodeURIComponent(match[1]); // Caso u2
                                if (found.startsWith('http') && !found.includes('slickdeals.net')) {
                                    logger.info(`🔍 BOT 5 EXTRACCIÓN POR ESCANEO HTML: ${found.substring(0, 40)}...`);
                                    return { success: true, link: this.deepClean(found) };
                                }
                            }
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            return { success: false };

        } catch (error) {
            logger.error(`❌ BOT 5 Error: ${error.message}`);
            return { success: false };
        }
    }

    deepClean(url) {
        try {
            const u = new URL(url);
            const clean = u.searchParams.get('u2') || u.searchParams.get('url') || u.searchParams.get('mpre') || u.searchParams.get('dest');
            return clean ? decodeURIComponent(clean) : url;
        } catch (e) {
            return url;
        }
    }
}

module.exports = new BrowserSimulator();
