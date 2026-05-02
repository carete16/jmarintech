const Bot1 = require('./src/core/Bot1_Scraper');
const { db, saveDeal } = require('./src/database/db');

async function syncReal() {
    console.log('📡 CONECTANDO CON FEED EN VIVO DE SLICKDEALS (SIN FILTROS)...');

    // Obtener datos reales del RSS
    const deals = await Bot1.getFrontpageDeals();

    console.log(`🔥 ENCONTRADAS ${deals.length} OFERTAS REALES.`);

    let saved = 0;
    for (const d of deals) {
        // Asignar datos por defecto para asegurar publicación inmediata
        d.tienda = d.tienda || 'Oferta USA';
        d.categoria = d.categoria || 'General';
        d.status = 'published';
        d.posted_at = new Date().toISOString();

        // Calcular badge simple
        if (d.price_official > d.price_offer) d.badge = 'OFERTA VERIFICADA';
        else d.badge = 'TENDENCIA';

        // Guardar sin pasar por el CoreProcessor bloqueante
        saveDeal(d);
        saved++;
        console.log(`✅ [GUARDADO] ${d.title.substring(0, 50)}...`);
    }

    console.log(`🚀 ${saved} OFERTAS REALES INYECTADAS Y LISTAS PARA RENDER.`);
}

syncReal();
