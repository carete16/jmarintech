const DeepScraper = require('./src/utils/DeepScraper');
const url = 'https://www.ebay.com/itm/115691976699';

async function test() {
    console.log('--- TEST EBAY SCRAPER ---');
    try {
        const data = await DeepScraper.scrape(url);
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
