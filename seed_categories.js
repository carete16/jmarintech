const { saveDeal } = require('./src/database/db');

// Seed deals para garantizar representación de todas las categorías
const seedDeals = [
    // TECNOLOGÍA
    {
        id: 'seed_tech_1',
        title: 'Apple AirPods Pro (2nd Gen) with MagSafe',
        price_offer: 189.99,
        price_official: 249.00,
        link: 'https://www.amazon.com/dp/B0CHWRXH8B?tag=masbaratodeal-20',
        image: 'https://m.media-amazon.com/images/I/61SUj2W5yXL._AC_SL1500_.jpg',
        tienda: 'Amazon',
        categoria: 'Tecnología',
        score: 97,
        badge: 'MUST HAVE',
        description: 'Los mejores auriculares con cancelación de ruido del mercado. Calidad de audio excepcional y batería de larga duración.'
    },
    {
        id: 'seed_tech_2',
        title: 'Samsung 990 PRO SSD 2TB PCIe 4.0 NVMe',
        price_offer: 169.99,
        price_official: 249.99,
        link: 'https://www.amazon.com/dp/B0BHJJ9Y77?tag=masbaratodeal-20',
        image: 'https://m.media-amazon.com/images/I/71R6U25rKXL._AC_SL1500_.jpg',
        tienda: 'Amazon',
        categoria: 'Tecnología',
        score: 92,
        badge: 'PRECIO MÍNIMO',
        description: 'SSD de alto rendimiento para gaming y edición profesional. Velocidades de lectura hasta 7,450 MB/s.'
    },

    // GAMER
    {
        id: 'seed_gamer_1',
        title: 'PlayStation 5 Console (Slim Model)',
        price_offer: 449.00,
        price_official: 499.00,
        link: 'https://www.amazon.com/dp/B0CL61HW92?tag=masbaratodeal-20',
        image: 'https://m.media-amazon.com/images/I/510uTHyDqGL._AC_SL1500_.jpg',
        tienda: 'Amazon',
        categoria: 'Gamer',
        score: 95,
        badge: 'LO MÁS VENDIDO',
        description: 'La consola de nueva generación más buscada. Incluye control DualSense y acceso a catálogo exclusivo de juegos.'
    },
    {
        id: 'seed_gamer_2',
        title: 'Logitech G502 HERO Gaming Mouse',
        price_offer: 39.99,
        price_official: 79.99,
        link: 'https://www.amazon.com/dp/B07GBZ4Q68?tag=masbaratodeal-20',
        image: 'https://m.media-amazon.com/images/I/61mpMH5TzkL._AC_SL1500_.jpg',
        tienda: 'Amazon',
        categoria: 'Gamer',
        score: 88,
        badge: 'SUPER PRECIO',
        description: 'Mouse gaming profesional con sensor HERO 25K. 11 botones programables y pesos ajustables.'
    },

    // MODA
    {
        id: 'seed_moda_1',
        title: 'Levi\'s Men\'s 501 Original Fit Jeans',
        price_offer: 39.99,
        price_official: 69.50,
        link: 'https://www.amazon.com/dp/B0018OLT2Q?tag=masbaratodeal-20',
        image: 'https://m.media-amazon.com/images/I/71508JlcmyL._AC_SX679_.jpg',
        tienda: 'Amazon',
        categoria: 'Moda',
        score: 85,
        badge: 'CLÁSICO',
        description: 'Los jeans icónicos de Levi\'s. Corte clásico y calidad duradera que nunca pasa de moda.'
    },
    {
        id: 'seed_moda_2',
        title: 'Ray-Ban Wayfarer Classic Sunglasses',
        price_offer: 119.00,
        price_official: 163.00,
        link: 'https://www.amazon.com/dp/B001GNBJNW?tag=masbaratodeal-20',
        image: 'https://m.media-amazon.com/images/I/51ZfNqv+NFL._AC_SX679_.jpg',
        tienda: 'Amazon',
        categoria: 'Moda',
        score: 90,
        badge: 'ICÓNICO',
        description: 'Las gafas de sol más reconocidas del mundo. Protección UV 100% y estilo atemporal.'
    },

    // HOGAR
    {
        id: 'seed_hogar_1',
        title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker',
        price_offer: 79.99,
        price_official: 119.99,
        link: 'https://www.amazon.com/dp/B00FLYWNYQ?tag=masbaratodeal-20',
        image: 'https://m.media-amazon.com/images/I/71Ssp2JJjaL._AC_SL1500_.jpg',
        tienda: 'Amazon',
        categoria: 'Hogar',
        score: 93,
        badge: 'BESTSELLER',
        description: 'Olla multifunción 7 en 1. Cocina rápido, saludable y ahorra energía. Perfecta para familias.'
    },
    {
        id: 'seed_hogar_2',
        title: 'Dyson V8 Cordless Vacuum Cleaner',
        price_offer: 299.99,
        price_official: 469.99,
        link: 'https://www.amazon.com/dp/B01IENFJ14?tag=masbaratodeal-20',
        image: 'https://m.media-amazon.com/images/I/51A9e1POfHL._AC_SL1000_.jpg',
        tienda: 'Amazon',
        categoria: 'Hogar',
        score: 91,
        badge: 'PREMIUM',
        description: 'Aspiradora inalámbrica de alto rendimiento. Succión potente y hasta 40 minutos de autonomía.'
    },

    // SALUD
    {
        id: 'seed_salud_1',
        title: 'Optimum Nutrition Gold Standard Whey Protein',
        price_offer: 49.99,
        price_official: 64.99,
        link: 'https://www.amazon.com/dp/B000QSNYGI?tag=masbaratodeal-20',
        image: 'https://m.media-amazon.com/images/I/71Qjd3TqPXL._AC_SL1500_.jpg',
        tienda: 'Amazon',
        categoria: 'Salud',
        score: 87,
        badge: 'FITNESS',
        description: 'Proteína whey #1 en ventas. 24g de proteína por servicio. Ideal para recuperación muscular.'
    },
    {
        id: 'seed_salud_2',
        title: 'Fitbit Charge 6 Fitness Tracker',
        price_offer: 129.95,
        price_official: 159.95,
        link: 'https://www.amazon.com/dp/B0CC6DW7N9?tag=masbaratodeal-20',
        image: 'https://m.media-amazon.com/images/I/61aMN+XHBWL._AC_SL1500_.jpg',
        tienda: 'Amazon',
        categoria: 'Salud',
        score: 89,
        badge: 'WELLNESS',
        description: 'Monitor de actividad con GPS integrado. Seguimiento de sueño, frecuencia cardíaca y más de 40 modos deportivos.'
    }
];

console.log('\n=== SEEDING DATABASE WITH CATEGORY DIVERSITY ===\n');

seedDeals.forEach((deal, i) => {
    saveDeal(deal);
    console.log(`✅ ${i + 1}/${seedDeals.length} - ${deal.categoria}: ${deal.title.substring(0, 50)}`);
});

console.log('\n=== SEED COMPLETE ===');
console.log('All categories now have representation!');
