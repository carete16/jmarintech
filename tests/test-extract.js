const cheerio = require('cheerio');
const fs = require('fs');

try {
    const html = fs.readFileSync('proxy_test.html', 'utf8');
    const $ = cheerio.load(html);

    console.log('--- ANALYZING PROXY HTML FOR BUY LINKS ---');

    // Selectors from Bot2
    let buyNowLinks = $('a.buyNow, a.button--primary, a[data-bhw="BuyNowButton"], a:contains("See Deal"), a:contains("Buy Now")');

    console.log(`Initial Selector Count: ${buyNowLinks.length}`);

    if (buyNowLinks.length === 0) {
        // Try broader search
        console.log('Broad search...');
        buyNowLinks = $('a').filter((i, el) => {
            const t = $(el).text().toLowerCase();
            const h = $(el).attr('href') || '';
            return t.includes('see deal') || t.includes('buy now') || h.includes('u2=');
        });
        console.log(`Broader Search Count: ${buyNowLinks.length}`);
    }

    buyNowLinks.each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim().substring(0, 20);
        console.log(`[${i}] Text: "${text}" | Href: ${href ? href.substring(0, 100) : 'null'}...`);

        // Try to decode
        if (href) {
            try {
                // Google Translate wraps links?
                // Often standard links remain or are modified like https://translate.googleusercontent.com/...

                // Let's assume we find a Slickdeals URL pattern
                if (href.includes('u2=') || href.includes('u=')) {
                    const u = new URL(href.startsWith('/') ? 'https://slickdeals.net' + href : href);
                    const u2 = u.searchParams.get('u2') || u.searchParams.get('u');
                    console.log(`    -> DECODED: ${decodeURIComponent(u2)}`);
                }
            } catch (e) { console.log('    -> Decode Error:', e.message); }
        }
    });

} catch (e) {
    console.error(e);
}
