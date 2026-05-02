const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('./logger');
const config = require('../config/settings');

puppeteer.use(StealthPlugin());

class DeepScraper {
    async scrape(url, isHeadless = true) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: isHeadless ? 'new' : false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--window-size=1920,1080'
                ]
            });

            const result = await this._performScrape(browser, url, isHeadless);
            await browser.close();
            return result;
        } catch (error) {
            logger.error(`❌ Fatal Scraper Error: ${error.message}`);
            if (browser) await browser.close().catch(() => {});
            return null;
        }
    }

    async _performScrape(browser, rawUrl, isHeadless) {
        // Limpiar URL de eBay (quitar parámetros de tracking que bloquean)
        let targetUrl = rawUrl;
        if (rawUrl.includes('ebay.com/itm/')) {
            const match = rawUrl.match(/ebay\.com\/itm\/(\d+)/);
            if (match) targetUrl = `https://www.ebay.com/itm/${match[1]}`;
        }

        const page = await browser.newPage();
        try {
            await page.setViewport({ width: 1280, height: 800 });
            
            // Identidad Premium (macOS Sonoma / Chrome 124)
            const ua = config.scraper.user_agent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
            await page.setUserAgent(ua);
            
            // Navegación con reintento y túnel de emergencia
            let pageTitle = "";
            try {
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                pageTitle = await page.title();
            } catch (e) {
                logger.warn(`⚠️ Primer intento fallido, probando túnel...`);
            }

            // Si hay bloqueo, usamos el Túnel de Google
            if (!pageTitle || pageTitle.includes('Access Denied') || pageTitle.includes('Pardon') || pageTitle.includes('robot')) {
                const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=es&u=${encodeURIComponent(targetUrl)}`;
                await page.goto(proxyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            }

            // Extracción de Datos Profunda
            const data = await page.evaluate(() => {
                const cleanPrice = (txt) => {
                    if (!txt) return 0;
                    let raw = txt.replace(/[^0-9,.]/g, '').trim();
                    if (raw.includes('.') && raw.includes(',')) {
                        const lastDot = raw.lastIndexOf('.');
                        const lastComma = raw.lastIndexOf(',');
                        if (lastDot > lastComma) raw = raw.replace(/,/g, '');
                        else raw = raw.replace(/\./g, '').replace(',', '.');
                    } else if (raw.includes(',')) {
                        const parts = raw.split(',');
                        if (parts[parts.length - 1].length <= 2) raw = raw.replace(',', '.');
                        else raw = raw.replace(/,/g, '');
                    }
                    return parseFloat(raw) || 0;
                };

                let offerPrice = 0, officialPrice = 0, title = "", image = "", specs = "", description = "";

                // --- MÉTODO 1: EXTRACCIÓN DE METADATOS OCULTOS (JSON-LD) ---
                try {
                    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
                    for (const script of jsonLdScripts) {
                        try {
                            const json = JSON.parse(script.innerText);
                            const item = Array.isArray(json) ? json[0] : json;
                            const product = item['@type'] === 'Product' ? item : (item['mainEntity']?.['@type'] === 'Product' ? item['mainEntity'] : null);
                            if (product) {
                                if (!title) title = product.name;
                                if (!image) image = Array.isArray(product.image) ? product.image[0] : product.image;
                                if (product.offers) {
                                    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
                                    if (offer.price && offer.price > 0) offerPrice = parseFloat(offer.price);
                                }
                            }
                        } catch (e) {}
                    }
                } catch (e) {}

                // --- MÉTODO 2: SELECTORES VISUALES (REFORZADO) ---
                const ebayTitle = document.querySelector('h1.x-item-title__mainTitle')?.innerText || 
                                 document.querySelector('.it-ttl')?.innerText;
                const ebayPriceEl = document.querySelector('.x-price-primary .ux-textspans--BOLD') || 
                                   document.querySelector('.x-price-primary') ||
                                   document.querySelector('#prcIsum') || 
                                   document.querySelector('.x-bin-price__content');
                const ebayImg = document.querySelector('.ux-image-magnify-wrapper img')?.src || 
                               document.querySelector('#icImg')?.src;
                const ebaySpecs = document.querySelector('.ux-layout-section--item-specifications, .itemAttr')?.innerText || "";

                const amzTitle = document.querySelector('#productTitle')?.innerText;
                const amzPrice = document.querySelector('.a-price .a-offscreen')?.innerText || 
                                 document.querySelector('#priceblock_ourprice')?.innerText;
                const amzImg = document.querySelector('#landingImage')?.src;
                const amzSpecs = document.querySelector('#feature-bullets, #prodDetails')?.innerText || "";

                if (!title) title = ebayTitle || amzTitle || document.title;
                if (!offerPrice) offerPrice = cleanPrice(ebayPriceEl?.innerText || amzPrice);
                if (!image) image = ebayImg || amzImg || "";
                if (!specs) specs = (ebaySpecs + " " + amzSpecs).trim();

                // Detección especial de precios en español (Sin símbolo $)
                if (!offerPrice) {
                    const allTexts = Array.from(document.querySelectorAll('.ux-textspans, span, div'));
                    const priceNode = allTexts.find(el => el.innerText.includes('dólares') || el.innerText.includes('USD'));
                    if (priceNode) offerPrice = cleanPrice(priceNode.innerText);
                }

                // --- MÉTODO 3: MODO ESPEJO (EXTRACCIÓN POR PATRONES EN HTML) ---
                if (!offerPrice || offerPrice <= 0) {
                    const html = document.documentElement.innerHTML;
                    // Buscar patrones de precio en el HTML crudo
                    const priceMatch = html.match(/(\d{2,}\s*[.,]\s*\d{2})\s*(dólares|usd|us \$)/i) || 
                                     html.match(/(usd|us \$)\s*(\d{2,}\s*[.,]\s*\d{2})/i);
                    if (priceMatch) {
                        offerPrice = cleanPrice(priceMatch[0]);
                    }
                }

                return {
                    title: (title || "").includes('http') ? "Producto Detectado" : (title || "").trim(),
                    offerPrice,
                    image,
                    specs,
                    isBlocked: document.title.includes('Access Denied')
                };
            }, 'ebay');

            // Parser de Hardware (Bilingüe)
            if (data && data.specs) {
                data.hardware = this._parseHardware(data.specs + " " + data.title);
                data.processor = data.hardware.processor;
                data.ram = data.hardware.ram;
                data.disk = data.hardware.disk;
            }

            // --- FALLBACK FINAL: BÚSQUEDA POR IA (GEMINI) ---
            if (!data || !data.offerPrice || data.offerPrice <= 0) {
                try {
                    const AIProcessor = require('../core/AIProcessor');
                    const html = await page.content();
                    const aiResult = await AIProcessor.analyzePageContent(html);
                    if (aiResult && aiResult.price > 0) {
                        if (!data) data = { title: aiResult.title };
                        data.offerPrice = aiResult.price;
                        data.title = aiResult.title || data.title;
                        logger.info(`✨ Gemini rescató el producto: ${data.title} - $${data.offerPrice}`);
                    }
                } catch (e) {
                    logger.warn("⚠️ El respaldo de IA también falló.");
                }
            }

            return data;
        } catch (error) {
            logger.error(`❌ Scraper Error: ${error.message}`);
            return null;
        }
    }

    _parseHardware(text) {
        const specs = { processor: "No detectado", ram: "No detectado", disk: "No detectado", screen: "No detectado", gpu: "No detectado" };
        if (!text) return specs;
        
        const cpuRegex = /(intel\s+core\s+i[3579]-?\d+\w*|ryzen\s+[3579]\s+\d+\w*|apple\s+m[123]\s*\w*|intel\s+celeron|intel\s+pentium|snapdragon\s+\d+\w*|procesador\s+i[3579]|núcleos|cores)/gi;
        const cpuMatch = text.match(cpuRegex);
        if (cpuMatch) specs.processor = cpuMatch[0].trim();

        const ramRegex = /(\d+\s*gb\s*(ddr[45]|lpddr[45]x?|ram|memoria))/gi;
        const ramMatch = text.match(ramRegex) || text.match(/\b(4|8|12|16|24|32|64)\s*gb\b/gi);
        if (ramMatch) specs.ram = ramMatch[0].trim().toUpperCase().replace('MEMORIA', 'RAM');

        const diskRegex = /(\d+\s*(gb|tb)\s*(ssd|hdd|nvme|m\.2|pcie|disco|almacenamiento))/gi;
        const diskMatch = text.match(diskRegex) || text.match(/\b(128|256|512|1024|2048|1|2)\s*(gb|tb)\b/gi);
        if (diskMatch) specs.disk = diskMatch[0].trim().toUpperCase().replace('DISCO', 'SSD').replace('ALMACENAMIENTO', 'SSD');

        return specs;
    }
}

module.exports = new DeepScraper();
