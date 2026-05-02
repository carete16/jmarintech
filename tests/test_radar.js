const RadarBot = require('./src/core/Bot1_Scraper');
const logger = require('./src/utils/logger');

async function test() {
    console.log('--- TEST RADAR ---');
    const opps = await RadarBot.getMarketOpportunities();
    console.log(`Total detected: ${opps.length}`);

    const storeCounts = {};
    opps.forEach(o => {
        storeCounts[o.tienda] = (storeCounts[o.tienda] || 0) + 1;
    });

    console.log('Stores found in RSS:', storeCounts);

    const nonAmazon = opps.filter(o => o.tienda !== 'Amazon').slice(0, 5);
    console.log('Example non-Amazon deals:', JSON.stringify(nonAmazon, null, 2));
}

test();
