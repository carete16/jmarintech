const logger = require('../utils/logger');
const axios = require('axios');

/**
 * BOT 3: EL AUDITOR DE ÉLITE (CON MOTOR DE ARBITRAJE)
 * Evalúa la calidad de la ganga y compara con el mercado colombiano (MercadoLibre).
 */
class PriceAuditorBot {

    constructor() {
        this.trm = 4100; // Valor base, se actualiza en la auditoría
        this.shippingPerLibre = 2.5; // USD por libra
    }

    async getMeliPrice(title) {
        try {
            const DeepScraper = require('../utils/DeepScraper');
            const cleanQuery = title.toLowerCase()
                .replace(/amazon|walmart|bestbuy|ebay|target|adidas|nike|sale|deal|off/gi, '')
                .replace(/&quot;|quot;|&#34;/gi, '') // Limpiar entidades HTML
                .replace(/[^a-z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            const words = cleanQuery.split(' ').filter(w => w.length > 2);
            const query = words.slice(0, 4).join(' ');
            
            if (!query) return null;

            // INTENTO 1: API OFICIAL (Rápido)
            const url = `https://api.mercadolibre.com/sites/MCO/search?q=${encodeURIComponent(query)}&limit=5`;
            const headers = { 'User-Agent': 'Mozilla/5.0' };

            try {
                const response = await axios.get(url, { timeout: 5000, headers });
                if (response.data.results && response.data.results.length > 0) {
                    const r = response.data.results[0];
                    return { price: r.price, link: r.permalink, match: r.title, source: 'API' };
                }
            } catch (e) {
                logger.warn('🔒 Meli API Fallida. Usando Cheerio...');
            }

            // INTENTO 2: AXIOS + CHEERIO (Rápido, 1-2 segundos)
            try {
                const searchUrl = `https://listado.mercadolibre.com.co/${encodeURIComponent(query).replace(/%20/g, '-')}`;
                const resp = await axios.get(searchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        'Accept-Language': 'es-CO,es;q=0.9',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    },
                    timeout: 7000
                });
                const cheerio = require('cheerio');
                const $ = cheerio.load(resp.data);
                
                const firstItem = $('.ui-search-result__wrapper, .ui-search-result').first();
                if (firstItem.length > 0) {
                    const title = firstItem.find('.ui-search-item__title').text().trim();
                    const priceTxt = firstItem.find('.poly-price__current .andes-money-amount__fraction').text() || 
                                     firstItem.find('.ui-search-price__second-line .andes-money-amount__fraction').text() ||
                                     firstItem.find('.price-tag-fraction').first().text();
                    const price = parseInt(priceTxt.replace(/\./g, '')) || 0;
                    const link = firstItem.find('a.ui-search-link, a.ui-search-item__group__element').attr('href');
                    
                    if (price > 0) {
                        console.log(`[AUDITOR] ✅ Meli Cheerio OK: ${price} para "${query}"`);
                        return { price, link, match: title, source: 'Cheerio' };
                    }
                }
            } catch (e) {
                logger.warn(`⚠️ Meli Cheerio Falló para "${query}": ${e.message}`);
            }

            // INTENTO 3: DEEP SCRAPER (PUPPETEER - Ultimo recurso)
            const searchUrlDeep = `https://listado.mercadolibre.com.co/${encodeURIComponent(query).replace(/%20/g, '-')}`;
            const data = await DeepScraper.scrape(searchUrlDeep);
            
            if (data && data.offerPrice > 0) {
                return {
                    price: data.offerPrice,
                    link: data.finalUrl,
                    match: data.title,
                    source: 'DeepScraper'
                };
            }
            return null;
        } catch (e) {
            logger.error(`⚠️ Error en Auditor Meli: ${e.message}`);
            return null;
        }
    }

    getFBMarketplaceLink(title) {
        const cleanQuery = title.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return `https://www.facebook.com/marketplace/bogota/search?query=${encodeURIComponent(cleanQuery)}`;
    }

    /**
     * TAREA: Obtener referencia de precios en Google Colombia
     */
    async getMarketPricesColombia(product) {
        try {
            const query = encodeURIComponent(`${product.title} precio Colombia laptop`);
            const searchUrl = `https://www.google.com/search?q=${query}&gl=co&hl=es-419&tbm=shop`;
            
            logger.info(`🔍 Buscando referencia de mercado: ${product.title}`);
            
            const DeepScraper = require('../utils/DeepScraper');
            const browser = await DeepScraper.getBrowser();
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CO,es;q=0.9' });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
            
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
            
            const prices = await page.evaluate(() => {
                const result = [];
                const selectors = ['.a83A0c', '.H8Ch6b', '.OFFNJ', '.VfPpkd-vQzf8d', 'span[aria-hidden="true"]', 'div[aria-hidden="true"]'];
                document.querySelectorAll(selectors.join(',')).forEach(el => {
                    const txt = el.innerText?.trim() || '';
                    const m = txt.match(/\$\s?([\d]{1,3}(?:\.[\d]{3})*(?:,[\d]{0,2})?)/);
                    if (m) {
                        const val = Math.round(parseFloat(m[1].replace(/\./g,'').replace(',','.')));
                        if (val >= 50000 && val <= 50000000) result.push(val);
                    }
                });
                return result;
            });

            await page.close();

            if (prices.length > 0) {
                // FILTRADO DE OUTLIERS
                prices.sort((a, b) => a - b);
                const medianValue = prices[Math.floor(prices.length / 2)];
                const validPrices = prices.filter(p => p > (medianValue * 0.4) && p < (medianValue * 2.5));

                if (validPrices.length > 0) {
                    const marketMedianCOP = validPrices[Math.floor(validPrices.length / 2)];
                    const p75Idx = Math.floor(validPrices.length * 0.75);
                    const marketHighCOP = validPrices[p75Idx] || marketMedianCOP;

                    // Guardar en el producto (metadatos)
                    product.marketMedianCOP = marketMedianCOP;
                    product.marketHighCOP = marketHighCOP;
                    product.marketSource = "google_colombia";

                    logger.info(`📊 Mercado CO: Mediana $${marketMedianCOP.toLocaleString()} | Alto $${marketHighCOP.toLocaleString()}`);
                    return { marketMedianCOP, marketHighCOP };
                }
            }
            return null;
        } catch (e) {
            logger.warn(`⚠️ Error buscando mercado Google: ${e.message}`);
            return null;
        }
    }

    async audit(deal) {
        logger.info(`⚖️ Auditoría de Élite + Arbitraje: ${deal.title.substring(0, 40)}...`);

        let report = {
            isGoodDeal: true,
            isHistoricLow: false,
            confidenceScore: 0,
            badge: null,
            reason: null,
            discount: 0,
            profit: 0,
            meliPrice: 0,
            costoTotal: 0,
            quality: 'Standard'
        };

        const { price_offer, price_official, title, weight } = deal;
        const lowTitle = title.toLowerCase();

        // --- FILTRO DE EXCLUSIÓN ---
        const blacklist = /bank|citbank|bitdefender|antivirus|subscription|suscripción|vpn|software|hosting|nordvpn|wsj|wall street journal|disney\+|paramount|hulu|netflix/i;
        if (blacklist.test(lowTitle)) {
            report.isGoodDeal = false;
            report.reason = 'Producto excluido: Servicios o Suscripciones.';
            return report;
        }

        // 1. CÁLCULO DE COSTOS DE IMPORTACIÓN A COLOMBIA
        const currentWeight = parseFloat(weight) || 3.0; // Default 3 lbs si no se detecta
        const shippingCost = currentWeight * this.shippingPerLibre;
        const subtotalUSD = price_offer + shippingCost;
        
        // Impuestos (Arancel + IVA) para compras > 200 USD
        const taxMultiplier = (price_offer > 200) ? 1.29 : 1.0; 
        const totalUSD = subtotalUSD * taxMultiplier;
        
        // Convertir a COP (TRM dinámica o estática)
        const totalCOP = Math.round(totalUSD * this.trm);
        report.costoTotal = totalCOP;
        deal.price_cop = totalCOP; // Guardar en el objeto deal

        // 2. COMPARATIVA CON MERCADOLIBRE COLOMBIA
        const meliData = await this.getMeliPrice(deal.title);
        if (meliData) {
            report.meliPrice = meliData.price;
            report.profit = meliData.price - totalCOP;
            deal.meli_link = meliData.link;
            logger.info(`📊 Arbitraje: CO $${meliData.price.toLocaleString()} vs USA $${totalCOP.toLocaleString()} | Profit: $${report.profit.toLocaleString()}`);
        }

        // 2.1 REFERENCIA DE PRECIOS GOOGLE COLOMBIA (NUEVO)
        await this.getMarketPricesColombia(deal);

        // 2.2 LINK DE FACEBOOK MARKETPLACE (PARA REFERENCIA MANUAL)
        deal.fb_link = this.getFBMarketplaceLink(deal.title);

        // 3. LIMPIEZA DE TÍTULO
        deal.title = deal.title.replace(/Slickdeals/gi, '').replace(/\[.*?\]/g, '').trim();

        // 4. ALGORITMO DE FILTRADO (REGLAS DE NEGOCIO)
        const savingsPercent = price_official > 0 ? Math.round(((price_official - price_offer) / price_official) * 100) : 0;
        report.discount = savingsPercent;

        // Regla: Si el Arbitraje es BRUTAL (> 100.000 COP de profit), es un GANADOR
        const IS_WINNER = report.profit > 120000;
        const IS_GOOD_PROFIT = report.profit > 60000;

        if (!IS_WINNER && !IS_GOOD_PROFIT && savingsPercent < 30 && !deal.isManual) {
            report.isGoodDeal = false;
            report.reason = 'Ni gran descuento en USA (>30%), ni arbitraje claro en Colombia.';
            return report;
        }

        // 5. ASIGNACIÓN DE PUNTUACIÓN Y BADGES
        let score = 50;
        if (IS_WINNER) {
            score += 40;
            report.badge = 'GANADOR ARBITRAJE 🏆';
            report.quality = 'Epic';
        } else if (savingsPercent >= 50) {
            score += 30;
            report.badge = 'LIQUIDACIÓN USA 📉';
            report.quality = 'Gold';
        } else {
            report.badge = 'OFERTA VERIFICADA';
            score += 10;
        }

        report.confidenceScore = Math.min(score, 100);
        deal.badge = report.badge;
        deal.score = report.confidenceScore;
        deal.profit = report.profit;

        logger.info(`✅ Auditoría completa: Score ${report.confidenceScore} | Profit: $${report.profit.toLocaleString()} | Badge: ${deal.badge}`);
        return report;
    }
}

module.exports = new PriceAuditorBot();

