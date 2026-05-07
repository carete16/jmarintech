const axios = require('axios');
const logger = require('../utils/logger');

/**
 * EBAY API RADAR — OAuth 2.0 + Browse API
 * Usa autenticación oficial con Client Credentials.
 * Obtener credenciales en: https://developer.ebay.com/my/keys
 */
class EbayAPIRadar {
    constructor() {
        this._token = null;
        this._tokenExpiry = 0;
    }

    get clientId() { return process.env.EBAY_APP_ID; }
    get clientSecret() { return process.env.EBAY_CERT_ID; }

    /**
     * Obtiene (o reutiliza) un token OAuth de eBay.
     * Los tokens duran 2 horas — los cacheamos para no pedirlos de nuevo.
     */
    async getToken() {
        if (this._token && Date.now() < this._tokenExpiry) {
            return this._token;
        }
        if (!this.clientId || !this.clientSecret) {
            logger.warn('⚠️ [EBAY OAuth] Faltan EBAY_APP_ID o EBAY_CERT_ID en .env');
            return null;
        }
        try {
            const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            const resp = await axios.post(
                'https://api.ebay.com/identity/v1/oauth2/token',
                'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
                {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                }
            );
            this._token = resp.data.access_token;
            // Expira 5 minutos antes del tiempo real para seguridad
            this._tokenExpiry = Date.now() + (resp.data.expires_in - 300) * 1000;
            logger.info('✅ [EBAY OAuth] Token renovado correctamente.');
            return this._token;
        } catch (e) {
            logger.error(`❌ [EBAY OAuth] Error al obtener token: ${e.response?.data?.error_description || e.message}`);
            return null;
        }
    }

    /**
     * Extrae el Item ID de un URL de eBay.
     */
    extractItemId(url) {
        const m = url.match(/ebay\.com\/itm\/(\d+)/);
        return m ? m[1] : null;
    }

    /**
     * Obtiene datos completos de un item por su ID o URL.
     * Usa la Browse API (moderna, sin bloqueos).
     */
    async getItemById(itemId, variantId = null) {
        const token = await this.getToken();
        if (!token) return null;

        // Intentar con y sin variante
        const attempts = variantId 
            ? [`v1%7C${itemId}%7C${variantId}`, `v1%7C${itemId}%7C0`]
            : [`v1%7C${itemId}%7C0`];

        for (const encodedId of attempts) {
            try {
                logger.info(`📡 [EBAY Browse API] Consultando item ${itemId}${variantId ? ` (var:${variantId})` : ''}...`);
                const resp = await axios.get(
                    `https://api.ebay.com/buy/browse/v1/item/${encodedId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
                            'Content-Type': 'application/json'
                        },
                        timeout: 12000
                    }
                );

                const item = resp.data;
                if (!item) continue;

                // Extraer especificaciones técnicas
                const specs = item.localizedAspects || [];
                const findSpec = (...keys) => {
                    const kLow = keys.map(k => k.toLowerCase());
                    const found = specs.find(s => kLow.some(k => s.name?.toLowerCase().includes(k)));
                    return found?.value || '';
                };

                const specsText = specs.map(s => `${s.name}: ${s.value}`).join(' | ');
                const processor = findSpec('processor', 'cpu', 'procesador');
                const ram      = findSpec('ram', 'memory', 'memoria');
                const disk     = findSpec('storage', 'ssd', 'hdd', 'disco', 'hard drive');
                const screen   = findSpec('screen', 'display', 'pantalla');
                const price    = parseFloat(item.price?.value || 0);

                logger.info(`✅ [EBAY Browse API] "${item.title?.substring(0,50)}" — $${price}`);

                return {
                    title:    item.title || '',
                    price,
                    image:    item.image?.imageUrl || item.additionalImages?.[0]?.imageUrl || '',
                    specs:    specsText,
                    processor, ram, disk, screen,
                    categoria: 'Tecnología',
                    condition: item.condition || ''
                };
            } catch (e) {
                const status = e.response?.status;
                const errMsg = e.response?.data?.errors?.[0]?.message || e.message;
                logger.error(`❌ [EBAY Browse API] Error ${status}: ${errMsg}`);
                // Si es 404 y hay más intentos, continuar; si no, retornar null
                if (status === 404) continue;
                return null;
            }
        }
        return null;
    }

    /**
     * Busca productos en eBay usando palabras clave.
     * Ideal para "lotes" o búsquedas específicas.
     */
    async searchItems(query, limit = 10) {
        const token = await this.getToken();
        if (!token) return [];

        try {
            logger.info(`📡 [EBAY Search] Buscando: "${query}" (límite: ${limit})...`);
            const resp = await axios.get(
                `https://api.ebay.com/buy/browse/v1/item_summary/search`,
                {
                    params: { q: query, limit: limit, filter: 'buyingOptions:{FIXED_PRICE}' },
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
                    },
                    timeout: 15000
                }
            );

            const items = resp.data.itemSummaries || [];
            logger.info(`✅ [EBAY Search] Se encontraron ${items.length} resultados.`);

            return items.map(item => {
                const title = item.title;
                const ram = title.match(/(\d+)GB?\s*(RAM|DDR)/i)?.[1] || '';
                const ssd = title.match(/(\d+)(GB|TB)?\s*(SSD|NVME|DISK|HDD)/i)?.[0] || '';
                const cpu = title.match(/(i[3579]|Ryzen\s*\d|Apple\s*M\d)/i)?.[0] || '';
                
                return {
                    id: item.itemId.split('|')[1] || item.itemId,
                    title: title,
                    price: parseFloat(item.price?.value || 0),
                    currency: item.price?.currency || 'USD',
                    image: item.image?.imageUrl || '',
                    shipping: parseFloat(item.shippingOptions?.[0]?.shippingCost?.value || 0),
                    condition: item.condition || 'Used',
                    link: item.itemWebUrl,
                    specs: {
                        ram: ram ? ram + 'GB' : '',
                        ssd: ssd,
                        cpu: cpu
                    }
                };
            });
        } catch (e) {
            logger.error(`❌ [EBAY Search] Error: ${e.response?.data?.errors?.[0]?.message || e.message}`);
            return [];
        }
    }
}

module.exports = new EbayAPIRadar();
