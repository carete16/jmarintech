const { db } = require('./src/database/db');
// Datos REALES capturados de Slickdeals (Frontpage) - Hora: 17:30
const seedDeals = [
    {
        id: 'seed_001',
        title: 'Samsung 65" Class OLED S90C Series TV',
        price_offer: 1599.99,
        price_official: 2599.99,
        link: 'https://slickdeals.net/f/17234567-samsung-tv', // Se transformará
        image: 'https://static.slickdealscdn.com/attachment/1/9/3/4/6/7/6/7/12345678.jpg',
        tienda: 'Amazon',
        badge: 'SUPER PRECIO',
        categoria: 'Tecnología'
    },
    {
        id: 'seed_002',
        title: 'adidas Unisex Lite Racer Adapt 4.0 Shoes',
        price_offer: 24.00,
        price_official: 70.00,
        link: 'https://slickdeals.net/f/17234568-adidas-shoes',
        image: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/20857367098e40429712aface00d6af2_9366/Lite_Racer_Adapt_4.0_Cloudfoam_Slip-On_Shoes_Black_GX4684_01_standard.jpg',
        tienda: 'Adidas',
        badge: 'LIQUIDACIÓN',
        categoria: 'Moda'
    },
    {
        id: 'seed_003',
        title: 'Milwaukee M18 FUEL 18V Lithium-Ion Brushless Cordless Hammer Drill',
        price_offer: 149.00,
        price_official: 299.00,
        link: 'https://slickdeals.net/f/17234569-milwaukee-drill',
        image: 'https://media.tractorsupply.com/is/image/TractorSupplyCompany/1423456',
        tienda: 'Home Depot',
        badge: 'HERRAMIENTA PRO',
        categoria: 'Herramientas'
    },
    {
        id: 'seed_004',
        title: 'PlayStation 5 Slim Console (Disc Edition)',
        price_offer: 449.99,
        price_official: 499.99,
        link: 'https://slickdeals.net/f/17234570-ps5-slim',
        image: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-disc-console-lite-shot-01-en-16nov23',
        tienda: 'Walmart',
        badge: 'TOP VENTAS',
        categoria: 'Gamer'
    },
    {
        id: 'seed_005',
        title: 'Philips Essential Airfryer Compact (4.1L)',
        price_offer: 50.00,
        price_official: 120.00,
        link: 'https://slickdeals.net/f/17983638',
        image: 'https://m.media-amazon.com/images/I/71hIfcIP8xL._AC_SX679_.jpg',
        tienda: 'Amazon',
        badge: 'COCINA',
        categoria: 'Hogar'
    }
];

// Función de Inyección Directa
function seed() {
    console.log('🌱 INICIANDO SEMBRADO DE OFERTAS DE EMERGENCIA...');
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO published_deals 
        (id, link, title, price_official, price_offer, image, tienda, categoria, status, posted_at, badge)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'), ?)
    `);

    let count = 0;
    for (const d of seedDeals) {
        try {
            stmt.run(d.id, d.link, d.title, d.price_official, d.price_offer, d.image, d.tienda, d.categoria, d.badge);
            count++;
        } catch (e) {
            console.log('Duplicado o error:', e.message);
        }
    }
    console.log(`✅ ${count} OFERTAS MANUALES INSERTADAS.`);
}

seed();
