require('dotenv').config();
const EbayAPI = require('./src/core/EbayAPIRadar');

(async () => {
    let q = "https://www.ebay.com/sch/177/i.html?_nkw=laptos+refurbished+bulk&_from=R40&Processor=Intel%2520Core%2520i5%25205th%2520Gen%252E%7CAMD%2520Ryzen%25207%7CIntel%2520Core%2520i7%252D6600U%7CIntel%2520Core%2520i5%25206th%2520Gen%252E&_dcat=177&rt=nc&LH_ItemCondition=2010";
    
    let categoryId = null;
    let aspectFilters = {};
    let condition = null;
    const urlObj = new URL(q);
    const nkw = urlObj.searchParams.get('_nkw');
    if (nkw) {
        q = nkw.replace(/\+/g, ' ');
        q = q.replace(/\blaptos\b/ig, 'laptops'); 
    }
    
    categoryId = urlObj.searchParams.get('_dcat') || urlObj.pathname.match(/\/sch\/(\d+)\//)?.[1];
    
    ['Processor', 'RAM Size', 'Model', 'Storage Type'].forEach(key => {
        const val = urlObj.searchParams.get(key);
        if (val) aspectFilters[key] = val.split('|');
    });

    const lhCond = urlObj.searchParams.get('LH_ItemCondition');
    if (lhCond) {
        const condMapUrl = {
            '1000': 'NEW',
            '2000': 'CERTIFIED_REFURBISHED',
            '2010': 'EXCELLENT_REFURBISHED',
            '2020': 'VERY_GOOD_REFURBISHED',
            '2030': 'GOOD_REFURBISHED',
            '3000': 'USED'
        };
        if (condMapUrl[lhCond]) condition = condMapUrl[lhCond];
    }

    console.log("Filters parsed:", { q, condition, categoryId, aspectFilters });

    try {
        const results = await EbayAPI.searchItems(q, 15, { condition, categoryId, aspectFilters });
        console.log("API Results:", results.map(r => ({ id: r.id, title: r.title, price: r.price })));
    } catch (e) {
        console.error(e);
    }
})();
