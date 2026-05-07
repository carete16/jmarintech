require('dotenv').config();
const EbayAPI = require('./src/core/EbayAPIRadar');
const axios = require('axios');

(async () => {
    const token = await EbayAPI.getToken();
    const params = {
        q: 'laptops refurbished bulk',
        limit: 15,
        filter: 'buyingOptions:{FIXED_PRICE},conditionIds:{2010}', // USING conditionIds instead of conditions
        category_ids: '177',
        aspect_filter: 'categoryId:177,Processor:{Intel Core i5 5th Gen.|AMD Ryzen 7|Intel Core i7-6600U|Intel Core i5 6th Gen.}'
    };
    
    try {
        const resp = await axios.get(`https://api.ebay.com/buy/browse/v1/item_summary/search`, {
            params,
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
            }
        });
        const summaries = resp.data.itemSummaries || [];
        console.log("Results with conditionIds:{2010}:", summaries.length);
        summaries.forEach(s => console.log(s.itemId, s.title));
    } catch(e) {
        console.log(e.response?.data || e.message);
    }
})();
