const Database = require('better-sqlite3');
const CloudSync = require('./src/utils/CloudSync');
const dbPath = './src/database/deals.db';
const db = new Database(dbPath);

async function run() {
    try {
        const deals = db.prepare("SELECT * FROM published_deals WHERE status = 'published'").all();
        console.log(`🚀 Sincronizando ${deals.length} productos con TODOS los metadatos...`);
        for (const deal of deals) {
            await CloudSync.syncOne(deal);
        }
        console.log("✅ Sincronización completa.");
    } catch (e) {
        console.error(e);
    } finally {
        db.close();
    }
}
run();
