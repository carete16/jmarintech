const DeepScraper = require('./src/utils/DeepScraper');

async function test() {
    const cleanUrl = 'https://www.ebay.com/itm/284091945576';
    const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(cleanUrl)}`;
    
    console.log('Testing Proxy URL:', proxyUrl);
    const data = await DeepScraper.scrape(proxyUrl);
    console.log('Result:', JSON.stringify(data, null, 2));
    process.exit();
}

test();
