const DeepScraper = require('./src/utils/DeepScraper');

async function test() {
    console.log("Testing URL...");
    try {
        const result = await DeepScraper.scrape('https://www.ebay.com/itm/284091945576');
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

test();
