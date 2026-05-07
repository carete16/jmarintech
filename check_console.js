const puppeteer = require('puppeteer');

(async () => {
  console.log("Starting Puppeteer test...");
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER CONSOLE ERROR:', msg.text());
      } else {
        console.log('BROWSER CONSOLE:', msg.text());
      }
    });

    page.on('pageerror', err => {
      console.log('PAGE JS ERROR:', err.toString());
    });

    console.log("Navigating to http://localhost:10000/admin ...");
    await page.goto('http://localhost:10000/admin', { waitUntil: 'networkidle2', timeout: 15000 });
    console.log("Page loaded. Waiting 2 seconds for JS execution...");
    await new Promise(r => setTimeout(r, 2000));
    console.log("Done checking.");
  } catch (e) {
    console.log("SCRIPT ERROR:", e.message);
  } finally {
    if (browser) await browser.close();
  }
})();
