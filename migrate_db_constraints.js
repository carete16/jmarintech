const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.cwd(), 'src/database/deals.db');
const db = new Database(dbPath);

console.log("🚀 Iniciando MIGRACIÓN CRÍTICA de Base de Datos...");

try {
    // 1. Limpiar datos inválidos antes de aplicar restricciones
    console.log("🧹 Moviendo productos con precio <= 0 a estado 'invalid'...");
    const badCount = db.prepare("UPDATE published_deals SET status = 'pending_express' WHERE (price_offer <= 0 OR price_offer IS NULL)").run().changes;
    console.log(`✅ ${badCount} productos corregidos.`);

    // 2. Recrear la tabla con restricciones (SQLite pattern)
    console.log("🛠️ Re-estructurando tabla 'published_deals' con restricciones NOT NULL y CHECK...");

    db.transaction(() => {
        // Crear tabla temporal con el nuevo esquema
        db.exec(`
            CREATE TABLE published_deals_new (
                id TEXT PRIMARY KEY,
                link TEXT UNIQUE,
                original_link TEXT,
                title TEXT,
                price_official REAL,
                price_offer REAL NOT NULL CHECK(price_offer > 0),
                image TEXT,
                gallery TEXT,
                tienda TEXT DEFAULT 'Amazon USA',
                categoria TEXT DEFAULT 'Tecnología',
                clicks INTEGER DEFAULT 0,
                description TEXT,
                coupon TEXT,
                status TEXT DEFAULT 'published',
                is_historic_low BOOLEAN DEFAULT 0,
                score INTEGER DEFAULT 0,
                votes_up INTEGER DEFAULT 0,
                votes_down INTEGER DEFAULT 0,
                comment_count INTEGER DEFAULT 0,
                price_cop REAL DEFAULT 0,
                weight REAL DEFAULT 0,
                posted_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migrar datos (filtrando los que aún sean 0 por si acaso)
        db.exec(`
            INSERT INTO published_deals_new 
            SELECT id, link, original_link, title, price_official, 
                   CASE WHEN price_offer > 0 THEN price_offer ELSE 0.01 END, 
                   image, gallery, tienda, categoria, clicks, description, coupon, 
                   CASE WHEN price_offer > 0 THEN status ELSE 'pending_express' END,
                   is_historic_low, score, votes_up, votes_down, comment_count, price_cop, weight, posted_at
            FROM published_deals
        `);

        // Reemplazar tablas
        db.exec("DROP TABLE published_deals");
        db.exec("ALTER TABLE published_deals_new RENAME TO published_deals");
        db.exec("CREATE INDEX IF NOT EXISTS idx_original_link ON published_deals(original_link)");
    })();

    console.log("✨ MIGRACIÓN COMPLETADA CORRECAMENTE. Restricciones activas.");

} catch (e) {
    console.error("❌ ERROR CRÍTICO EN MIGRACIÓN:", e.message);
    process.exit(1);
}
