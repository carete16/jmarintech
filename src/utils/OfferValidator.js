const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('./logger');

class OfferValidator {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    /**
     * Valida si una oferta está viva y extrae metadatos reales.
     * @param {string} url - URL final del producto
     * @returns {Promise<Object|null>} - Objeto con datos frescos o null s invalid
     */
    async validate(url) {
        if (!url) return null;

        try {
            // 1. Petición HTTP para verificar vida
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                timeout: 8000, // Timeout estricto
                maxRedirects: 5
            });

            // 2. Verificar Status
            if (response.status !== 200) {
                logger.warn(`❌ Link Roto (${response.status}): ${url}`);
                return null;
            }

            const html = response.data;
            const $ = cheerio.load(html);

            // 3. Detección de Páginas de Error (Soft 404)
            const title = $('title').text().toLowerCase();
            if (title.includes('page not found') || title.includes('404') || title.includes('sorry') || title.includes('robot check')) {
                logger.warn(`❌ Página de Error/Captcha detectada: ${title}`);
                return null;
            }

            // 4. Extracción de Metadatos Reales (OpenGraph)
            const ogImage = $('meta[property="og:image"]').attr('content');
            const ogTitle = $('meta[property="og:title"]').attr('content');

            // Validación de Imagen
            if (!ogImage || ogImage.includes('blank') || ogImage.includes('placeholder')) {
                logger.warn(`⚠️ Oferta sin imagen válida. Descartada.`);
                return null;
            }

            // ÉXITO: Devolvemos los datos frescos de la fuente
            return {
                isValid: true,
                realTitle: ogTitle || title,
                realImage: ogImage
            };

        } catch (error) {
            // Ignoramos errores 403 de Amazon (porque bloquean bots), 
            // pero si es otro error de conexión, descartamos.
            // Para Amazon, si no podemos verificar, mejor no publicar si queremos ser 100% estrictos.
            // O usamos la info del RSS si confiamos en ella.
            // PERO el usuario pidió "Garantizar info correcta". Así que si falla, se descarta.
            logger.error(`❌ Fallo validación técnica: ${error.message} -> ${url}`);
            return null;
        }
    }
}

module.exports = new OfferValidator();
