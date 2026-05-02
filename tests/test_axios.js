const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    try {
        const url = 'https://www.ebay.com/itm/284091945576';
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        console.log("Title:", $('title').text());
        console.log("Price:", $('.x-price-primary').text() || $('[itemprop="price"]').attr('content'));
    } catch(e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            const $ = cheerio.load(e.response.data);
            console.log("Error Title:", $('title').text());
        }
    }
}
test();
