const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    try {
        const query = 'site:amazon.com ECO-WORTHY 3584Wh 12V 280Ah LiFePO4 Lithium Battery';
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        console.log('Searching:', url);
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        const links = [];
        $('a').each((i, el) => {
            let href = $(el).attr('href');
            if (href && href.includes('amazon.com')) {
                // Google often wraps links in /url?q=...
                if (href.startsWith('/url?q=')) {
                    href = new URL('https://google.com' + href).searchParams.get('q');
                }
                if (href && href.includes('amazon.com/dp/')) {
                    links.push(href);
                }
            }
        });
        console.log('Found Links:', links);
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
