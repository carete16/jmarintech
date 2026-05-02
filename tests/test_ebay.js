const axios = require('axios');
const cheerio = require('cheerio');

async function testEbay() {
    const url = 'https://www.ebay.com/itm/284091945576';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        const $ = cheerio.load(response.data);
        const title = $('meta[property="og:title"]').attr('content') || $('.x-item-title__mainTitle span').text().trim();
        const price = $('meta[itemprop="price"]').attr('content') || $('.x-price-primary .ux-textspans--BOLD').text().trim();
        const image = $('meta[property="og:image"]').attr('content');
        
        console.log('Title:', title);
        console.log('Price:', price);
        console.log('Image:', image);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testEbay();
