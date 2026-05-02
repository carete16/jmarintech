const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSlickdealsHome() {
    try {
        const res = await axios.get('https://slickdeals.net/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });
        const $ = cheerio.load(res.data);
        const deals = [];
        $('.itemCard').each((i, el) => {
            const title = $(el).find('.itemTitle').text().trim();
            const link = 'https://slickdeals.net' + $(el).find('.itemTitle').attr('href');
            if (title) deals.push({ title, link });
        });
        console.log('ENCONTRADOS EN HOME:', deals.length);
        return deals;
    } catch (e) {
        console.log('ERROR SCRAPING HOME:', e.message);
        return [];
    }
}
scrapeSlickdealsHome();
