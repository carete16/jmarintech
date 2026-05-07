require('dotenv').config();
const EbayAPI = require('./src/core/EbayAPIRadar');

(async () => {
    try {
        const results = await EbayAPI.searchItems('laptop refurbished bulk', 15, {
            categoryId: '177',
            aspectFilters: {
                'Processor': ['Intel Core i5 5th Gen.', 'AMD Ryzen 7', 'Intel Core i7-6600U', 'Intel Core i5 6th Gen.']
            }
        });
        console.log("API Results:", results.map(r => ({ id: r.id, title: r.title, price: r.price })));
    } catch (e) {
        console.error(e);
    }
})();
