const DeepScraper = require('./src/utils/DeepScraper');

async function test() {
    const url = 'https://www.ebay.com/itm/284091945576';
    const data = await DeepScraper.scrape(url);
    console.log('Result:', JSON.stringify(data, null, 2));
    process.exit();
}

test();
