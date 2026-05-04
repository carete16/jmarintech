/**
 * sync_to_render.js
 * Envía todos los productos publicados localmente a Render en masa.
 * Uso: node sync_to_render.js
 */
const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');

const RENDER_URL = 'https://jmarintech.onrender.com';
const ADMIN_PASSWORD = 'Masbarato2026';
const DB_PATH = path.resolve(__dirname, 'src/database/deals.db');

async function syncAll() {
  console.log('🔄 Conectando a la base de datos local...');
  const db = new Database(DB_PATH);
  
  const deals = db.prepare("SELECT * FROM published_deals WHERE status = 'published'").all();
  console.log(`📦 ${deals.length} productos publicados encontrados. Enviando a Render...`);

  let ok = 0, fail = 0;
  for (const deal of deals) {
    try {
      await axios.post(`${RENDER_URL}/api/admin/sync`, { deals: [deal] }, {
        headers: { 'x-admin-password': ADMIN_PASSWORD },
        timeout: 15000
      });
      console.log(`  ✅ ${deal.id} — ${deal.title?.substring(0,50)}`);
      ok++;
    } catch (e) {
      console.log(`  ❌ ${deal.id} — Error: ${e.response?.data?.error || e.message}`);
      fail++;
    }
    // Pequeña pausa para no saturar Render
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n🏁 Sync completado: ${ok} exitosos, ${fail} fallidos.`);
  db.close();
}

syncAll().catch(console.error);
