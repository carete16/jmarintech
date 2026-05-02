/**
 * 🚀 SINCRONIZADOR LOCAL → RENDER (JMARIN TECH)
 * 
 * USO: node sync_to_render.js
 * 
 * Copia todos los productos publicados en tu Mac
 * y los envía a https://jmarintech.onrender.com
 */

const Database = require('better-sqlite3');
const axios = require('axios');
const path = require('path');

// ─── CONFIGURACIÓN ───────────────────────────────────────
const RENDER_URL = 'https://jmarintech.onrender.com';
const ADMIN_PASSWORD = process.env.ADMIN_SECRET || 'Masbarato2026';
const DB_PATH = path.resolve(__dirname, './src/database/deals.db');
// ─────────────────────────────────────────────────────────

async function syncToRender() {
    console.log('🚀 Iniciando sincronización con Render...\n');

    // 1. Leer productos locales
    const db = new Database(DB_PATH);
    const deals = db.prepare(
        "SELECT * FROM published_deals WHERE status = 'published' ORDER BY posted_at DESC"
    ).all();
    db.close();

    if (deals.length === 0) {
        console.log('⚠️  No hay productos publicados en la base de datos local.');
        return;
    }

    console.log(`📦 Encontrados ${deals.length} producto(s) para sincronizar:\n`);
    deals.forEach(d => console.log(`   • ${d.selling_title || d.title} — $${(d.price_cop || 0).toLocaleString('es-CO')}`));
    console.log('');

    // 2. Enviar a Render
    try {
        const response = await axios.post(
            `${RENDER_URL}/api/admin/sync`,
            { deals },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': ADMIN_PASSWORD
                },
                timeout: 30000
            }
        );

        const result = response.data;
        console.log('✅ ¡Sincronización exitosa!');
        console.log(`   ✔ Guardados:  ${result.saved}`);
        console.log(`   ⚠ Omitidos:  ${result.skipped}`);
        console.log(`\n🌐 Tu web está actualizada en: ${RENDER_URL}\n`);

    } catch (err) {
        if (err.response) {
            console.error('❌ Error del servidor:', err.response.status, err.response.data);
        } else {
            console.error('❌ Error de conexión:', err.message);
            console.error('   Verifica que https://jmarintech.onrender.com esté activo.');
        }
    }
}

syncToRender();
