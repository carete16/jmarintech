const { db } = require('./src/database/db');
const LinkTransformer = require('./src/utils/LinkTransformer');
const logger = require('./src/utils/logger');

async function purify() {
    logger.info('🧹 INICIANDO PURIFICACIÓN DE DATOS (ANÁLISIS PROFUNDO)...');

    // 1. Eliminar ofertas sin precio original (Baja calidad para clonación)
    const del1 = db.prepare('DELETE FROM published_deals WHERE price_official = 0 OR price_official <= price_offer').run();
    logger.info(`🗑️ Eliminadas ${del1.changes} ofertas de baja calidad (sin precio original).`);

    // 2. Obtener todas las ofertas para limpiar links
    const deals = db.prepare('SELECT id, link, title FROM published_deals').all();
    let cleanedCount = 0;

    for (const deal of deals) {
        // A. Limpiar Título
        const cleanTitle = deal.title.replace(/Slickdeals/gi, '').trim();

        // B. Limpiar Link
        const cleanLink = await LinkTransformer.transform(deal.link);

        if (cleanLink && !cleanLink.includes('slickdeals.net') && !cleanLink.includes('redirect.viglink.com')) {
            db.prepare('UPDATE published_deals SET title = ?, link = ? WHERE id = ?').run(cleanTitle, cleanLink, deal.id);
            cleanedCount++;
        } else {
            // Si el link sigue siendo basura, eliminar
            db.prepare('DELETE FROM published_deals WHERE id = ?').run(deal.id);
            logger.warn(`🗑️ Oferta eliminada por link incorregible: ${deal.title}`);
        }
    }

    logger.info(`✅ Purificación completa. ${cleanedCount} ofertas analizadas y corregidas.`);
    process.exit(0);
}

purify();
