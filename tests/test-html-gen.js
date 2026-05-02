const deal = {
    id: 'test12345',
    title: 'Samsung 65" Class OLED S90C Series TV (2024 Model)',
    price_offer: 1599.99,
    price_official: 2599.99,
    tienda: 'Amazon',
    image: 'https://example.com/tv.jpg',
    coupon: 'SAVE1000',
    badge: 'LIQUIDACIÓN TOTAL',
    votes_up: 150,
    comment_count: 45,
    posted_at: new Date().toISOString()
};

// Logic from index.html
const storeColors = {
    'Amazon': '#232f3e',
    'Walmart': '#0071ce',
    'eBay': '#e53238',
    'Best Buy': '#fff200',
    'Target': '#cc0000',
    'Adidas': '#000000',
    'Nike': '#000000'
};
const storeColor = storeColors[deal.tienda] || '#475569';
const storeTextColor = deal.tienda === 'Best Buy' ? '#000' : '#fff';

const discount = (deal.price_official > deal.price_offer)
    ? Math.round(((deal.price_official - deal.price_offer) / deal.price_official) * 100)
    : 0;

const discountBadge = discount > 0 ? `
    <div style="position:absolute; top:15px; right:15px; background:#ef4444; color:white; ...">-${discount}%</div>` : '';

const storeBadge = `
    <div style="... background:${storeColor}; color:${storeTextColor}; ...">${deal.tienda}</div>`;

console.log('--- GENERATED HTML SNIPPET ---');
console.log(`Store Color: ${storeColor}`);
console.log(`Discount: ${discount}%`);
console.log(`Badge HTML: ${storeBadge.trim()}`);
console.log('-------------------------------');
