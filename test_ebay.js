const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    const url = "https://www.ebay.com/sch/177/i.html?_nkw=laptos+refurbished+bulk&_from=R40&Processor=Intel%2520Core%2520i5%25205th%2520Gen%252E%7CAMD%2520Ryzen%25207%7CIntel%2520Core%2520i7%252D6600U%7CIntel%2520Core%2520i5%25206th%2520Gen%252E&_dcat=177&rt=nc";
    try {
        console.log("Scraping...");
        const htmlResp = await axios.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        const $ = cheerio.load(htmlResp.data);
        const itemIds = [];
        $('.s-item__link').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                const match = href.match(/itm\/(\d+)/);
                if (match && !itemIds.includes(match[1])) itemIds.push(match[1]);
            }
        });
        console.log("Item IDs encontrados:", itemIds.length, itemIds.slice(0, 10));
    } catch(e) {
        console.error("ERROR:", e.message);
    }
}
test();
