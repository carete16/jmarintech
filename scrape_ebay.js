const puppeteer = require('puppeteer');

(async () => {
  const url = "https://www.ebay.com/sch/177/i.html?_nkw=laptos+refurbished+bulk&_from=R40&Processor=Intel%2520Core%2520i5%25205th%2520Gen%252E%7CAMD%2520Ryzen%25207%7CIntel%2520Core%2520i7%252D6600U%7CIntel%2520Core%2520i5%25206th%2520Gen%252E&_dcat=177&rt=nc";
  
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Configurar User-Agent para evitar bloqueos
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const items = await page.evaluate(() => {
      const results = [];
      const itemNodes = document.querySelectorAll('.s-item');
      
      itemNodes.forEach(node => {
        const titleEl = node.querySelector('.s-item__title');
        const priceEl = node.querySelector('.s-item__price');
        const linkEl = node.querySelector('.s-item__link');
        const conditionEl = node.querySelector('.SECONDARY_INFO');
        const sellerEl = node.querySelector('.s-item__seller-info-text');
        
        if (titleEl && priceEl && !titleEl.innerText.includes('Shop on eBay')) {
          results.push({
            title: titleEl.innerText,
            price: priceEl.innerText,
            condition: conditionEl ? conditionEl.innerText : 'Unknown',
            seller: sellerEl ? sellerEl.innerText : 'Unknown',
            link: linkEl ? linkEl.href : ''
          });
        }
      });
      return results.slice(0, 15); // Tomar los primeros 15
    });
    
    console.log(JSON.stringify(items, null, 2));
    
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    if (browser) await browser.close();
  }
})();
