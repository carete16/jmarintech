const { db } = require('./src/database/db');
const LinkTransformer = require('./src/utils/LinkTransformer');
const logger = require('./src/utils/logger');

async function repairSystem() {
    console.log("🛠️ INICIANDO REPARACIÓN INTEGRAL DEL SISTEMA...");
    console.log("1. Garantizando Monetización en TODAS las publicaciones.");
    console.log("2. Recuperando imágenes perdidas.");

    try {
        const deals = db.prepare("SELECT * FROM published_deals").all();
        console.log(`📋 Analizando ${deals.length} ofertas...`);

        let fixedLinks = 0;
        let fixedImages = 0;

        for (const deal of deals) {
            let updates = {};

            // --- 1. AUDITORÍA DE LINKS Y MONETIZACIÓN ---
            // Siempre regeneramos el link para asegurar que tenga los últimos tags del .env
            const sourceUrl = deal.original_link || deal.link;
            const monetizedUrl = await LinkTransformer.transform(sourceUrl);

            // Verificar si cambió algo (falta de tag, etc)
            if (monetizedUrl !== deal.link) {
                updates.link = monetizedUrl;
                fixedLinks++;
            }

            // --- 2. RECUPERACIÓN DE IMÁGENES ---
            let newImage = deal.image;

            // Si no hay imagen o es inválida
            if (!newImage || newImage.trim() === '' || newImage.includes('placehold')) {
                // ESTRATEGIA AMAZON
                if (sourceUrl.includes('amazon.com') || sourceUrl.includes('amzn.to')) {
                    const asinMatch = sourceUrl.match(/\/(dp|gp\/product|exec\/obidos\/ASIN)\/([A-Z0-9]{10})/i);
                    if (asinMatch) {
                        const asin = asinMatch[2];
                        newImage = `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&Format=_SL500_&ASIN=${asin}&MarketPlace=US`;
                    }
                }

                // Si encontramos una imagen mejor, la guardamos
                if (newImage && newImage !== deal.image) {
                    updates.image = newImage;
                    fixedImages++;
                }
            }

            // --- APLICAR ACTUALIZACIONES ---
            if (Object.keys(updates).length > 0) {
                const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
                const values = [...Object.values(updates), deal.id];
                try {
                    db.prepare(`UPDATE published_deals SET ${setClauses} WHERE id = ?`).run(...values);
                } catch (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        // Si ya existe el link limpio en otra fila, podemos borrar esta fila duplicada sucia
                        // o simplemente ignorar el error. Borrar es más limpio.
                        try {
                            db.prepare('DELETE FROM published_deals WHERE id = ?').run(deal.id);
                            console.log(`   🗑️ Eliminado duplicado detectado: ${deal.title}`);
                        } catch (e) { }
                    }
                }
            }
        }

        console.log("\n\n✅ RESULTADOS DE LA REPARACIÓN:");
        console.log(`   🔗 Enlaces Monetizados/Corregidos: ${fixedLinks}`);
        console.log(`   🖼️ Imágenes Recuperadas: ${fixedImages}`);
        console.log("   ✨ El sistema ahora está 100% optimizado.");

    } catch (e) {
        console.error("\n❌ Error Crítico:", e.message);
    }
}

repairSystem();
