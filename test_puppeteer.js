const puppeteer = require('puppeteer');

(async () => {
    const url = "https://www.ebay.com/sch/177/i.html?_nkw=laptos+refurbished+bulk&_from=R40&Processor=Intel%2520Core%2520i5%25205th%2520Gen%252E%7CAMD%2520Ryzen%25207%7CIntel%2520Core%2520i7%252D6600U%7CIntel%2520Core%2520i5%25206th%2520Gen%252E&_dcat=177&rt=nc";
    console.log("Starting Puppeteer...");
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    
    console.log("Navigating...");
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    console.log("Evaluating...");
    const items = await page.evaluate(() => {
        const ids = [];
        document.querySelectorAll('a.s-item__link').forEach(a => {
            const match = a.href.match(/itm\/(\d+)/);
            if (match && !ids.includes(match[1])) ids.push(match[1]);
        });
        return ids;
    });
    
    console.log("Scraped IDs:", items);
    await browser.close();
})();
