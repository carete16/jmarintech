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

// AUTO-SEED: Si la base de datos está vacía, restaurar desde seed_products.json
try {
    const check = db.prepare("SELECT COUNT(*) as count FROM published_deals").get();
    if (check.count === 0) {
        const seedPath = path.join(__dirname, 'seed_products.json');
        if (require('fs').existsSync(seedPath)) {
            const seedData = JSON.parse(require('fs').readFileSync(seedPath, 'utf8'));
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO published_deals 
                (id, title, selling_title, link, original_link, image, price_cop, price_offer, price_official, 
                 market_price_cop, tienda, categoria, structured_specs, benefits, badge, savings, status, posted_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            `);
            for (const deal of seedData) {
                stmt.run(
                    deal.id, deal.title, deal.selling_title, deal.link, deal.original_link,
                    deal.image, deal.price_cop, deal.price_offer, deal.price_official,
                    deal.market_price_cop, deal.tienda, deal.categoria,
                    deal.structured_specs, deal.benefits, deal.badge,
                    deal.savings, 'published', deal.posted_at
                );
            }
            console.log(`✅ Restaurados ${seedData.length} productos desde seed_products.json`);
        }
    }
} catch (e) {
    console.error("❌ Error en Auto-Seed:", e.message);
}

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
    console.log("📡 [GET] /api/status");
    const lastDeal = db.prepare('SELECT title, posted_at, tienda FROM published_deals ORDER BY posted_at DESC LIMIT 1').get() || {};
    const count24h = db.prepare("SELECT COUNT(*) as total FROM published_deals WHERE posted_at > datetime('now', '-1 day')").get() || { total: 0 };
    const totalDeals = db.prepare('SELECT COUNT(*) as count FROM published_deals').get()?.count || 0;
    const aiActive = !!(process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.GOOGLE_GEMINI_KEY || process.env.GEMINI_API_KEY);
    const trm = typeof trmCache !== 'undefined' ? trmCache.value : 3950;

    res.json({
      online: true,
      last_cycle: CoreProcessor.lastCycle || new Date().toISOString(),
      last_success: CoreProcessor.lastSuccess || new Date().toISOString(),
      last_deal: lastDeal,
      deals_24h: count24h.total,
      total_deals: totalDeals,
      ai_active: aiActive,
      trm: Math.round(trm),
      time: new Date().toISOString()
    });
  } catch (e) {
    console.error("❌ ERROR /api/status:", e.message);
    res.json({ online: true, error: e.message, trm: 3950, total_deals: 0 });
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
           market_price_cop, tienda, categoria, structured_specs, benefits, badge, savings, status, posted_at,
           stock_virtual, stock_status, stock_updated_at, product_condition, weight, gallery, benefits, original_specs)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          deal.id, deal.title, deal.selling_title || null, deal.link, deal.original_link || deal.link,
          deal.image, deal.price_cop || 0, deal.price_offer || 0, deal.price_official || 0,
          deal.market_price_cop || 0, deal.tienda || 'JMARIN TECH', deal.categoria || 'Tecnología',
          deal.structured_specs || null, deal.benefits || null, deal.badge || null,
          deal.savings || 0, 'published', deal.posted_at || new Date().toISOString(),
          deal.stock_virtual !== undefined ? deal.stock_virtual : 5,
          deal.stock_status || 'disponible',
          deal.stock_updated_at || null,
          deal.product_condition || deal.condition || 'Nuevo',
          deal.weight || 0,
          deal.gallery || null,
          deal.benefits || null,
          deal.original_specs || null
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

// 1.1 OBTENER UN PRODUCTO INDIVIDUAL (PÚBLICO) - Para enlaces directos /p/ID
app.get('/api/deal/:id', async (req, res) => {
  try {
    const deal = db.prepare("SELECT * FROM published_deals WHERE id = ?").get(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(deal);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// RUTA DINÁMICA PARA VISTA PREVIA Y LANDING INDIVIDUAL (SEO)
app.get('/p/:id', (req, res) => {
    try {
        const deal = db.prepare("SELECT * FROM published_deals WHERE id = ?").get(req.params.id);
        if (!deal) return res.sendFile(path.join(__dirname, 'public', 'index.html'));
        
        const priceStr = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(deal.price_cop);
        
        // AUTO-DETECCIÓN DE SPECS DESDE EL TÍTULO (Si no existen en DB)
        let specs = {};
        try { specs = JSON.parse(deal.structured_specs || '{}'); } catch(e){}
        
        if (!specs.cpu || !specs.ram) {
            const title = deal.title.toUpperCase();
            if (!specs.cpu) {
                const cpuMatch = title.match(/(I\d[- ]\d{4,5}[A-Z]?|RYZEN \d[- ]\d{4}[A-Z]?|CELERON|PENTIUM|M\d|APPLE M1|APPLE M2|APPLE M3)/i);
                if (cpuMatch) specs.cpu = cpuMatch[0];
            }
            if (!specs.gen) {
                const genMatch = title.match(/(\d+)(?:TH|ND|RD|ST)\s*(?:GEN)/i);
                if (genMatch) specs.gen = genMatch[1] + "ª Gen";
            }
            if (!specs.ram) {
                const ramMatch = title.match(/(\d+)\s*(?:GB|G)\s*(?:RAM|DDR)/i);
                if (ramMatch) specs.ram = ramMatch[1] + "GB";
            }
            if (!specs.ssd) {
                const ssdMatch = title.match(/(\d+)\s*(?:GB|TB|G|T)\s*(?:SSD|NVME|HDD|SATA|STORAGE)/i);
                if (ssdMatch) specs.ssd = ssdMatch[0].replace('STORAGE', 'SSD');
            }
        }

        let qty = 1;
        if (specs.qty && !isNaN(parseInt(specs.qty))) {
            qty = parseInt(specs.qty);
        } else {
            const qtyMatch = deal.title.match(/(?:LOT\s*(?:OF|X)?\s*(\d+)|^(\d+)\s*[xX]\b|\[QTY:\s*(\d+)\])/i);
            qty = qtyMatch ? parseInt(qtyMatch[1] || qtyMatch[2] || qtyMatch[3]) : 1;
        }
        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${deal.title} | JMARIN TECH</title>
    <meta property="og:title" content="${deal.title}">
    <meta property="og:description" content="🔥 ¡OFERTA EXCLUSIVA! Precio: ${priceStr} - JMARIN TECH">
    <meta property="og:image" content="${deal.image}">
    <meta property="og:url" content="https://jmarintech.onrender.com/p/${deal.id}">
    <meta property="og:type" content="product">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root { --primary: #10b981; --dark: #0f172a; --light-bg: #f8fafc; }
        body { background: var(--light-bg); color: #1e293b; font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 20px; }
        .main-card { background: white; border-radius: 24px; overflow: hidden; max-width: 600px; width: 100%; margin: 20px auto; box-shadow: 0 20px 40px rgba(0,0,0,0.05); position: relative; }
        .img-wrapper { position: relative; width: 100%; background: white; padding: 20px; }
        .img-wrapper img { width: 100%; height: auto; border-radius: 12px; }
        .badge-recommended { position: absolute; top: 30px; right: 30px; background: white; color: #0f172a; padding: 6px 16px; border-radius: 8px; font-weight: 700; font-size: 0.75rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-qty { position: absolute; top: 30px; left: 30px; background: #2563eb; color: white; padding: 6px 16px; border-radius: 8px; font-weight: 800; font-size: 0.75rem; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .status-badge { background: #10b981; color: white; display: inline-flex; align-items: center; padding: 6px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; margin-left: 20px; margin-top: -10px; position: relative; z-index: 10; box-shadow: 0 4px 12px rgba(16,185,129,0.2); }
        .content { padding: 30px; }
        .product-title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 25px; line-height: 1.3; }
        .spec-list { list-style: none; padding: 0; margin: 0 0 30px 0; }
        .spec-item { display: flex; align-items: center; gap: 15px; margin-bottom: 12px; color: #64748b; font-size: 0.95rem; font-weight: 500; }
        .spec-item i { width: 24px; color: #94a3b8; font-size: 1.1rem; text-align: center; }
        .price-tag { font-size: 2.8rem; font-weight: 900; color: #0f172a; margin-bottom: 30px; letter-spacing: -1px; }
        .payment-box { background: #f1f5f9; border-radius: 16px; padding: 20px; margin-bottom: 25px; }
        .payment-title { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; }
        .payment-grid { display: flex; gap: 20px; font-size: 0.85rem; font-weight: 700; color: #475569; }
        .delivery-info { display: flex; gap: 15px; justify-content: center; font-size: 0.8rem; color: #64748b; margin-bottom: 30px; font-weight: 500; }
        .btn-cta { background: #10b981; color: white; width: 100%; padding: 18px; border-radius: 16px; border: none; font-weight: 800; font-size: 1.1rem; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 10px; transition: transform 0.2s; box-shadow: 0 10px 25px rgba(16,185,129,0.3); }
        .btn-cta:hover { transform: translateY(-2px); color: white; }
        .footer-logo { max-width: 120px; margin: 40px auto; display: block; opacity: 0.5; }
    </style>
</head>
<body>
    <div class="main-card">
        <div class="img-wrapper">
            <div class="badge-recommended"><i class="fa-solid fa-shield-check me-1"></i> RECOMENDADO</div>
            ${qty > 1 ? `<div class="badge-qty">X${qty} EQUIPOS</div>` : ''}
            <img src="${deal.image}" alt="${deal.title}">
        </div>
        <div class="status-badge">
            <span style="width: 10px; height: 10px; background: white; border-radius: 50%; display: inline-block; margin-right: 8px; animation: pulse 1.5s infinite;"></span>
            Disponible bajo pedido
        </div>
        
        <div class="content">
            <h1 class="product-title">${deal.title}</h1>
            
            <ul class="spec-list">
                ${specs.screen ? `<li class="spec-item"><i class="fa-solid fa-laptop"></i> ${specs.screen}</li>` : ''}
                ${specs.cpu ? `<li class="spec-item"><i class="fa-solid fa-microchip"></i> ${specs.cpu} ${specs.gen || ''}</li>` : ''}
                ${specs.ram ? `<li class="spec-item"><i class="fa-solid fa-memory"></i> ${specs.ram} RAM</li>` : ''}
                ${specs.ssd ? `<li class="spec-item"><i class="fa-solid fa-hard-drive"></i> ${specs.ssd} Almacenamiento</li>` : ''}
                ${(() => {
                    const allText = ((deal.product_condition || '') + ' ' + (deal.original_specs || '') + ' ' + (deal.title || '')).toLowerCase();
                    let displayCondition = deal.product_condition || 'Nuevo';
                    if (displayCondition === 'Nuevo') {
                        if (allText.includes('refurbish') || allText.includes('renewed') || allText.includes('certified') || allText.includes('reacondicion') || allText.includes('90-day') || allText.includes('excellent') || allText.includes('lot of')) displayCondition = 'Refurbished';
                        else if (allText.includes('open box')) displayCondition = 'Open Box';
                        else if (allText.includes('used') || allText.includes('usado') || allText.includes('pre-owned')) displayCondition = 'Usado';
                    }
                    return `<li class="spec-item"><i class="fa-solid fa-tag"></i> Estado: <b style="color: #0f172a; margin-left: 5px;">${displayCondition}</b></li>`;
                })()}
                <li class="spec-item"><i class="fa-solid fa-plane-arrival"></i> Importación Directa USA</li>
                <li class="spec-item"><i class="fa-solid fa-check-double"></i> Calidad Inspeccionada</li>
            </ul>

            <div class="price-tag">${priceStr}</div>

            <div class="payment-box">
                <div class="payment-title">Medios de Pago</div>
                <div class="payment-grid">
                    <span><i class="fa-solid fa-building-columns me-1" style="color: #10b981;"></i> 0%</span>
                    <span><i class="fa-solid fa-credit-card me-1" style="color: #2563eb;"></i> +10%</span>
                    <span>50% Anticipo</span>
                </div>
            </div>

            <div class="delivery-info">
                <span>🚀 Importado bajo pedido</span>
                <span>⌛ Entrega: 10-15 días</span>
            </div>

            <a href="https://wa.me/573012722472?text=${encodeURIComponent('Hola, me interesa este producto: ' + deal.title)}" class="btn-cta">
                <i class="fa-brands fa-whatsapp"></i> ME INTERESA / SEPARAR
            </a>
        </div>
    </div>
    
    <img src="/images/logo-jmarin-tech.png" class="footer-logo" onerror="this.style.display='none'">

    <style>
        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
        }
    </style>
</body>
</html>`;
        res.send(html);
    } catch (e) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// RUTA DINÁMICA PARA CATÁLOGO VIP (Varios productos)
app.get('/cat/:ids', (req, res) => {
    try {
        const idList = req.params.ids.split(',');
        const placeholders = idList.map(() => '?').join(',');
        const deals = db.prepare(`SELECT * FROM published_deals WHERE id IN (${placeholders})`).all(...idList);
        
        if (deals.length === 0) return res.send("No se encontraron productos en este catálogo.");

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Catálogo Exclusivo | JMARIN TECH</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        body { background: #0f172a; color: white; font-family: 'Inter', sans-serif; padding: 60px 20px; }
        .deal-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 30px; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .deal-card:hover { transform: translateY(-10px) scale(1.02); border-color: #10b981; background: rgba(255,255,255,0.05); box-shadow: 0 30px 60px -12px rgba(0,0,0,0.5); }
        .deal-card:hover img { transform: scale(1.1); }
        .mini-spec { background: rgba(255,255,255,0.05); color: #94a3b8; font-size: 0.7rem; padding: 6px 12px; border-radius: 10px; font-weight: 500; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }
        .logo { max-width: 180px; margin-bottom: 40px; filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.2)); }
        h1 { font-size: 3rem; font-weight: 900; letter-spacing: -2px; }
    </style>
</head>
<body>
    <div class="container text-center">
        <img src="/images/logo-jmarin-tech.png" class="logo" onerror="this.style.display='none'">
        <h1 class="fw-bold mb-2">💎 Catálogo Premium</h1>
        <p class="text-white-50 mb-5">Lotes de tecnología seleccionados por JMARIN TECH</p>
        
        <div class="row g-4">
            ${deals.map(deal => {
                let specs = {};
                try { specs = JSON.parse(deal.structured_specs || '{}'); } catch(e){}
                
                // AUTO-DETECCIÓN DE SPECS PARA CATÁLOGO
                const title = (deal.title || '').toUpperCase();
                if (!specs.cpu) {
                    const cpuMatch = title.match(/(I\d[- ]\d{4,5}[A-Z]?|RYZEN \d[- ]\d{4}[A-Z]?|CELERON|PENTIUM|M\d|APPLE M1|APPLE M2|APPLE M3)/i);
                    if (cpuMatch) specs.cpu = cpuMatch[0];
                }
                if (!specs.ram) {
                    const ramMatch = title.match(/(\d+)\s*(?:GB|G)\s*(?:RAM|DDR)/i);
                    if (ramMatch) specs.ram = ramMatch[1] + "GB";
                }
                if (!specs.ssd) {
                    const ssdMatch = title.match(/(\d+)\s*(?:GB|TB|G|T)\s*(?:SSD|NVME|HDD|SATA|STORAGE)/i);
                    if (ssdMatch) specs.ssd = ssdMatch[0].replace('STORAGE', 'SSD');
                }

                let qty = 1;
                if (specs.qty && !isNaN(parseInt(specs.qty))) {
                    qty = parseInt(specs.qty);
                } else {
                    const qtyMatch = title.match(/(?:LOT\s*(?:OF|X)?\s*(\d+)|^(\d+)\s*[xX]\b|\[QTY:\s*(\d+)\])/i);
                    qty = qtyMatch ? parseInt(qtyMatch[1] || qtyMatch[2] || qtyMatch[3]) : 1;
                }

                // DETECCIÓN INTELIGENTE DE ESTADO (Igual que en el Admin)
                const allText = ((deal.product_condition || '') + ' ' + (deal.original_specs || '') + ' ' + (deal.title || '')).toLowerCase();
                let displayCondition = deal.product_condition || 'Nuevo';
                if (displayCondition === 'Nuevo') {
                    if (allText.includes('refurbish') || allText.includes('renewed') || allText.includes('certified') || allText.includes('reacondicion') || allText.includes('90-day') || allText.includes('excellent') || allText.includes('lot of')) displayCondition = 'Refurbished';
                    else if (allText.includes('open box')) displayCondition = 'Open Box';
                    else if (allText.includes('used') || allText.includes('usado') || allText.includes('pre-owned')) displayCondition = 'Usado';
                }

                return `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100 border-0 shadow-lg rounded-4 overflow-hidden bg-dark text-white deal-card" 
                         onclick="window.location.href='/p/${deal.id}'"
                         style="border: 1px solid rgba(255,255,255,0.05) !important; cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                        <div class="img-container bg-white p-4 position-relative" style="height: 280px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            <img src="${deal.image}" class="img-fluid" style="max-height: 100%; object-fit: contain; transition: transform 0.5s ease;">
                            ${qty > 1 ? `<div class="position-absolute top-0 end-0 m-3"><span class="badge bg-primary px-3 py-2 rounded-pill shadow-sm" style="font-size: 0.75rem; font-weight: 800; background: #2563eb !important;">X${qty} EQUIPOS</span></div>` : ''}
                        </div>
                        <div class="p-4 d-flex flex-column" style="background: linear-gradient(180deg, rgba(30,41,59,0) 0%, rgba(15,23,42,1) 100%);">
                            <h6 class="fw-bold mb-3 text-white" style="font-size: 1rem; line-height: 1.4; min-height: 2.8em;">${deal.title}</h6>
                            
                            <div class="specs-grid-mini mb-4" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                ${specs.cpu ? `<div class="mini-spec"><i class="fa-solid fa-microchip opacity-50 me-1"></i> ${specs.cpu}</div>` : ''}
                                ${specs.ram ? `<div class="mini-spec"><i class="fa-solid fa-memory opacity-50 me-1"></i> ${specs.ram}</div>` : ''}
                                ${specs.ssd ? `<div class="mini-spec"><i class="fa-solid fa-hard-drive opacity-50 me-1"></i> ${specs.ssd}</div>` : ''}
                                <div class="mini-spec text-success" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2);"><i class="fa-solid fa-recycle me-1"></i> ${displayCondition}</div>
                            </div>

                            <div class="mt-auto d-flex justify-content-between align-items-center">
                                <div class="price h3 fw-bold text-success mb-0" style="letter-spacing: -1px;">${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(deal.price_cop)}</div>
                                <div class="text-white-50 small">Ver detalles <i class="fa-solid fa-chevron-right ms-1" style="font-size: 0.7rem;"></i></div>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
        
        <div class="mt-5 py-5 text-center border-top border-secondary">
            <h4 class="fw-bold text-white mb-3">💎 ¿Interesado en estas ofertas?</h4>
            <p class="text-white-50 mb-4 mx-auto" style="max-width: 500px;">Nuestros lotes premium se agotan rápido. Escríbenos ahora para asegurar tu pedido con el mejor precio del mercado.</p>
            <div class="d-flex gap-3 justify-content-center flex-wrap">
                <a href="https://wa.me/573012722472" class="btn btn-success btn-lg px-5 rounded-pill fw-bold shadow-lg" style="background: #10b981; border: none;">
                    <i class="fa-brands fa-whatsapp me-2"></i> CONTACTAR AHORA
                </a>
                <a href="https://jmarintech.onrender.com" class="btn btn-outline-light btn-lg px-5 rounded-pill fw-bold" style="border: 1px solid rgba(255,255,255,0.2);">
                    🏪 VOLVER AL INICIO
                </a>
            </div>
            <p class="small mt-5 text-white-50 opacity-50">© 2026 JMARIN TECH - IMPORTACIONES DIRECTAS USA</p>
        </div>
    </div>
    </div>
</body>
</html>`;
        res.send(html);
    } catch (e) {
        res.status(500).send("Error al generar el catálogo: " + e.message);
    }
});

// ENDPOINT PARA GUARDADO RÁPIDO DESDE EBAY
app.post('/api/admin/ebay/sync', authMiddleware, async (req, res) => {
    try {
        const { item } = req.body;
        const usdPrice = (parseFloat(item.price) || 0) + (parseFloat(item.shipping) || 0);
        
        // Información técnica estructurada (JSON)
        const structuredSpecs = JSON.stringify(item.specs || {});
        
        // Construir texto legible basado en las nuevas specs enriquecidas
        let displaySpecs = item.condition ? `ESTADO: ${item.condition}` : '';
        if (item.specs) {
            const s = item.specs;
            if (s.cpu) displaySpecs += ` | Processor: ${s.cpu}`;
            if (s.ram) displaySpecs += ` | RAM: ${s.ram}`;
            if (s.ssd) displaySpecs += ` | Storage: ${s.ssd}`;
            if (s.screen) displaySpecs += ` | Screen: ${s.screen}`;
            if (s.full && s.full.length > 50) displaySpecs += ` | Info: ${s.full.substring(0, 500)}...`;
        }

        db.prepare(`
            INSERT OR REPLACE INTO published_deals 
            (id, title, image, price_cop, price_offer, link, original_link, status, posted_at, tienda, categoria, original_specs, structured_specs, product_condition)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP, 'eBay USA', 'Tecnología', ?, ?, ?)
        `).run(item.id, item.title, item.image, item.calculatedCOP, usdPrice, item.link, item.link, displaySpecs, structuredSpecs, item.condition);
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
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
      weight: 5.0,
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

          // --- MOTOR DE DETECCIÓN DE ESTADO (MEJORADO) ---
            const fullTextForCondition = (html + ' ' + result.title).toLowerCase();
            let detectedCondition = 'Nuevo'; // Default
            
            if (fullTextForCondition.includes('refurbish') || 
                fullTextForCondition.includes('renewed') || 
                fullTextForCondition.includes('excellent') ||
                fullTextForCondition.includes('certified') ||
                fullTextForCondition.includes('90-day') ||
                fullTextForCondition.includes('reacondicionado')) {
                detectedCondition = 'Refurbished';
            } else if (fullTextForCondition.includes('open box') || fullTextForCondition.includes('caja abierta')) {
                detectedCondition = 'Open Box';
            } else if (fullTextForCondition.includes('used') || fullTextForCondition.includes('usado') || fullTextForCondition.includes('prior use')) {
                detectedCondition = 'Usado';
            }
            
            result.condition = detectedCondition;

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

            if (eSpecs) result.specs = eSpecs;
            if (eTitle && eTitle.length > 3 && !eTitle.includes('eBay Stores')) result.title = eTitle;
            if (ePrice > 0) { result.price = ePrice; result.isManualNotice = false; }
            if (eImage) result.image = eImage;

            // EXTRAER CONDICIÓN ESPECÍFICA DE EBAY
            const condSelectors = [
                '.ux-labels-values__values .ux-textspans--BOLD',
                '.ux-layout-section--condition .ux-textspans--BOLD',
                '.x-item-condition-text .ux-textspans',
                '.ux-icon-text__text .ux-textspans',
                '.x-item-title__badgehighlight .ux-textspans',
                '.x-item-title__badgehighlight',
                '[data-testid="x-item-condition-text"]',
                '.ux-section-condition-group',
                '.ux-labels-values--condition'
            ];
            let eCondition = '';
            for (const sel of condSelectors) {
              const txt = $(sel).first().text().trim();
              if (txt) { eCondition += txt + ' '; }
            }

            const htmlLow = htmlContent.toLowerCase();
            const low = (eCondition + ' ' + (eTitle || "") + ' ' + htmlLow).toLowerCase();
            let detected = 'Nuevo';

            if (low.includes('refurbish') || low.includes('reformado') || low.includes('renovado') || low.includes('renewed') || low.includes('90-day') || low.includes('reacondicionado') || low.includes('excellent') || low.includes('certified')) detected = 'Refurbished';
            else if (low.includes('open box') || low.includes('caja abierta')) detected = 'Open Box';
            else if (low.includes('used') || low.includes('usado') || low.includes('pre-owned') || low.includes('prior use')) detected = 'Usado';
            
            result.condition = detected;

            // SIEMPRE inyectar la condición al inicio de specs
            const finalCondText = eCondition.trim() || detected;
            result.specs = `Condition: ${finalCondText} | ` + (result.specs || '');
            
            if (low.match(/laptop|notebook|portátil|computer|pc|processor|ram|ssd/)) result.categoria = 'Tecnología';

            console.log(`[EBAY-HTTP] Resultado: título=${eTitle.substring(0,40)} | precio=$${ePrice} | condición=${detected}`);
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
  const { url, title, price, image, weight, store, category, gallery, condition } = req.body;
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
      original_specs: req.body.specs || '',
      product_condition: condition || 'Nuevo'
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

// 6.5.4 BORRAR TODO EL HISTORIAL DE PENDIENTES (ADMIN)
app.post('/api/admin/express/clear-pending', authMiddleware, (req, res) => {
  try {
    const result = db.prepare("DELETE FROM published_deals WHERE status IN ('pending', 'pending_express')").run();
    res.json({ success: true, count: result.changes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/express/approve', authMiddleware, async (req, res) => {
  const { id, price_cop, price_offer, title, weight, categoria, image, gallery,
          custom_dolar, custom_profit_percent, structured_specs,
          // Nuevos campos opcionales de venta
          selling_title, original_price, savings, benefits, badge, marketPriceCOP, product_condition } = req.body;
  const pOffer = parseFloat(price_offer) || 0;
  if (pOffer <= 0) return res.status(400).json({ error: "Precio USD inválido" });

  try {
    db.prepare(`
        UPDATE published_deals 
        SET status = 'published', price_cop = ?, price_offer = ?, title = ?, weight = ?, categoria = ?, image = ?, gallery = ?, 
            custom_dolar = ?, custom_profit_percent = ?, structured_specs = ?, posted_at = CURRENT_TIMESTAMP,
            selling_title = ?, original_price = ?, savings = ?, benefits = ?, badge = ?, market_price_cop = ?, product_condition = ?
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
      product_condition || 'Nuevo',
      id
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/express/update', authMiddleware, async (req, res) => {
  const { id, price_cop, price_offer, title, weight, categoria, image, gallery,
          custom_dolar, custom_profit_percent, structured_specs,
          // Nuevos campos opcionales de venta
          selling_title, original_price, savings, benefits, badge, marketPriceCOP, product_condition } = req.body;
  const pOffer = parseFloat(price_offer) || 0;
  if (pOffer <= 0) return res.status(400).json({ error: "Precio USD inválido" });

  try {
    db.prepare(`
        UPDATE published_deals 
        SET price_cop = ?, price_offer = ?, title = ?, weight = ?, categoria = ?, image = ?, gallery = ?,
            custom_dolar = ?, custom_profit_percent = ?, structured_specs = ?,
            selling_title = ?, original_price = ?, savings = ?, benefits = ?, badge = ?, market_price_cop = ?, product_condition = ?
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
      product_condition || 'Nuevo',
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



// ============================================================
// MÓDULO: SISTEMA DE URGENCIA / STOCK VIRTUAL
// Endpoints completamente nuevos, no alteran los existentes.
// ============================================================

// PATCH /api/deals/:id/stock  — Ajusta stock_virtual y recalcula stock_status
app.patch('/api/deals/:id/stock', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { stock_virtual } = req.body;
  if (stock_virtual === undefined || isNaN(parseInt(stock_virtual))) {
    return res.status(400).json({ error: 'stock_virtual requerido y debe ser número' });
  }
  const stock = Math.max(0, parseInt(stock_virtual));
  let status = 'disponible';
  if (stock === 0) status = 'agotado';
  else if (stock <= 3) status = 'pocas_unidades';

  try {
    const { db } = require('./src/database/db');
    db.prepare(`UPDATE published_deals SET stock_virtual = ?, stock_status = ?, stock_updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(stock, status, id);
    res.json({ success: true, stock_virtual: stock, stock_status: status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/deals/agotados — Devuelve publicaciones agotadas para la sección inferior
app.get('/api/deals/agotados', (req, res) => {
  try {
    const { db } = require('./src/database/db');
    const rows = db.prepare(`
      SELECT id, title, selling_title, image, price_cop, product_condition, stock_updated_at, structured_specs
      FROM published_deals
      WHERE status = 'published' AND stock_status = 'agotado'
      ORDER BY stock_updated_at DESC LIMIT 20
    `).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
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

// 7.4.9.1 BÚSQUEDA AVANZADA EBAY (CON ENVÍO)
app.get('/api/admin/ebay/search', authMiddleware, async (req, res) => {
  let { q, condition } = req.query;
  if (!q) return res.status(400).json({ error: 'Query requerido' });
  try {
    const EbayAPI = require('./src/core/EbayAPIRadar');

    // DETECTAR SI ES UN ENLACE DE PRODUCTO EBAY (/itm/ID)
    const ebayItemMatch = q.match(/ebay\.com\/itm\/(\d+)/);
    if (ebayItemMatch) {
      const itemId = ebayItemMatch[1];
      const result = await EbayAPI.getItemById(itemId);
      if (result) return res.json({ success: true, results: [result] });
      const results = await EbayAPI.searchItems(itemId, 5);
      return res.json({ success: true, results });
    }

    // DETECTAR SI ES UN ENLACE DE BÚSQUEDA EBAY COMPLETO (?_nkw=... o /sch/...)
    const isEbayUrl = q.includes('ebay.com') || q.includes('_nkw=');
    if (isEbayUrl) {
      try {
        const fullUrl = q.startsWith('http') ? q : 'https://www.ebay.com/sch/?' + q;
        console.log(`[eBay URL Detected] Scraping URL exacta para respetar TODOS los filtros...`);
        const axios = require('axios');
        const cheerio = require('cheerio');
        const htmlResp = await axios.get(fullUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        const $ = cheerio.load(htmlResp.data);
        const itemIds = [];
        $('.s-item__link').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                const match = href.match(/itm\/(\d+)/);
                if (match && !itemIds.includes(match[1])) itemIds.push(match[1]);
            }
        });
        
        if (itemIds.length > 0) {
            console.log(`[eBay Scraper] Extrayendo detalles de ${itemIds.slice(0,10).length} productos de la URL...`);
            const detailPromises = itemIds.slice(0, 10).map(async (id) => {
                const details = await EbayAPI.getItemById(id);
                if (details) {
                    return {
                        id: id,
                        title: details.title,
                        price: details.price || 0,
                        currency: 'USD',
                        image: details.image || '',
                        shipping: details.shipping || 0,
                        condition: details.condition || 'Used',
                        link: `https://www.ebay.com/itm/${id}`,
                        specs: {
                            ram: details.ram || '',
                            ssd: details.disk || '',
                            cpu: details.processor || '',
                            screen: details.screen || '',
                            full: details.specs || ''
                        }
                    };
                }
                return null;
            });
            const results = (await Promise.all(detailPromises)).filter(r => r !== null);
            return res.json({ success: true, results });
        }
      } catch(e) {
        console.error("[eBay Scraper Fallback] Falla al leer URL directa, usando keywords:", e.message);
      }
      
      // Fallback: extraer _nkw y filtros avanzados si el scraper falló
      let categoryId = null;
      let aspectFilters = {};
      try {
        const urlObj = new URL(q.startsWith('http') ? q : 'https://www.ebay.com/sch/?' + q);
        const nkw = urlObj.searchParams.get('_nkw');
        if (nkw) {
            q = nkw.replace(/\+/g, ' ');
            q = q.replace(/\blaptos\b/ig, 'laptops'); // Auto-corregir typo común porque la API es estricta
        }
        
        categoryId = urlObj.searchParams.get('_dcat') || urlObj.pathname.match(/\/sch\/(\d+)\//)?.[1];
        
        ['Processor', 'RAM Size', 'Model', 'Storage Type'].forEach(key => {
            const val = urlObj.searchParams.get(key);
            if (val) aspectFilters[key] = val.split('|');
        });

        // Extraer la condición directamente del enlace si existe
        const lhCond = urlObj.searchParams.get('LH_ItemCondition');
        if (lhCond) {
            const condMapUrl = {
                '1000': 'NEW',
                '2000': 'CERTIFIED_REFURBISHED',
                '2010': 'EXCELLENT_REFURBISHED',
                '2020': 'VERY_GOOD_REFURBISHED',
                '2030': 'GOOD_REFURBISHED',
                '3000': 'USED'
            };
            if (condMapUrl[lhCond]) condition = condMapUrl[lhCond];
        }
      } catch(e) {}
      
      const results = await EbayAPI.searchItems(q, 15, { condition, categoryId, aspectFilters });
      return res.json({ success: true, results });
    }

    // BÚSQUEDA NORMAL POR PALABRAS CLAVE (API de eBay)
    const results = await EbayAPI.searchItems(q, 15, condition || null);
    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PROXY DE IMÁGENES PARA OCULTAR PROVEEDOR
app.get('/api/media-proxy', async (req, res) => {
  const { u } = req.query; // URL en base64 para más privacidad
  if (!u) return res.status(400).send('No image');
  try {
    const imageUrl = Buffer.from(u, 'base64').toString('utf-8');
    const response = await axios.get(imageUrl, { responseType: 'stream', timeout: 5000 });
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    response.data.pipe(res);
  } catch (e) {
    res.status(404).send('Not found');
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

// 9. BOTÓN MAESTRO: PUSH GITHUB + SYNC DATA RENDER
app.post('/api/admin/push-all', authMiddleware, async (req, res) => {
  const { exec } = require('child_process');
  const CloudSync = require('./src/utils/CloudSync');
  
  console.log('🚀 Iniciando Sincronización Maestra (GitHub + Render)...');

  // 1. Git Push (Código)
  exec('git add . && git commit -m "update: sincronización desde admin" && git push origin main', async (error, stdout, stderr) => {
    let gitStatus = 'exitoso';
    if (error) {
      // Si el error no es simplemente que el árbol está limpio, marcar como fallo
      if (!stdout.includes('nothing to commit') && !stderr.includes('nothing to commit')) {
        console.error(`❌ Error real en Git Push: ${error.message}`);
        gitStatus = 'falló';
      }
    }
    
    // 2. Sync Data (Productos)
    try {
      const deals = db.prepare("SELECT * FROM published_deals WHERE status = 'published'").all();
      console.log(`📦 Sincronizando ${deals.length} productos con Render...`);
      
      const RENDER_URL = 'https://jmarintech.onrender.com';
      const ADMIN_PASSWORD = 'Masbarato2026';
      const axios = require('axios');

      let successCount = 0;
      for (const deal of deals) {
        try {
          await axios.post(`${RENDER_URL}/api/admin/sync`, { deals: [deal] }, {
            headers: { 'x-admin-password': ADMIN_PASSWORD },
            timeout: 10000
          });
          successCount++;
        } catch (err) { /* ignore individual errors */ }
      }

      res.json({ 
        success: true, 
        message: 'Sincronización completada', 
        git: gitStatus,
        data: `${successCount}/${deals.length} productos sincronizados`
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

// --- INICIO PROFESIONAL ---
// FORCE_SYNC_MARKETING_V2: 2026-05-04
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
