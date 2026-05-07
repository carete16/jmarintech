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
     * MEJORADO: Ahora obtiene los detalles completos de cada item para tener specs reales.
     */
    async searchItems(query, limit = 15, options = null) {
        const token = await this.getToken();
        if (!token) return [];

        try {
            logger.info(`📡 [EBAY Search] Buscando: "${query}" (límite: ${limit})...`);
            
            let filter = 'buyingOptions:{FIXED_PRICE}';
            let category_ids = null;
            let aspect_filter = '';

            // Extraer condición (compatibilidad hacia atrás por si pasan string)
            const condition = typeof options === 'string' ? options : (options ? options.condition : null);

            if (condition) {
                const condMap = {
                    'CERTIFIED_REFURBISHED': '2000',
                    'EXCELLENT_REFURBISHED': '2500',
                    'VERY_GOOD_REFURBISHED': '2500',
                    'GOOD_REFURBISHED': '2500',
                    'USED': '3000',
                    'NEW': '1000'
                };
                if (condMap[condition]) filter += `,conditions:{${condMap[condition]}}`;
            }

            // Inyectar Category IDs y Aspect Filters
            if (options && typeof options === 'object') {
                if (options.categoryId) category_ids = options.categoryId;
                
                if (options.aspectFilters && Object.keys(options.aspectFilters).length > 0 && category_ids) {
                    const aspects = [];
                    for (const [key, values] of Object.entries(options.aspectFilters)) {
                        // Reemplazar espacios y formatear según documentación de eBay (ej: Processor:{Intel Core i5|AMD Ryzen})
                        aspects.push(`${key}:{${values.join('|')}}`);
                    }
                    aspect_filter = `categoryId:${category_ids},${aspects.join(',')}`;
                }
            }

            const params = { q: query, limit: limit, filter: filter };
            if (category_ids) params.category_ids = category_ids;
            if (aspect_filter) params.aspect_filter = aspect_filter;

            logger.info(`🔍 [EBAY Filters] params: ${JSON.stringify(params)}`);

            const resp = await axios.get(
                `https://api.ebay.com/buy/browse/v1/item_summary/search`,
                {
                    params: params,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
                    },
                    timeout: 15000
                }
            );

            const summaries = resp.data.itemSummaries || [];
            logger.info(`✅ [EBAY Search] Se encontraron ${summaries.length} resultados. Obteniendo detalles completos...`);

            // OBTENER DETALLES COMPLETOS EN PARALELO (Limitado a 10 para no saturar)
            const detailPromises = summaries.slice(0, 10).map(async (s) => {
                const itemId = s.itemId.split('|')[1] || s.itemId;
                const details = await this.getItemById(itemId);
                if (details) {
                    return {
                        id: itemId,
                        title: details.title || s.title,
                        price: details.price || parseFloat(s.price?.value || 0),
                        currency: s.price?.currency || 'USD',
                        image: details.image || s.image?.imageUrl || '',
                        shipping: parseFloat(s.shippingOptions?.[0]?.shippingCost?.value || 0),
                        condition: details.condition || s.condition || 'Used',
                        link: s.itemWebUrl,
                        specs: {
                            ram: details.ram || '',
                            ssd: details.disk || '',
                            cpu: details.processor || '',
                            screen: details.screen || '',
                            full: details.specs || ''
                        }
                    };
                }
                return null;
            });

            const results = (await Promise.all(detailPromises)).filter(r => r !== null);
            return results;

        } catch (e) {
            logger.error(`❌ [EBAY Search] Error: ${e.response?.data?.errors?.[0]?.message || e.message}`);
            return [];
        }
    }
}

module.exports = new EbayAPIRadar();
