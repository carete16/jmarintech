const ProScraper = require('./src/collectors/SlickdealsProScraper');

async function test() {
    console.log("🔍 Probando Scraper de Slickdeals...");
    const deals = await ProScraper.getFrontpageDeals();
    console.log(`✅ Resultado: ${deals.length} ofertas encontradas.`);
    if (deals.length > 0) {
        console.log("Primera oferta:", deals[0].title);
    }
}

test();
