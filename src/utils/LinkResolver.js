const axios = require('axios');
const logger = require('./logger');

class LinkResolver {

    /**
     * Resuelve redirecciones ligeras usando Axios (HTTP HEAD/GET).
     * Ideal para evitar cargar Puppeteer en servidores limitados.
     */
    async resolve(url) {
        if (!url || typeof url !== 'string') return url;

        const lowUrl = url.toLowerCase();

        // Atajo: Solo retornar si es un enlace DIRECTO a la tienda y NO un redirect
        const isRedirect = lowUrl.includes('redirect') || lowUrl.includes('viglink') || lowUrl.includes('sovrn') || lowUrl.includes('tkqlhce') || lowUrl.includes('anrdoezrs');
        const directStores = ['amazon.com', 'ebay.com', 'walmart.com', 'bestbuy.com', 'target.com', 'nike.com', 'adidas.com'];

        if (!isRedirect && directStores.some(ds => lowUrl.includes(ds) && !lowUrl.includes('?u=') && !lowUrl.includes('&u='))) {
            return url;
        }

        // 1. DESEMPAQUETADO DE PARÁMETROS AGRESIVO (Sin peticiones HTTP)
        try {
            let tempUrl = url;
            if (tempUrl.startsWith('//')) tempUrl = 'https:' + tempUrl;

            const uObj = new URL(tempUrl.startsWith('/') ? 'https://www.google.com' + tempUrl : tempUrl);

            // Lista de parámetros que suelen contener la URL real en redes de afiliados
            const params = ['u', 'url', 'mpre', 'dest', 'reftag', 'u2', 'linkCode', 'ascsubtag', 'out', 'q'];
            for (const p of params) {
                const val = uObj.searchParams.get(p);
                if (val && (val.startsWith('http') || val.includes('.com') || val.includes('.net'))) {
                    let decoded = decodeURIComponent(val);

                    if (decoded === url) continue; // Evitar loop

                    // Limpieza de sub-parámetros
                    if (decoded.includes('?url=')) decoded = decoded.split('?url=')[1];
                    if (decoded.includes('&url=')) decoded = decoded.split('&url=')[1];

                    console.log(`[RESOLVER] 🎯 URL extraída de parámetro '${p}': ${decoded.substring(0, 50)}...`);
                    return await this.resolve(decoded);
                }
            }
        } catch (e) {
            // Ignorar errores de URL malformada aquí
        }

        // 2. RESOLUCIÓN HTTP (Solo si el desempaquetado de parámetros falla)
        try {
            console.log(`[RESOLVER] 🌐 Intentando resolución HTTP para: ${url.substring(0, 50)}...`);
            const response = await axios.get(url, {
                maxRedirects: 8,
                timeout: 10000,
                validateStatus: null,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Referer': 'https://www.google.com/'
                }
            });

            // --- PROTECCIÓN CRÍTICA: DETECTAR PÁGINAS DE ERROR DE VIGLINK/SOVRN ---
            const body = response.data && typeof response.data === 'string' ? response.data : '';
            if (body.includes('invalid API key') || body.includes('Check your API key')) {
                console.warn(`[RESOLVER] ⚠️ Error de API Key detectado en Viglink. Rescatando URL del parámetro 'u'...`);
                try {
                    const uObj = new URL(url);
                    const realUrl = uObj.searchParams.get('u');
                    if (realUrl) {
                        const decoded = decodeURIComponent(realUrl);
                        console.log(`[RESOLVER] ✅ URL rescatada del error: ${decoded.substring(0, 50)}...`);
                        return await this.resolve(decoded);
                    }
                } catch (e) { }
            }

            // Si hay un refresh header o meta redirect
            const refresh = response.headers['refresh'];
            if (refresh) {
                const match = refresh.match(/url=(.*)/i);
                if (match && match[1]) return await this.resolve(match[1].trim());
            }

            const responseUrl = response.request?.res?.responseUrl || response.config.url;
            if (responseUrl && responseUrl !== url) return await this.resolve(responseUrl);

            return url;
        } catch (error) {
            console.warn(`[RESOLVER] No se pudo resolver HTTP: ${url.substring(0, 50)}... (${error.message})`);
            return url;
        }
    }
}

module.exports = new LinkResolver();
