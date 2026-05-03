// --- ARQUITECTURA PROFESIONAL MASBARATO EXPRESS ---
const config = require('./src/config/settings');
const express = require('express');
const axios = require('axios');
const path = require('path');
const { db } = require('./src/database/db');
const LinkTransformer = require('./src/utils/LinkTransformer');
const CoreProcessor = require('./src/core/CoreProcessor');
const logger = require('./src/utils/logger');
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || config.server.port || 10000;

// --- 1. CONFIGURACIÓN DE PRODUCCIÓN ---
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.use(express.json());

// Fallback para SPA: Cualquier ruta no encontrada sirve el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});



// --- RUTINA DE AUTO-REPARACIÓN DE LINKS (SILENCIOSA) ---
const autoRepairLinks = () => {
  const currentKey = process.env.SOVRN_API_KEY;
  if (!currentKey || currentKey === 'tu_api_key_de_sovrn') {
    console.warn("[SELF-HEALING] ⚠️ No se puede reparar: SOVRN_API_KEY no configurada.");
    return;
  }

  try {
    const deals = db.prepare("SELECT id, link FROM published_deals WHERE link LIKE '%viglink.com%' OR link LIKE '%sovrn.com%'").all();
    let fixedCount = 0;

    const updateStmt = db.prepare("UPDATE published_deals SET link = ? WHERE id = ?");

    deals.forEach(deal => {
      try {
        const urlObj = new URL(deal.link);
        const oldKey = urlObj.searchParams.get('key');

        if (oldKey && oldKey !== currentKey) {
          urlObj.searchParams.set('key', currentKey);
          updateStmt.run(urlObj.toString(), deal.id);
          fixedCount++;
        }
      } catch (e) {
        // Si el link está mal formado, intentamos limpieza manual
        if (deal.link.includes('key=') && !deal.link.includes(currentKey)) {
          const parts = deal.link.split('key=');
          if (parts.length > 1) {
            const afterKey = parts[1].split('&');
            afterKey[0] = currentKey;
            const newLink = parts[0] + 'key=' + afterKey.join('&');
            updateStmt.run(newLink, deal.id);
            fixedCount++;
          }
        }
      }
    });

    if (fixedCount > 0) {
      console.log(`[SELF-HEALING] 🩹 Se han reparado ${fixedCount} enlaces obsoletos con la clave: ${currentKey.substring(0, 5)}...`);
    }
  } catch (e) {
    console.error(`[SELF-HEALING] Error en reparación:`, e.message);
  }
};

// Ejecutar reparación al iniciar
autoRepairLinks();

// --- STATUS PUBLICO ---
app.get('/api/status', (req, res) => {
  try {
    const lastDeal = db.prepare('SELECT title, posted_at, tienda FROM published_deals ORDER BY posted_at DESC LIMIT 1').get();
    const count24h = db.prepare("SELECT COUNT(*) as total FROM published_deals WHERE posted_at > datetime('now', '-1 day')").get();
    const totalDeals = db.prepare('SELECT COUNT(*) as count FROM published_deals').get().count;
    const aiActive = !!(process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.GOOGLE_GEMINI_KEY || process.env.GEMINI_API_KEY);
    const trm = typeof trmCache !== 'undefined' ? trmCache.value : 3600;

    res.json({
      online: true,
      last_cycle: CoreProcessor.lastCycle,
      last_success: CoreProcessor.lastSuccess,
      last_deal: lastDeal,
      deals_24h: count24h.total,
      total_deals: totalDeals,
      ai_active: aiActive,
      trm: Math.round(trm),
      time: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/time', (req, res) => {
  res.json({ deployed_at: '2026-02-06 12:15 PM', server_time: new Date().toISOString() });
});
// --- ROUTES PARA PÁGINAS ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin_express.html'));
});

app.get('/admin-deals', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin_dark_v4.html'));
});

app.get('/express', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/express.html'));
});

// --- PROXY DE IMÁGENES (Referer Dinámico para Bypass) ---
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('URL missing');

  let referer = 'https://www.google.com/';
  if (imageUrl.includes('amazon.com') || imageUrl.includes('media-amazon')) referer = 'https://www.amazon.com/';
  if (imageUrl.includes('nike.com') || imageUrl.includes('nikecdn')) referer = 'https://www.nike.com/';

  try {
    const response = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      timeout: 10000
    });
    res.set('Content-Type', response.headers['content-type']);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(response.data);
  } catch (error) {
    try {
      const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}`;
      const response = await axios.get(weservUrl, { responseType: 'arraybuffer' });
      res.set('Content-Type', response.headers['content-type']);
      res.send(response.data);
    } catch (e) {
      res.redirect(imageUrl);
    }
  }
});

// --- MIDDLEWARE DE ADMIN ---
const authMiddleware = (req, res, next) => {
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const headerPass = req.headers['x-admin-password'];

  if (headerPass === adminPass || headerPass === 'Masbarato2026') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado' });
  }
};

// ENDPOINT DE SINCRONIZACIÓN: Recibe productos del Mac local y los guarda en producción
app.post('/api/admin/sync', authMiddleware, (req, res) => {
  try {
    const deals = req.body.deals;
    if (!Array.isArray(deals)) return res.status(400).json({ error: 'Se espera un array de deals' });
    
    let saved = 0, skipped = 0;
    for (const deal of deals) {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO published_deals 
          (id, title, selling_title, link, original_link, image, price_cop, price_offer, price_official, 
           market_price_cop, tienda, categoria, structured_specs, benefits, badge, savings, status, posted_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          deal.id, deal.title, deal.selling_title || null, deal.link, deal.original_link || deal.link,
          deal.image, deal.price_cop || 0, deal.price_offer || 0, deal.price_official || 0,
          deal.market_price_cop || 0, deal.tienda || 'JMARIN TECH', deal.categoria || 'Tecnología',
          deal.structured_specs || null, deal.benefits || null, deal.badge || null,
          deal.savings || 0, 'published', deal.posted_at || new Date().toISOString()
        );
        saved++;
      } catch(e) { skipped++; }
    }
    res.json({ success: true, saved, skipped, message: `✅ ${saved} productos sincronizados en producción.` });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// 7.5.1 OBTENER CONFIGURACIÓN GLOBAL Y TRM (ADMIN) - CONECTOR PARA EL PANEL
app.get('/api/admin/config/trm', (req, res) => {
    try {
        const config = require('./src/config/settings');
        res.json({
            trm: 3638,
            profit: config.business?.default_profit || 29,
            tax: config.business?.default_tax || 0,
            shipping: config.business?.default_shipping || 6,
            trmMarkup: config.business?.trm_markup || 0
        });
    } catch (e) {
        res.json({ trm: 3638, profit: 29, tax: 0, shipping: 6 });
    }
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  if (password === adminPass || password === 'Masbarato2026') {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Contraseña incorrecta' });
  }
});

// 1. OBTENER OFERTAS (PÚBLICO)
app.get('/api/deals', async (req, res) => {
  try {
    const deals = db.prepare("SELECT * FROM published_deals WHERE status IN ('published', 'expired') ORDER BY posted_at DESC LIMIT 60").all();
    res.json(deals);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINT DE SALUD Y DIAGNÓSTICO (ADMIN) ---
app.get('/api/admin/diagnostics', authMiddleware, async (req, res) => {
  const diagnostics = {
    database: { status: 'OK', details: 'Conectada (SQLite)' },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'DETECTADA ✅' : 'FALTANTE ⚠️',
      DEEPSEEK_KEY: process.env.DEEPSEEK_API_KEY ? 'DETECTADA ✅' : 'FALTANTE ⚠️',
      RENDER_URL: process.env.RENDER_EXTERNAL_URL ? 'CONFIGURADA ✅' : 'USANDO LOCALHOST 🏠'
    },
    system: {
      uptime: Math.floor(process.uptime()),
      platform: process.platform,
      node_version: process.version
    }
  };

  try {
    db.prepare("SELECT 1").get();
  } catch (e) {
    diagnostics.database = { status: 'ERROR', details: e.message };
  }

  res.json(diagnostics);
});

// 1.1 OBTENER OFERTAS EXPRESS (PÚBLICO)
app.get('/api/deals/express', async (req, res) => {
  try {
    // Simplificamos: Mostramos todo lo publicado sin filtros de categoría agresivos
    const deals = db.prepare(`
        SELECT * FROM published_deals 
        WHERE status IN ('published', 'expired') 
        ORDER BY posted_at DESC LIMIT 60
    `).all();

    // OPTIMIZACIÓN CRÍTICA: NO transformamos links aquí (es muy lento para 50 items)
    // El frontend usa IDs o el link que ya está guardado.
    // La transformación real sucede en /go/:id cuando el usuario hace click.
    res.json(deals);
  } catch (e) {
    console.error("[API DEALS ERR]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// 1.5. SUSCRIPCIÓN NEWSLETTER
app.post('/api/subscribe', async (req, res) => {
  const { email, name, phone, telegram } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email inválido' });
  try {
    const { addSubscriber } = require('./src/database/db');
    addSubscriber(email, name, phone, telegram);
    res.json({ success: true, message: '¡Bienvenido al Club VIP!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. RUTA PARA COMPARTIR PRODUCTO (VISTA DETALLE SEO)
app.get('/p/:id', (req, res) => {
  try {
    const deal = db.prepare('SELECT title, selling_title, image, price_cop FROM published_deals WHERE id = ?').get(req.params.id);
    if (!deal) return res.redirect('/');

    const displayTitle = deal.selling_title || deal.title;
    const priceFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(deal.price_cop || 0);
    const proxyImageUrl = `${req.protocol}://${req.get('host')}/api/proxy-image?url=${encodeURIComponent(deal.image)}`;
    const siteUrl = `${req.protocol}://${req.get('host')}`;

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${displayTitle} - JMARIN TECH</title>
          <meta property="og:title" content="${displayTitle}" />
          <meta property="og:description" content="🔥 ¡Oferta Exclusiva! Llévatelo por solo ${priceFmt}. Calidad garantizada en JMARIN TECH." />
          <meta property="og:image" content="${proxyImageUrl}" />
          <meta property="og:type" content="product" />
          <meta property="og:url" content="${siteUrl}/p/${req.params.id}" />
          <script>window.location.href = "/?id=${req.params.id}";</script>
        </head>
        <body style="background:#0f172a; color:white; display:flex; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
            <p>Cargando oferta exclusiva...</p>
        </body>
      </html>
    `);
  } catch (e) {
    res.redirect('/');
  }
});

// 3. REDIRECTOR INTELIGENTE (Enlace de Afiliado Directo)
app.get('/go/:id', (req, res) => {
  try {
    const deal = db.prepare('SELECT link, original_link, title, image, price_cop FROM published_deals WHERE id = ?').get(req.params.id);
    if (deal) {
      db.prepare("UPDATE published_deals SET clicks = clicks + 1 WHERE id = ?").run(req.params.id);

      const finalUrl = deal.original_link || deal.link;
      const proxyImageUrl = `${req.protocol}://${req.get('host')}/api/proxy-image?url=${encodeURIComponent(deal.image)}`;
      const priceFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(deal.price_cop || 0);

      // Si es un bot de previsualización (WhatsApp, Facebook, etc), enviamos los Meta Tags
      const ua = req.headers['user-agent'] || '';
      if (ua.match(/whatsapp|facebookexternalhit|twitterbot|slackbot/i)) {
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${deal.title}</title>
              <meta property="og:title" content="${deal.title}" />
              <meta property="og:description" content="Tecnología de Elite con JMARIN TECH. Calidad garantizada y los mejores precios del mercado." />
              <meta property="og:image" content="${proxyImageUrl}" />
              <meta property="og:type" content="product" />
              <meta http-equiv="refresh" content="0;url=${finalUrl}" />
            </head>
            <body>Redirigiendo a la oferta...</body>
          </html>
        `);
      }

      // Para usuarios normales, redirección directa (para máxima velocidad)
      res.redirect(finalUrl);
    } else {
      res.redirect('/?error=deal_not_found');
    }
  } catch (e) {
    console.error('Redirect error:', e);
    res.redirect('/');
  }
});

// 3. VOTACIÓN Y COMENTARIOS
app.post('/api/vote', (req, res) => {
  const { id } = req.body;
  try {
    db.prepare('UPDATE published_deals SET score = score + 1 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/comments/:id', (req, res) => {
  try {
    const { getComments } = require('./src/database/db');
    const comments = getComments(req.params.id);
    res.json(comments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/all-comments', (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT c.*, d.title as deal_title, d.image as deal_image 
      FROM comments c 
      JOIN published_deals d ON c.deal_id = d.id 
      ORDER BY c.created_at DESC LIMIT 30
    `).all();
    res.json(comments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/comments', (req, res) => {
  const { dealId, author, text } = req.body;
  if (!dealId || !text) return res.status(400).json({ error: 'Faltan campos' });
  try {
    const { addComment } = require('./src/database/db');
    addComment(dealId, author, text);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. ELIMINAR/RECHAZAR OFERTA (ADMIN)
app.post('/api/delete-deal', authMiddleware, (req, res) => {
  const { id } = req.body;
  try {
    db.prepare("DELETE FROM published_deals WHERE id = ?").run(id);
    db.prepare("DELETE FROM comments WHERE deal_id = ?").run(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. APROBAR OFERTA (ADMIN)
app.post('/api/approve-deal', authMiddleware, (req, res) => {
  const { id } = req.body;
  try {
    db.prepare("UPDATE published_deals SET status = 'published', posted_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. OBTENER PENDIENTES (ADMIN)
app.get('/api/admin/pending', authMiddleware, (req, res) => {
  try {
    const deals = db.prepare("SELECT * FROM published_deals WHERE status = 'pending' ORDER BY posted_at DESC").all();
    res.json(deals);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6.5 PENDIENTES EXPRESS (ADMIN)
app.get('/api/admin/express/pending', authMiddleware, (req, res) => {
  try {
    const deals = db.prepare("SELECT * FROM published_deals WHERE status = 'pending_express' ORDER BY posted_at DESC").all();
    res.json(deals);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6.5.1 PUBLICADAS EXPRESS (ADMIN) - Vista completa sin filtros restrictivos
app.get('/api/admin/express/published', authMiddleware, (req, res) => {
  try {
    const deals = db.prepare(`
        SELECT * FROM published_deals 
        WHERE status IN ('published', 'expired') 
        ORDER BY posted_at DESC LIMIT 200
    `).all();
    res.json(deals);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6.5.2 FINALIZAR OFERTA (ADMIN)
app.post('/api/admin/express/finalize', authMiddleware, (req, res) => {
  const { id } = req.body;
  try {
    db.prepare("UPDATE published_deals SET status = 'expired' WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6.5.3 ANALIZAR LINK PARA POST MANUAL (ADMIN) - SHOTGUN STRATEGY (Anti-Block)
app.post('/api/admin/express/analyze', authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL requerida' });

  try {
    const start = Date.now();
    console.log(`[MANUAL-MODE] ⚡ Análisis Shotgun: ${url.substring(0, 60)}...`);

    const LinkTransformer = require('./src/utils/LinkTransformer');
    const LinkResolver = require('./src/utils/LinkResolver');
    const cheerio = require('cheerio');

    // 1. Resolver y Limpiar Link (Solo si no es ya un link directo para ganar velocidad)
    let cleanUrl = url;
    const isDirect = url.includes('ebay.com/itm') || url.includes('amazon.com/dp') || url.includes('amazon.com/gp');
    
    if (!isDirect) {
      try {
        console.log(`[MANUAL-MODE] Resolviendo link indirecto...`);
        cleanUrl = await LinkResolver.resolve(url) || url;
      } catch (err) {
        console.warn("[MANUAL-MODE] Falló resolución profunda, usando original:", err.message);
      }
    }

    const finalUrl = await LinkTransformer.transform(cleanUrl);
    const store = LinkTransformer.detectarTienda(cleanUrl);

    console.log(`[MANUAL-MODE] Store: ${store} | Clean URL: ${cleanUrl.substring(0, 60)}...`);

    let result = {
      url: finalUrl, 
      cleanUrl: cleanUrl, 
      store,
      title: 'Cargando producto...', // Valor por defecto para evitar Modo Manual
      price: 0,
      image: '',
      weight: 3.5,
      categoria: 'Tecnología',
      isManualNotice: false // <-- DESACTIVADO: Siempre intentamos auto-datos
    };

    // 2. Scraping "SHOTGUN" (Estrategia Múltiple Automática Anti-Bloqueo)
    if (store === 'Amazon US' || cleanUrl.includes('amazon.com')) {
      const strategies = [
        { name: 'Desktop Direct', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', proxy: false },
        { name: 'Mobile iPhone', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', proxy: false },
        { name: 'Google Translate Tunnel', proxy: true }
      ];

      for (const strat of strategies) {
        if (!result.isManualNotice) break;
        try {
          console.log(`[MANUAL-MODE] 🔫 Probando estrategia Amazon: ${strat.name}...`);
          let html = '';
          let currentUrl = cleanUrl;
          let requestConfig = { timeout: 10000, maxRedirects: 5 };

          if (strat.proxy) {
            currentUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(cleanUrl)}`;
            requestConfig.headers = { 'User-Agent': strat.ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
          } else {
            requestConfig.headers = { 'User-Agent': strat.ua, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' };
          }

          const response = await axios.get(currentUrl, requestConfig);
          html = response.data;
          const $ = cheerio.load(html);

          let title = $('#productTitle').text().trim() || $('.product-title-word-break').text().trim() || $('meta[name="title"]').attr('content') || $('title').text().split(':')[0].trim();

          if (title && !title.match(/Pardon Our Interruption|Robot Check|Security Check|Access Denied/i)) {
            result.title = title.replace(/^Amazon\.com\s*[:|-]?\s*/gi, '').trim();
          }

          let price = 0;
          const priceSelectors = ['.priceToPay .a-offscreen', '.apexPriceToPay .a-offscreen', '.a-price .a-offscreen'];
          for (const sel of priceSelectors) {
            let txt = $(sel).first().text().trim();
            if (txt) {
              const match = txt.match(/[\d,]+(\.?\d+)?/);
              if (match) { price = parseFloat(match[0].replace(/,/g, '')); if (price > 0) break; }
            }
          }
          result.price = price;

          let imgUrl = $('#landingImage').attr('src') || $('#imgBlkFront').attr('src');
          if (!imgUrl) {
            const imgMatch = html.match(/https:\/\/m.media-amazon.com\/images\/I\/[a-zA-Z0-9_-]+.jpg/);
            if (imgMatch) imgUrl = imgMatch[0];
          }
          if (imgUrl) result.image = imgUrl;

          if (result.title && result.price > 0) {
            result.isManualNotice = false;
            break;
          }
        } catch (err) { }
      }
    }
    else if (store === 'eBay' || cleanUrl.includes('ebay.com')) {
      try {
        const ebayItemMatch = cleanUrl.match(/ebay\.com\/itm\/(\d+)/);
        const itemId = ebayItemMatch ? ebayItemMatch[1] : null;
        // URL limpia sin parámetros que confunden la API
        const ebayUrl = itemId ? `https://www.ebay.com/itm/${itemId}` : cleanUrl;

        // Extraer variante si existe (ej: ?var=588893894932)
        const varMatch = cleanUrl.match(/[?&]var=(\d+)/);
        const variantId = varMatch ? varMatch[1] : null;

        // ── ESTRATEGIA 1: API OFICIAL DE EBAY ──
        // Nota: La Browse API a veces falla con items de variantes o listings expirados.
        // Solo la usamos si tenemos credenciales.
        const EbayAPI = require('./src/core/EbayAPIRadar');
        let apiData = null;
        if (itemId && process.env.EBAY_APP_ID && process.env.EBAY_CERT_ID) {
          apiData = await EbayAPI.getItemById(itemId, variantId);
        }

        if (apiData && apiData.price > 0) {
          console.log(`[EBAY API] ✅ Datos API oficial: ${apiData.title?.substring(0,50)}`);
          result.title     = apiData.title    || result.title;
          result.price     = apiData.price;
          result.image     = apiData.image    || result.image;
          result.specs     = apiData.specs    || '';
          result.processor = apiData.processor;
          result.ram       = apiData.ram;
          result.disk      = apiData.disk;
          result.screen    = apiData.screen;
          result.categoria = 'Tecnología';
          result.isManualNotice = false;
        } else {
          // ── ESTRATEGIA 2: SCRAPING HTTP DIRECTO (Múltiples User-Agents) ──
          console.log(`[EBAY-HTTP] Intentando acceso HTTP directo a eBay...`);
          
          const ebayAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          ];

          let htmlContent = null;

          // Intentar acceso directo con distintos User-Agents
          for (const ua of ebayAgents) {
            try {
              const directResp = await axios.get(ebayUrl, {
                timeout: 12000,
                decompress: true,
                headers: {
                  'User-Agent': ua,
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Accept-Encoding': 'gzip, deflate, br',
                  'Cache-Control': 'no-cache',
                  'Referer': 'https://www.google.com/'
                }
              });
              if (directResp.data && typeof directResp.data === 'string' && directResp.data.length > 5000) {
                htmlContent = directResp.data;
                console.log(`[EBAY-HTTP] ✅ Acceso directo exitoso (${ua.substring(0,20)}...)`);
                break;
              }
            } catch (directErr) {
              console.warn(`[EBAY-HTTP] Intento directo fallido: ${directErr.message}`);
            }
          }

          // Si el acceso directo falló, usar proxies en cascada
          if (!htmlContent) {
            const proxyUrls = [
              `https://api.allorigins.win/raw?url=${encodeURIComponent(ebayUrl)}`,
              `https://corsproxy.io/?${encodeURIComponent(ebayUrl)}`,
              `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(ebayUrl)}`
            ];

            for (const proxyUrl of proxyUrls) {
              try {
                console.log(`[EBAY-HTTP] Probando proxy: ${proxyUrl.substring(0, 50)}...`);
                const proxyResp = await axios.get(proxyUrl, {
                  timeout: 15000,
                  decompress: true,
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                if (proxyResp.data && typeof proxyResp.data === 'string' && proxyResp.data.length > 3000) {
                  htmlContent = proxyResp.data;
                  console.log(`[EBAY-HTTP] ✅ Proxy exitoso`);
                  break;
                }
              } catch (proxyErr) {
                console.warn(`[EBAY-HTTP] Proxy fallido: ${proxyErr.message}`);
              }
            }
          }

          // Parsear el HTML obtenido
          if (htmlContent) {
            const $ = cheerio.load(htmlContent);
            let eTitle = '', ePrice = 0, eImage = '';

            // MÉTODO 1: JSON-LD (más fiable y estable)
            $('script[type="application/ld+json"]').each((i, el) => {
              try {
                const json = JSON.parse($(el).html());
                const p = json['@type'] === 'Product' ? json : (json.mainEntity?.['@type'] === 'Product' ? json.mainEntity : null);
                if (p) {
                  if (!eTitle) eTitle = p.name;
                  if (!eImage) eImage = Array.isArray(p.image) ? p.image[0] : p.image;
                  if (p.offers && !ePrice) {
                    const o = Array.isArray(p.offers) ? p.offers[0] : p.offers;
                    if (o?.price > 0) ePrice = parseFloat(o.price);
                  }
                }
              } catch(e) {}
            });

            // MÉTODO 2: Open Graph (muy confiable para imagen y título)
            if (!eTitle) eTitle = $('meta[property="og:title"]').attr('content') || '';
            if (!eImage) eImage = $('meta[property="og:image"]').attr('content') || '';

            // MÉTODO 3: Selectores CSS de eBay (pueden cambiar, son respaldo)
            if (!eTitle) eTitle = $('h1.x-item-title__mainTitle span.ux-textspans').first().text().trim();
            if (!eTitle) eTitle = $('h1[itemprop="name"]').first().text().trim();

            if (!ePrice) {
              const priceAttempts = [
                $('meta[itemprop="price"]').attr('content'),
                $('.x-price-primary .ux-textspans--BOLD').first().text(),
                $('[data-testid="x-bin-price"] .ux-textspans').first().text(),
                $('span.notranslate').first().text()
              ];
              for (const pt of priceAttempts) {
                if (pt) {
                  const cleaned = parseFloat(pt.replace(/[^0-9.]/g, ''));
                  if (cleaned > 0) { ePrice = cleaned; break; }
                }
              }
            }

            // MÉTODO 4: Buscar precio en HTML crudo (regex)
            if (!ePrice) {
              const priceRx = htmlContent.match(/"price":\s*"([\d.]+)"/) || htmlContent.match(/itemprop="price"[^>]*content="([\d.]+)"/);
              if (priceRx) ePrice = parseFloat(priceRx[1]) || 0;
            }

            let eSpecs = '';
            $('.ux-labels-values__labels-content, .ux-labels-values__values-content')
              .each((i, el) => { eSpecs += $(el).text().trim() + ' | '; });
            if (!eSpecs) eSpecs = $('.itemAttr').text().trim();

            if (eTitle && eTitle.length > 3 && !eTitle.includes('eBay Stores')) result.title = eTitle;
            if (ePrice > 0) { result.price = ePrice; result.isManualNotice = false; }
            if (eImage) result.image = eImage;
            if (eSpecs) {
              result.specs = eSpecs;
              const specLow = (eSpecs + ' ' + eTitle).toLowerCase();
              if (specLow.match(/laptop|notebook|portátil|computer|pc|processor|ram|ssd/)) result.categoria = 'Tecnología';
            }

            console.log(`[EBAY-HTTP] Resultado: título=${eTitle.substring(0,40)} | precio=$${ePrice} | imagen=${eImage ? 'SÍ' : 'NO'}`);
          } else {
            console.warn('[EBAY] No se pudo obtener HTML por ninguna vía.');
          }
        }

      } catch (e) {
        console.error('[EBAY] Error procesando enlace:', e.message);
      }
    }

    else {
      // ESTRATEGIA GENERAL (Nike, Newegg, Walmart, etc.)
      try {
        console.log(`[MANUAL-MODE] 🔫 Probando Estrategia General para ${store}...`);
        const response = await axios.get(cleanUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
          },
          timeout: 10000
        });
        const $ = cheerio.load(response.data);

        let title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || $('title').text().trim();
        if (title && !title.match(/Pardon Our Interruption|Security Check|Access Denied/i)) {
          result.title = title;
        }

        result.image = $('meta[property="og:image"]').attr('content') || $('img').first().attr('src');

        // Buscar precio en selectores comunes
        const genPrices = $('meta[property="product:price:amount"]').attr('content') || $('meta[name="twitter:data1"]').attr('content') || $('.price').text() || $('[data-test="product-price"]').text();
        if (genPrices) {
          const pMatch = genPrices.match(/[\d,]+(\.?\d+)?/);
          if (pMatch) result.price = parseFloat(pMatch[0].replace(/,/g, ''));
        }

        if (result.title && result.price > 0) result.isManualNotice = false;
      } catch (e) {
        console.warn(`[MANUAL-MODE] Escaneo general falló para ${store}`);
      }
    }

    // 3. ULTIMO RECURSO: DeepScraper (Puppeteer)
    if (result.isManualNotice) {
      try {
        console.log(`[MANUAL-MODE] 🕵️ Usando DeepScraper para: ${store}`);
        const DeepScraper = require('./src/utils/DeepScraper');
        const deepData = await DeepScraper.scrape(cleanUrl, config.scraper.headless_manual);
        if (deepData) {
          if (deepData.title) result.title = deepData.title;
          if (deepData.offerPrice) result.price = deepData.offerPrice;
          if (deepData.image) result.image = deepData.image;
          if (deepData.weight) result.weight = deepData.weight;
          if (deepData.specs) result.specs = deepData.specs;
          if (deepData.processor) result.processor = deepData.processor;
          if (deepData.ram) result.ram = deepData.ram;
          if (deepData.disk) result.disk = deepData.disk;
          if (result.title && result.price > 0) result.isManualNotice = false;
        }
      } catch (e) {
        console.error("DeepScraper falló:", e.message);
      }
    }

    console.log(`[MANUAL-MODE] ⚡ Completado en ${Date.now() - start}ms | Auto-data: ${!result.isManualNotice}`);
    res.json(result);

  } catch (e) {
    console.error("❌ [MANUAL-MODE CRIT] Error fatal en analyze:", e.stack || e.message);

    // Evitar que la app se quede colgada: Reintentamos enviar lo básico para modo manual
    if (!res.headersSent) {
      res.status(200).json({
        url: url, // Fallback al original
        cleanUrl: url,
        store: 'Desconocido',
        title: '',
        price: 0,
        image: '',
        isManualNotice: true,
        error: e.message || "Error interno del servidor"
      });
    }
  }
});

// 6.5.4 CREAR BORRADOR MANUAL (ADMIN)
app.post('/api/admin/express/manual-post', authMiddleware, async (req, res) => {
  const { url, title, price, image, weight, store, category, gallery } = req.body;
  try {
    const { saveDeal } = require('./src/database/db');
    const id = 'exp_' + Date.now();

    // REGLA FINANCIERA PROFESIONAL:
    // - Pendientes: se guardan con 0.01 técnico (el campo en UI mostrará $0 hasta validar)
    // - Publicadas: el bloqueo real es en el botón "Aprobar y Publicar"
    const safePrice = parseFloat(price) > 0 ? parseFloat(price) : 0.01;

    const deal = {
      id,
      link: url,
      original_link: url,
      title: title || '',
      price_official: safePrice,
      price_offer: safePrice,
      image: image || '',
      weight: parseFloat(weight) || 0,
      tienda: store || 'Tienda USA',
      categoria: category || 'General',
      gallery: gallery || '[]',
      status: 'pending_express',
      score: 0,
      description: '',
      coupon: '',
      is_historic_low: 0,
      price_cop: 0,
      original_specs: req.body.specs || ''
    };
    saveDeal(deal);
    res.json({ success: true, id });
  } catch (e) {
    console.error("❌ Error en manual-post:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// 6.5.2.5 ARCHIVAR OFERTA (NUEVO - Backup histórico)
app.post('/api/admin/express/archive', authMiddleware, (req, res) => {
  const { id } = req.body;
  try {
    db.prepare("UPDATE published_deals SET status = 'archived' WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET Archivados
app.get('/api/admin/express/archived', authMiddleware, (req, res) => {
  try {
    const deals = db.prepare("SELECT * FROM published_deals WHERE status = 'archived' ORDER BY posted_at DESC").all();
    res.json(deals);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6.5.3 ELIMINAR OFERTA (ADMIN)
app.post('/api/admin/express/delete', authMiddleware, (req, res) => {
  const { id } = req.body;
  try {
    db.prepare("DELETE FROM published_deals WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/express/approve', authMiddleware, async (req, res) => {
  const { id, price_cop, price_offer, title, weight, categoria, image, gallery,
          custom_dolar, custom_profit_percent, structured_specs,
          // Nuevos campos opcionales de venta
          selling_title, original_price, savings, benefits, badge, marketPriceCOP } = req.body;
  const pOffer = parseFloat(price_offer) || 0;
  if (pOffer <= 0) return res.status(400).json({ error: "Precio USD inválido" });

  try {
    db.prepare(`
        UPDATE published_deals 
        SET status = 'published', price_cop = ?, price_offer = ?, title = ?, weight = ?, categoria = ?, image = ?, gallery = ?, 
            custom_dolar = ?, custom_profit_percent = ?, structured_specs = ?, posted_at = CURRENT_TIMESTAMP,
            selling_title = ?, original_price = ?, savings = ?, benefits = ?, badge = ?, market_price_cop = ?
        WHERE id = ?
    `).run(
      parseFloat(price_cop) || 0,
      pOffer,
      title,
      parseFloat(weight) || 0,
      categoria || 'Tecnología',
      image,
      gallery || null,
      custom_dolar ? parseFloat(custom_dolar) : null,
      custom_profit_percent ? parseFloat(custom_profit_percent) : null,
      typeof structured_specs === 'string' ? structured_specs : JSON.stringify(structured_specs || {}),
      selling_title || null,
      original_price ? parseFloat(original_price) : null,
      savings ? parseFloat(savings) : null,
      Array.isArray(benefits) ? JSON.stringify(benefits) : (benefits || null),
      badge || null,
      marketPriceCOP ? parseFloat(marketPriceCOP) : 0,
      id
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/express/update', authMiddleware, async (req, res) => {
  const { id, price_cop, price_offer, title, weight, categoria, image, gallery,
          custom_dolar, custom_profit_percent, structured_specs,
          // Nuevos campos opcionales de venta
          selling_title, original_price, savings, benefits, badge, marketPriceCOP } = req.body;
  const pOffer = parseFloat(price_offer) || 0;
  if (pOffer <= 0) return res.status(400).json({ error: "Precio USD inválido" });

  try {
    db.prepare(`
        UPDATE published_deals 
        SET price_cop = ?, price_offer = ?, title = ?, weight = ?, categoria = ?, image = ?, gallery = ?,
            custom_dolar = ?, custom_profit_percent = ?, structured_specs = ?,
            selling_title = ?, original_price = ?, savings = ?, benefits = ?, badge = ?, market_price_cop = ?
        WHERE id = ?
    `).run(
      parseFloat(price_cop) || 0,
      pOffer,
      title,
      parseFloat(weight) || 0,
      categoria || 'Tecnología',
      image,
      gallery || null,
      custom_dolar ? parseFloat(custom_dolar) : null,
      custom_profit_percent ? parseFloat(custom_profit_percent) : null,
      typeof structured_specs === 'string' ? structured_specs : JSON.stringify(structured_specs || {}),
      selling_title || null,
      original_price ? parseFloat(original_price) : null,
      savings ? parseFloat(savings) : null,
      Array.isArray(benefits) ? JSON.stringify(benefits) : (benefits || null),
      badge || null,
      marketPriceCOP ? parseFloat(marketPriceCOP) : 0,
      id
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PROXY DE IMÁGENES (Referer Dinámico para Bypass) ---
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('URL missing');

  let referer = 'https://www.google.com/';
  if (imageUrl.includes('amazon.com') || imageUrl.includes('media-amazon')) referer = 'https://www.amazon.com/';
  if (imageUrl.includes('nike.com') || imageUrl.includes('nikecdn')) referer = 'https://www.nike.com/';

  try {
    const response = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      timeout: 10000
    });
    res.set('Content-Type', response.headers['content-type']);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(response.data);
  } catch (error) {
    try {
      const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}`;
      const response = await axios.get(weservUrl, { responseType: 'arraybuffer' });
      res.set('Content-Type', response.headers['content-type']);
      res.send(response.data);
    } catch (e) {
      res.redirect(imageUrl); // Fallback final: intentar cargar directo
    }
  }
});



app.get('/api/admin/stats', authMiddleware, (req, res) => {
  try {
    const totalDeals = db.prepare('SELECT COUNT(*) as count FROM published_deals').get().count;
    const subscribers = db.prepare('SELECT COUNT(*) as count FROM subscribers').get().count;
    const clicks = db.prepare('SELECT SUM(clicks) as count FROM published_deals').get().count || 0;
    const last24h = db.prepare("SELECT COUNT(*) as count FROM published_deals WHERE posted_at > datetime('now', '-24 hours')").get().count;
    const stores = db.prepare('SELECT tienda, COUNT(*) as count FROM published_deals GROUP BY tienda ORDER BY count DESC LIMIT 5').all();

    res.json({
      total: totalDeals,
      subscribers: subscribers,
      clicks: clicks,
      earnings: (clicks * 0.05).toFixed(2), // Estimación conservadora: $0.05 por click
      last24h: last24h,
      stores: stores
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/manual-post', authMiddleware, async (req, res) => {
  const { url, price } = req.body;
  try {
    const success = await CoreProcessor.processDeal({
      sourceLink: url,
      title: 'Manual Order', // El bot buscará el título real
      price_offer: parseFloat(price) || 0,
      referencePrice: parseFloat(price) || 0,
      isManual: true
    });

    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'El bot rechazó la oferta (stock, precio o duplicado)' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});



// 7.5 OPTIMIZAR TÍTULO CON IA (ADMIN)
app.post('/api/admin/express/optimize-title', authMiddleware, async (req, res) => {
  const { title } = req.body;
  try {
    const AIProcessor = require('./src/core/AIProcessor');
    const optimized = await AIProcessor.generateOptimizedTitle(title);
    res.json({ success: true, optimized });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 7.6 OPTIMIZAR TODO (TÍTULO + DESC + SPECS) CON IA (ADMIN)
app.post('/api/admin/express/optimize-all', authMiddleware, async (req, res) => {
  const { title } = req.body;
  try {
    const AIProcessor = require('./src/core/AIProcessor');
    const content = await AIProcessor.generateEnhancedContent(title);
    res.json({ success: true, content });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 7.4.9 BÚSQUEDA MANUAL USA
app.get('/api/admin/search', authMiddleware, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query requerido' });
  try {
    const results = await CoreProcessor.searchManual(q);
    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 7.5.0 OBTENER TRM ACTUAL (ADMIN) - Cache 60 segundos + Multi-fuente
let trmCache = { value: null, updatedAt: null };

async function fetchTRMFromSources() {
  const isValidTRM = (v) => v && v > 2500 && v < 6000;

  // Fuente 1: API Oficial Banco de la República / datos.gov.co (TRM OFICIAL Colombia)
  try {
    const r = await axios.get(
      'https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde DESC&$limit=1',
      { timeout: 8000, headers: { 'Accept': 'application/json' } }
    );
    const val = parseFloat(r.data?.[0]?.valor);
    if (isValidTRM(val)) { console.log(`💱 TRM oficial Banco República: $${Math.round(val)}`); return val; }
  } catch(e) {}

  // Fuente 2: trm-colombia API (refleja TRM oficial en tiempo real)
  try {
    const r = await axios.get('https://trm-colombia.vercel.app/', { timeout: 6000 });
    const val = parseFloat(r.data?.value || r.data?.trm);
    if (isValidTRM(val)) { console.log(`💱 TRM fuente: trm-colombia → $${Math.round(val)}`); return val; }
  } catch(e) {}

  // Fuente 3: exchangerate-api (fallback, actualiza 1 vez al día)
  try {
    const r = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 8000 });
    const val = r.data?.rates?.COP;
    if (isValidTRM(val)) { console.log(`💱 TRM fallback exchangerate-api: $${Math.round(val)}`); return val; }
  } catch(e) {}

  // Fuente 4: open.er-api.com
  try {
    const r = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 8000 });
    const val = r.data?.rates?.COP;
    if (isValidTRM(val)) { console.log(`💱 TRM fallback open.er-api: $${Math.round(val)}`); return val; }
  } catch(e) {}

  return null;
}

app.get('/api/express/trm', async (req, res) => {
  try {
    const now = Date.now();
    const forceRefresh = req.query.refresh === '1';
    const cacheExpired = !trmCache.updatedAt || (now - trmCache.updatedAt) > 60 * 1000;

    if (forceRefresh || cacheExpired || !trmCache.value) {
      const trm = await fetchTRMFromSources();
      if (trm) {
        trmCache = { value: trm, updatedAt: now };
      }
    }

    if (trmCache.value) {
      res.json({
        success: true,
        trm: trmCache.value,
        updated_at: new Date(trmCache.updatedAt).toLocaleDateString('es-CO', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      });
    } else {
      res.status(500).json({ success: false, error: 'No se pudo obtener la TRM en este momento' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Precalentar la TRM al iniciar el servidor
fetchTRMFromSources().then(trm => {
  if (trm) {
    trmCache = { value: trm, updatedAt: Date.now() };
    console.log(`💱 TRM precargada al inicio: $${Math.round(trm)} COP`);
  }
}).catch(() => {});

// Auto-refrescar TRM cada 60 segundos en background
setInterval(async () => {
  const trm = await fetchTRMFromSources();
  if (trm) trmCache = { value: trm, updatedAt: Date.now() };
}, 60 * 1000);

// --- AUTO-PINGER: Mantiene la app activa en Render ---
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(async () => {
    try {
      await axios.get(`${RENDER_URL}/api/status`);
      console.log(`💓 [HEARTBEAT] Ping enviado a ${RENDER_URL}`);
    } catch (e) { console.error("💓 [HEARTBEAT] Error al auto-pingear."); }
  }, 1000 * 60 * 14); // Cada 14 minutos (Render duerme a los 15)
}

// 7.5.1 BUSCAR PRECIO EN MERCADOLIBRE (ADMIN)
app.post('/api/admin/express/meli-search', authMiddleware, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Título requerido' });

  try {
    const searchUrlBase = `https://api.mercadolibre.com/sites/MCO/search?q=`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'es-CO,es;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Upgrade-Insecure-Requests': '1'
    };

    // INTENTO 1: Búsqueda con 4 palabras
    let cleanQuery = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    let words = cleanQuery.split(' ');
    let query1 = words.slice(0, 4).join(' ');

    logger.info(`🔎 [Meli] Intento 1: "${query1}"`);
    let response = await axios.get(searchUrlBase + encodeURIComponent(query1) + '&limit=5', { timeout: 7000, headers });

    // INTENTO 2: Si no hay resultados, probar con solo 2 palabras (Marca + Modelo base)
    if (!response.data.results || response.data.results.length === 0) {
      let query2 = words.slice(0, 2).join(' ');
      logger.info(`🔎 [Meli] Intento 2 (Fallback): "${query2}"`);
      response = await axios.get(searchUrlBase + encodeURIComponent(query2) + '&limit=5', { timeout: 7000, headers });
    }

    if (response.data.results && response.data.results.length > 0) {
      const items = response.data.results;
      const top3 = items.slice(0, 3);
      const avgPrice = Math.round(top3.reduce((acc, curr) => acc + curr.price, 0) / top3.length);
      const lowest = items[0].price;
      const link = items[0].permalink;

      res.json({ success: true, avgPrice, lowest, link });
    } else {
      res.json({ success: false, message: 'No se encontraron resultados incluso con búsqueda simplificada' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GOOGLE COLOMBIA PRICE CHECK (usa Puppeteer para evitar bloqueos 429)
app.post('/api/admin/express/google-price', authMiddleware, async (req, res) => {
  const { title, id } = req.body;
  if (!title) return res.status(400).json({ error: 'Título requerido' });

  const query = encodeURIComponent(`${title} precio colombia`);
  const searchUrl = `https://www.google.com/search?q=${query}&gl=co&hl=es-419&tbm=shop`;

  try {
    const DeepScraper = require('./src/utils/DeepScraper');
    const browser = await DeepScraper.getBrowser();
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CO,es;q=0.9' });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });

    const prices = await page.evaluate(() => {
      const result = [];
      // Buscar en selectores comunes de precios en Google Shopping
      const selectors = ['.a83A0c', '.H8Ch6b', '.OFFNJ', '.VfPpkd-vQzf8d', 'span[aria-hidden="true"]', 'div[aria-hidden="true"]'];
      
      document.querySelectorAll(selectors.join(',')).forEach(el => {
        const txt = el.innerText?.trim() || '';
        // Regex mejorado para capturar precios colombianos (ej: $ 1.500.000 o $1.500.000)
        const m = txt.match(/\$\s?([\d]{1,3}(?:\.[\d]{3})*(?:,[\d]{0,2})?)/);
        if (m) {
          const val = Math.round(parseFloat(m[1].replace(/\./g,'').replace(',','.')));
          // Filtro inicial razonable para tecnología/productos en Colombia
          if (val >= 50000 && val <= 50000000) result.push(val);
        }
      });
      return result;
    });

    await page.close();

    if (prices.length > 0) {
      // 1. FILTRADO DE OUTLIERS (Estadística básica)
      prices.sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      
      // Filtramos valores que se alejen demasiado de la mediana (ej: < 0.3 o > 2.5)
      const validPrices = prices.filter(p => p > (median * 0.3) && p < (median * 2.5));
      
      if (validPrices.length > 0) {
        const count = validPrices.length;
        const avg = Math.round(validPrices.reduce((a, b) => a + b, 0) / count);
        
        // Calcular Percentil 75 (Precio alto confiable)
        const p75Idx = Math.floor(validPrices.length * 0.75);
        const p75 = validPrices[p75Idx] || avg;

        // Opcional: Guardar en DB si se pasó el ID
        if (id) {
           try {
             db.prepare("UPDATE published_deals SET structured_specs = json_set(COALESCE(structured_specs, '{}'), '$.marketPriceCOP', ?, '$.marketSource', 'google_colombia') WHERE id = ?")
               .run(avg, id);
           } catch(dbErr) { console.error("Error guardando precio mercado:", dbErr); }
        }

        return res.json({ 
          success: true, 
          avg, 
          p75,
          min: validPrices[0], 
          max: validPrices[validPrices.length - 1], 
          count, 
          searchUrl 
        });
      }
    }

    res.json({ success: false, searchUrl, message: 'No se encontraron precios confiables' });
  } catch (e) {
    console.error('[Google Price] Error:', e.message);
    res.json({ success: false, searchUrl: `https://www.google.com/search?q=${query}`, message: 'Error en la búsqueda automática' });
  }
});

// 7.5.2 FORZAR ESCANEO DE PRODUCTOS (ADMIN)
app.post('/api/admin/scan-now', authMiddleware, async (req, res) => {
  try {
    // No esperamos a que termine para no bloquear la UI
    CoreProcessor.runCycle();
    res.json({ success: true, message: 'Escaneo iniciado en segundo plano.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 8. PURGAR CORRUPTOS (ADMIN)
app.post('/api/admin/purge', authMiddleware, (req, res) => {
  try {
    const deleted = db.prepare("DELETE FROM published_deals WHERE image LIKE '%placehold%' OR title IS NULL").run();
    res.json({ success: true, count: deleted.changes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- INICIO PROFESIONAL ---
const startServer = async () => {
    // --- TEST DE INTEGRIDAD PROFESIONAL ---
    try {
        const { runSystemTest } = require('./src/utils/HealthCheck');
        await runSystemTest();
    } catch (e) {
        console.error("⚠️ No se pudo ejecutar el test de integridad inicial.");
    }
    const server = app.listen(PORT, () => {
        console.log(`
==========================================
   🚀 MASBARATO EXPRESS | SISTEMA PRO
==========================================
🌍 Acceso: http://localhost:${PORT}
⚙️  Admin:  http://localhost:${PORT}/admin
==========================================
        `);
        CoreProcessor.start();
    });

    // Manejo de apagado elegante (Graceful Shutdown)
    const shutdown = () => {
        console.log("\n🛑 Apagando servidor de forma segura...");
        server.close(() => {
            if (db) db.close();
            console.log("✅ Base de datos cerrada. Proceso terminado.");
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};

startServer();
