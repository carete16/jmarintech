// Sitemap para Google
// Genera automáticamente un sitemap.xml para mejorar el SEO

const { db } = require('./src/database/db');
const fs = require('fs');

const baseUrl = 'https://masbaratoexpress.onrender.com';

// Generar sitemap.xml
let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
`;

// Agregar las últimas 500 ofertas al sitemap
const deals = db.prepare('SELECT id, posted_at FROM published_deals ORDER BY posted_at DESC LIMIT 500').all();
deals.forEach(deal => {
  sitemap += `  <url>
    <loc>${baseUrl}/go/${deal.id}</loc>
    <lastmod>${deal.posted_at.split(' ')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
});

sitemap += '</urlset>';

fs.writeFileSync('./public/sitemap.xml', sitemap);
console.log('✅ Sitemap generado: public/sitemap.xml');
console.log(`📊 Total URLs: ${deals.length + 1}`);
