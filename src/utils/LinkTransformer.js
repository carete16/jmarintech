/**
 * LinkTransformer: Limpieza de links directos.
 * Versión SIN AFILIADOS - Links directos al producto.
 */
class LinkTransformer {

    detectarTienda(url) {
        if (!url) return "Tienda USA";
        const u = url.toLowerCase();
        if (u.includes("amazon.")) return "Amazon US";
        if (u.includes("walmart.")) return "Walmart";
        if (u.includes("ebay.")) return "eBay";
        if (u.includes("bestbuy.")) return "BestBuy";
        if (u.includes("nike.")) return "Nike";
        if (u.includes("adidas.")) return "Adidas";
        if (u.includes("target.")) return "Target";
        if (u.includes("newegg.")) return "Newegg";
        if (u.includes("homedepot.")) return "Home Depot";
        if (u.includes("apple.com")) return "Apple";
        if (u.includes("samsung.com")) return "Samsung";
        if (u.includes("sephora.com")) return "Sephora";
        if (u.includes("gamestop.com")) return "GameStop";
        if (u.includes("jomashop.com")) return "Jomashop";
        return "Tienda USA";
    }

    limpiarURL(url) {
        if (!url) return '';
        try {
            const u = new URL(url);
            // Eliminar parámetros de tracking/afiliados comunes
            ['tag', 'ref', 'linkCode', 'ascsubtag', 'subId', 'key', 'viglink', 'sovrn',
             'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'
            ].forEach(p => u.searchParams.delete(p));
            return u.toString();
        } catch(e) {
            return url.split("?")[0];
        }
    }

    async transform(url) {
        if (!url) return url;
        // Si es un link de afiliado envuelto (viglink/sovrn), extraemos la URL real
        try {
            if (url.includes('redirect.viglink.com') || url.includes('sovrn.com')) {
                const u = new URL(url);
                const inner = u.searchParams.get('u') || u.searchParams.get('url');
                if (inner) return this.limpiarURL(decodeURIComponent(inner));
            }
        } catch(e) {}
        return this.limpiarURL(url);
    }
}

module.exports = new LinkTransformer();
