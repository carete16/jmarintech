const axios = require('axios');
async function test() {
    try {
        const res = await axios.get('https://m.media-amazon.com/images/I/71ItM9VREaL._AC_SL1500_.jpg', {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log('OK!', res.data.length);
    } catch (e) {
        console.log('FAIL:', e.message);
    }
}
test();
