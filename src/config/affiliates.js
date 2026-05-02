module.exports = {
    // Amazon: reemplaza 'tu-tag-20' con tu tracking ID real
    AMAZON_TAG: process.env.AMAZON_TAG || 'masbaratodeal-20',

    // eBay: Campaign ID
    EBAY_CAMPAIGN_ID: process.env.EBAY_CAMPAIGN_ID || '533899...',

    // Walmart: Publisher ID (Impact Radius)
    WALMART_ID: process.env.WALMART_ID || '1234567',

    // Best Buy: API Key or Impact Radius ID
    BESTBUY_ID: process.env.BESTBUY_ID || '1234567',

    // Función para limpiar y taggear links
    tagLink: function (url) {
        if (!url) return url;

        try {
            const urlObj = new URL(url);

            // Amazon
            if (urlObj.hostname.includes('amazon.com') || urlObj.hostname.includes('amzn.to')) {
                urlObj.searchParams.set('tag', this.AMAZON_TAG);

                // Limpiar parámetros de tracking de otros
                // Nota: Amazon a veces prohíbe limpiar todo, pero quitar 'ref' es común.
                // Lo más seguro es solo asegurar que 'tag' sea el nuestro.
                return urlObj.toString();
            }

            // eBay
            if (urlObj.hostname.includes('ebay.com')) {
                // eBay es más complejo (EPN), normalmente requiere un link generator.
                // Un hack simple es usar el formato: https://www.ebay.com/rover/1/711-53200-19255-0/1?campid=TU_ID&toolid=10001&customid=&mpre=URL_ORIGINAL encoded
                if (this.EBAY_CAMPAIGN_ID !== '533899...') {
                    const encodedUrl = encodeURIComponent(url);
                    return `https://www.ebay.com/rover/1/711-53200-19255-0/1?campid=${this.EBAY_CAMPAIGN_ID}&toolid=10001&mpre=${encodedUrl}`;
                }
            }

            return url;
        } catch (e) {
            return url;
        }
    }
};
