const axios = require('axios');
async function testTechBargains() {
    try {
        const res = await axios.get('https://www.techbargains.com/rss/all');
        console.log('SUCCESS TB!', res.data.substring(0, 200));
    } catch (e) {
        console.log('FAIL TB:', e.message);
    }
}
testTechBargains();
