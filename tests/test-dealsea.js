const axios = require('axios');
async function testDealSea() {
    try {
        const res = await axios.get('http://dealsea.com/rss');
        console.log('SUCCESS DEALSEA!', res.data.substring(0, 500));
    } catch (e) {
        console.log('FAIL DEALSEA:', e.message);
    }
}
testDealSea();
