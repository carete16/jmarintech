const axios = require('axios');
async function testAsin() {
    const url = 'https://images-na.ssl-images-amazon.com/images/P/B09XS7JWHH.01.LZZZZZZZ.jpg';
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        console.log('OK ASIN IMG!', res.data.length);
    } catch (e) {
        console.log('FAIL ASIN IMG:', e.message);
    }
}
testAsin();
