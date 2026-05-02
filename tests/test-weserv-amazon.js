const axios = require('axios');
async function test() {
    try {
        const res = await axios.get('https://images.weserv.nl/?url=https://m.media-amazon.com/images/I/71ItM9VREaL._AC_SL1500_.jpg', {
            responseType: 'arraybuffer'
        });
        console.log('OK!', res.data.length);
    } catch (e) {
        console.log('FAIL:', e.message);
    }
}
test();
