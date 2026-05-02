const express = require('express');
const path = require('path');
const { db } = require('../database/db');
const logger = require('../utils/logger');
const LinkTransformer = require('../utils/LinkTransformer');
const VisualScraper = require('../utils/VisualScraper');
require('dotenv').config();

const app = express();

// Rutas absolutas para Render
const viewsPath = path.resolve(__dirname, 'views');
const publicPath = path.resolve(__dirname, 'public');

// PRIORIDAD 1: Servir la Home Page
app.get('/', (req, res) => {
    const fs = require('fs');
    // Búsqueda inteligente de portal.html (soporta varios niveles de carpetas)
    let portalPath = path.join(__dirname, 'views', 'portal.html');

    // Si no está ahí, probar ruta relativa al proceso (útil en algunos despliegues)
    if (!fs.existsSync(portalPath)) {
        portalPath = path.resolve(process.cwd(), 'src', 'web', 'views', 'portal.html');
    }

    if (fs.existsSync(portalPath)) {
        res.sendFile(portalPath);
    } else {
        logger.error(`❌ No se encontró portal.html en: ${portalPath}`);
        res.status(500).send('<h1>Error de Configuración</h1><p>No se pudo localizar el archivo de la interfaz principal.</p>');
    }
});

app.use(express.static(publicPath));

// Endpoint de prueba rápida
app.get('/test', (req, res) => {
    res.send('<h1>🚀 EL SERVIDOR ESTA VIVO</h1><p>Si ves esto, el bot esta funcionando. Buscando portal.html...</p>');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// API para la web
app.get('/api/deals', (req, res) => {
    try {
        const deals = db.prepare('SELECT * FROM published_deals ORDER BY posted_at DESC LIMIT 24').all();
        res.json(deals || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manejador Global (Redirigir todo lo desconocido a la Home)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.redirect('/');
});

// Otras rutas
app.get('/admin', (req, res) => res.sendFile(path.join(viewsPath, 'index.html')));
app.get('/go/:id', (req, res) => {
    try {
        const deal = db.prepare('SELECT link FROM published_deals WHERE id = ?').get(req.params.id);
        if (deal) {
            db.prepare('UPDATE published_deals SET clicks = clicks + 1 WHERE id = ?').run(req.params.id);
            return res.redirect(deal.link);
        }
        res.status(404).send('Oferta expirada');
    } catch (e) { res.status(500).send('Error'); }
});

// Newsletter API
app.use(express.json());
app.post('/api/newsletter', (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        // Create newsletter table if not exists
        db.exec(`
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                active INTEGER DEFAULT 1
            )
        `);

        // Insert subscriber
        const stmt = db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)');
        stmt.run(email);

        logger.info(`Nueva suscripción: ${email}`);
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error(`Error newsletter: ${error.message}`);
        res.status(500).json({ error: 'Error al suscribir' });
    }
});

// 1. API: ANALIZAR ENLACE (Scraping en vivo)
app.post('/api/analyze-deal', async (req, res) => {
    try {
        const { link } = req.body;
        if (!link) return res.status(400).json({ error: 'Falta el enlace' });

        // Monetizar
        const monetizedLink = await LinkTransformer.transform(link);
        if (!monetizedLink) return res.status(400).json({ error: 'Enlace no válido.' });

        // Tienda
        let store = 'Oferta Usuario';
        if (monetizedLink.includes('amazon')) store = 'Amazon';
        else if (monetizedLink.includes('walmart')) store = 'Walmart';
        else if (monetizedLink.includes('ebay')) store = 'eBay';
        else if (monetizedLink.includes('bestbuy')) store = 'BestBuy';

        // Scraping Logic
        let title = '';
        let price = 0;
        let img = '';

        try {
            const axios = require('axios');
            const response = await axios.get(link, {
                timeout: 8000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            const html = response.data;

            // Title
            const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i);
            const tagTitle = html.match(/<title>(.*?)<\/title>/i);
            if (ogTitle) title = ogTitle[1];
            else if (tagTitle) title = tagTitle[1];

            // Cleanup Title
            title = title.split('|')[0].replace(/Amazon\.com:?/i, '').trim();

            // Image
            const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/i);
            if (ogImage) img = ogImage[1];

            // Price
            const priceRegex = /["']?(?:price|amount)["']?:\s*["']?(\d+\.?\d*)["']?|(\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;
            const priceMatch = html.match(priceRegex);
            if (priceMatch) {
                const rawPrice = priceMatch[1] || priceMatch[2];
                if (rawPrice) price = parseFloat(rawPrice.replace(/[$,]/g, ''));
            }

            // Amazon ASIN Image Override
            if (store === 'Amazon') {
                const asinMatch = link.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
                if (asinMatch) img = `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&Format=_SL500_&ASIN=${asinMatch[1]}&MarketPlace=US`;
            }

        } catch (e) {
            logger.warn(`Scraping fallido: ${e.message}`);
        }

        res.json({ success: true, title, price, img, store, finalLink: monetizedLink });

    } catch (e) {
        res.status(500).json({ error: 'Error analizando' });
    }
});

// 2. API: PUBLICAR OFERTA (Guardar datos finales)
app.post('/api/submit-deal', (req, res) => {
    try {
        const { title, price, price_official, link, image, store, category, description } = req.body;

        if (!title || !price || !link) return res.status(400).json({ error: 'Faltan datos obligatorios' });

        const uuid = Math.random().toString(36).substring(2, 11);
        const stmt = db.prepare(`
            INSERT INTO published_deals (id, title, price_offer, price_official, link, image, tienda, categoria, description, posted_at, score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        `);

        stmt.run(uuid, title, price, price_official || 0, link, image, store || 'Oferta Usuario', category || 'Otros', description || '', 100);

        logger.info(`✅ Oferta Publicada por Usuario: ${title}`);
        res.json({ success: true });

    } catch (e) {
        logger.error(`Error guardando: ${e.message}`);
        res.status(500).json({ error: 'Error al guardar' });
    }
});

// 3. API: ACTUALIZAR OFERTA (Admin)
app.post('/api/update-deal', (req, res) => {
    try {
        const { id, title, price, price_official, link, image, store, category, description } = req.body;
        if (!id) return res.status(400).json({ error: 'Falta ID' });

        const stmt = db.prepare(`
            UPDATE published_deals 
            SET title=?, price_offer=?, price_official=?, link=?, image=?, tienda=?, categoria=?, description=?
            WHERE id=?
        `);
        stmt.run(title, price, price_official || 0, link, image, store, category, description || '', id);

        logger.info(`✏️ Oferta Editada: ${title}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. API: BORRAR OFERTA (Admin)
app.post('/api/delete-deal', (req, res) => {
    try {
        const { id } = req.body;
        db.prepare('DELETE FROM published_deals WHERE id = ?').run(id);
        logger.info(`🗑️ Oferta Eliminada: ${id}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Sitemap for SEO
app.get('/sitemap.xml', (req, res) => {
    try {
        const deals = db.prepare('SELECT id, posted_at FROM published_deals ORDER BY posted_at DESC LIMIT 100').all();
        const baseUrl = 'https://masbaratoexpress.onrender.com';

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <changefreq>hourly</changefreq>
        <priority>1.0</priority>
    </url>`;

        deals.forEach(deal => {
            sitemap += `
    <url>
        <loc>${baseUrl}/go/${deal.id}</loc>
        <lastmod>${deal.posted_at}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>`;
        });

        sitemap += '\n</urlset>';

        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (e) {
        res.status(500).send('Error generating sitemap');
    }
});

// Static pages routes
app.get('/privacy', (req, res) => res.sendFile(path.join(viewsPath, 'privacy.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(viewsPath, 'terms.html')));
app.get('/about', (req, res) => res.sendFile(path.join(viewsPath, 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(viewsPath, 'contact.html')));

function startServer(port = 4000) {
    app.listen(port, '0.0.0.0', () => {
        logger.info(`🌐 Servidor en puerto ${port}`);
    });
}

module.exports = { startServer };
