const logger = require('./logger');

class VisualScraper {
    /**
     * Intenta extraer una imagen de alta calidad basada en la URL de la tienda.
     * @param {string} url - URL del producto.
     * @param {string} currentImage - Imagen que ya tenemos (si existe).
     */
    async getHighResImage(url, currentImage) {
        if (!url) return currentImage;

        try {
            const urlObj = new URL(url);

            // 1. Amazon: Extracción por ASIN (Garantiza imagen limpia)
            if (urlObj.hostname.includes('amazon')) {
                const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i) || url.match(/asin=([A-Z0-9]{10})/i);
                if (asinMatch) {
                    const asin = asinMatch[1];
                    // Formato de imagen de alta resolución de Amazon
                    return `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`;
                }
            }

            // 2. eBay: Intentar mejorar la resolución si ya es de eBay
            if (urlObj.hostname.includes('ebayimg.com') || (currentImage && currentImage.includes('ebayimg.com'))) {
                // Cambiar s-lXXX.jpg por s-l1600.jpg para máxima calidad
                return (currentImage || '').replace(/s-l\d+\.jpg/g, 's-l1600.jpg');
            }

            // 3. Aliexpress: Limpiar parámetros de redimensión
            if (currentImage && currentImage.includes('alicdn.com')) {
                return currentImage.split('_').shift(); // Quita redimensiones como _640x640.jpg
            }

            return currentImage;
        } catch (e) {
            logger.error(`Error en VisualScraper: ${e.message}`);
            return currentImage;
        }
    }
}

module.exports = new VisualScraper();
