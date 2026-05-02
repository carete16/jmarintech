const axios = require('axios');
async function test() {
    const asin = 'B09XS7JWHH';
    const urls = [
        `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`,
        `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&Format=_SL1000_&ASIN=${asin}&ID=AsinImage&ServiceVersion=20070822&WS=1`,
        `https://images.amazon.com/images/P/${asin}.01.MZZZZZZZ.jpg`
    ];
    for (const url of urls) {
        try {
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            console.log(`URL: ${url} -> ${res.data.length} bytes`);
        } catch (e) {
            console.log(`URL: ${url} -> FAIL ${e.message}`);
        }
    }
}
test();
