const Telegram = require('./src/notifiers/TelegramNotifier');
const { db } = require('./src/database/db');
const LinkTransformer = require('./src/utils/LinkTransformer');

const PROMOS = [
    {
        title: "Apple iPhone 15 Pro Max (256GB) - Titanium Black",
        price_offer: 999.00,
        price_official: 1199.00,
        link: "https://www.amazon.com/dp/B0CMZ7S85D",
        image: "https://m.media-amazon.com/images/I/81+E8pU1LWL._AC_SL1500_.jpg",
        tienda: "Amazon",
        categoria: "Tecnología",
        description: "🔥 Mínimo histórico para el flagship de Apple. Titanio aeroespacial, chip A17 Pro y la mejor cámara en un smartphone. ¡Corre que vuelan!",
        score: 500,
        coupon: "APPLE25"
    },
    {
        title: "Sony PlayStation 5 Slim Console",
        price_offer: 449.00,
        price_official: 499.99,
        link: "https://www.amazon.com/dp/B0CL5K56Z1",
        image: "https://m.media-amazon.com/images/I/41M7C7c+NML._SL500_.jpg",
        tienda: "Amazon",
        categoria: "Gamer",
        description: "🎮 La consola más buscada, ahora en su versión Slim más ligera. Incluye lector de discos. Perfecta para regalo.",
        score: 450
    },
    {
        title: "Samsung 65-Class CU7000 Crystal UHD 4K Smart TV",
        price_offer: 397.99,
        price_official: 479.99,
        link: "https://www.amazon.com/dp/B0BVMXW266",
        image: "https://m.media-amazon.com/images/I/91M-1Z-wNGL._AC_SL1500_.jpg",
        tienda: "Amazon",
        categoria: "Hogar",
        description: "📺 Cine en casa por menos de $400. Procesador Crystal 4K, colores vivos y Gaming Hub integrado.",
        score: 300
    },
    {
        title: "adidas Men's Lite Racer Adapt 4.0 Running Shoe",
        price_offer: 35.00,
        price_official: 70.00,
        link: "https://www.amazon.com/dp/B08N5M9T6P",
        image: "https://m.media-amazon.com/images/I/71D9ImsvEtL._AC_SY695_.jpg",
        tienda: "Amazon",
        categoria: "Moda",
        description: "👟 Comodidad sin cordones. Ideales para correr o uso diario. 50% de descuento real.",
        score: 200
    },
    {
        title: "Ninja AF101 Air Fryer (4 Quart)",
        price_offer: 89.95,
        price_official: 129.99,
        link: "https://www.amazon.com/dp/B07FDJMC9Q",
        image: "https://m.media-amazon.com/images/I/71y+UGuJl5L._AC_SL1500_.jpg",
        tienda: "Amazon",
        categoria: "Hogar",
        description: "🍳 Cocina con 75% menos de grasa. La freidora de aire #1 en ventas. Cesta antiadherente apta para lavavajillas.",
        score: 350
    },
    {
        title: "DEWALT 20V MAX Cordless Drill/Driver Kit",
        price_offer: 99.00,
        price_official: 179.00,
        link: "https://www.amazon.com/dp/B00ET5VMTU",
        image: "https://m.media-amazon.com/images/I/713wiPO+J6L._AC_SL1500_.jpg",
        tienda: "Amazon",
        categoria: "Herramientas",
        description: "🛠️ El taladro indestructible. Incluye 2 baterías y cargador. Indispensable para cualquier hogar.",
        score: 250
    }
];

async function seed() {
    console.log("🌱 SEMBRANDO OFERTAS STARTER PART...");

    for (const p of PROMOS) {
        // Monetizar
        const tags = { amazon: 'masbaratodeal-20' }; // Hardcode temporal
        let link = p.link;
        if (link.includes('amazon')) link += `?tag=${tags.amazon}`;

        const uuid = Math.random().toString(36).substring(2, 11);

        console.log(`📌 Insertando: ${p.title}`);

        // DB
        db.prepare(`
            INSERT INTO published_deals (id, title, price_offer, price_official, link, image, tienda, categoria, description, coupon, posted_at, score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        `).run(uuid, p.title, p.price_offer, p.price_official, link, p.image, p.tienda, p.categoria, p.description, p.coupon || null, p.score);

        // Telegram
        // Simulamos un objeto 'deal' completo para el notificador
        const dealObj = {
            ...p,
            link: link,
            viralContent: `
<b>🔥 ¡OFERTA DESTACADA!</b>

<b>${p.title}</b>
💰 <b>$${p.price_offer}</b> <s>$${p.price_official}</s>
📉 <i>-${Math.round((1 - p.price_offer / p.price_official) * 100)}% Descuento</i>

${p.description}
${p.coupon ? `🎟️ Cupón: <code>${p.coupon}</code>` : ''}

👉 <a href="${link}">VER OFERTA AQUÍ</a>
`
        };

        try {
            await Telegram.sendOffer(dealObj);
        } catch (e) { console.error("Error TG:", e.message); }

        await new Promise(r => setTimeout(r, 3000));
    }

    console.log("✅ SEEDING COMPLETADO. Web llena.");
}

seed();
