const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = "https://www.ebay.com/sch/177/i.html?_nkw=laptos+refurbished+bulk&_from=R40&Processor=Intel%2520Core%2520i5%25205th%2520Gen%252E%7CAMD%2520Ryzen%25207%7CIntel%2520Core%2520i7%252D6600U%7CIntel%2520Core%2520i5%25206th%2520Gen%252E&_dcat=177&rt=nc";
  
  console.log("Launching puppeteer...");
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });

    console.log("Going to URL...");
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    await new Promise(r => setTimeout(r, 5000)); // Esperar carga
    
    const items = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('li.s-item').forEach(node => {
        const titleEl = node.querySelector('.s-item__title span');
        const priceEl = node.querySelector('.s-item__price');
        const condEl = node.querySelector('.SECONDARY_INFO');
        if (titleEl && priceEl && titleEl.innerText !== 'Shop on eBay') {
          results.push({
            title: titleEl.innerText,
            price: priceEl.innerText,
            condition: condEl ? condEl.innerText : ''
          });
        }
      });
      return results;
    });
    
    console.log("Resultados:", JSON.stringify(items.slice(0, 5), null, 2));
    
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    if (browser) await browser.close();
  }
})();
