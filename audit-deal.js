const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const TARGET_URL = 'https://slickdeals.net/f/19109737-6-pack-better-homes-gardens-porcelain-square-bowls-white-10-02-more-free-s-h-w-walmart-or-on-35';

async function audit() {
    console.log(`🕵️ AUDITORÍA FORENSE PARA: ${TARGET_URL}`);
    console.log('---------------------------------------------------');

    // 1. OBTENER HTML DE LA PÁGINA DE LA OFERTA
    console.log('PASO 1: Descargando HTML de Slickdeals...');
    let html;
    try {
        const res = await axios.get(TARGET_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Referer': 'https://www.google.com/'
            },
            timeout: 10000,
            validateStatus: () => true // Aceptar cualquier status para ver el error
        });
        console.log(`Status Code: ${res.status}`);
        if (res.status === 403 || res.status === 429) {
            console.log('⚠️ BLOQUEADO (403/429). Intentando Bypass Google Proxy...');
            const proxy = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(TARGET_URL)}`;
            const res2 = await axios.get(proxy, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            console.log(`Proxy Status: ${res2.status}`);
            html = res2.data;
        } else {
            html = res.data;
        }
    } catch (e) {
        console.log(`❌ ERROR FATAL DE RED: ${e.message}`);
        return;
    }

    // 2. BUSCAR EL BOTÓN DE COMPRA
    console.log('\nPASO 2: Buscando enlace de "Ver Oferta" (See Deal) en el HTML...');
    const $ = cheerio.load(html);

    let buyLinks = [];
    // Selectores conocidos
    $('a').each((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        const href = $(el).attr('href');
        const role = $(el).attr('role');
        const classes = $(el).attr('class') || '';

        if (text.includes('see deal') || text.includes('buy now') || classes.includes('buyNow') || classes.includes('dealButton')) {
            if (href && !href.includes('#')) {
                buyLinks.push({ text, href });
            }
        }
    });

    if (buyLinks.length === 0) {
        console.log('❌ NO SE ENCONTRARON ENLACES DE COMPRA. Slickdeals cambió el diseño o el HTML está ofuscado.');
        // Guardar HTML para inspección humana si falla
        fs.writeFileSync('audit_fail.html', html);
        console.log('   (HTML guardado en audit_fail.html)');
        return;
    }

    console.log(`✅ ENCONTRADOS ${buyLinks.length} ENLACES POTENCIALES:`);
    buyLinks.forEach((l, i) => console.log(`   [${i}] "${l.text}" -> ${l.href}`));

    // 3. SEGUIR LA RUTA DEL ENLACE (TRAZAR REDIRECCIONES)
    const linkToFollow = buyLinks[0].href.startsWith('/') ? 'https://slickdeals.net' + buyLinks[0].href : buyLinks[0].href;
    console.log(`\nPASO 3: Siguiendo el rastro del enlace: ${linkToFollow}`);

    // Analizar si tiene parámetros ocultos
    try {
        const u = new URL(linkToFollow);
        const u2 = u.searchParams.get('u2');
        if (u2) console.log(`   🔎 DETECTADO "u2" (Link real oculto?): ${decodeURIComponent(u2)}`);
    } catch (e) { }

    try {
        const trace = await axios.get(linkToFollow, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            maxRedirects: 0, // NO seguir automáticamente para ver el 302
            validateStatus: status => status >= 200 && status < 400
        });

        console.log(`Status Directo: ${trace.status}`);
        if (trace.headers.location) {
            console.log(`➡️ REDIRECCIÓN 1: ${trace.headers.location}`);
            // Aquí podríamos seguir recursivamente
        } else {
            console.log(`🏁 DESTINO FINAL (parece): ${trace.config.url}`);
        }
    } catch (e) {
        console.log(`⚠️ NO SE PUDO SEGUIR EL ENLACE (Posible bloqueo o timeout): ${e.message}`);
    }
}

audit();
