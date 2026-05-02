const axios = require('axios');
async function testProxy() {
    const target = 'https://slickdeals.net/newsearch.php?mode=frontpage&threadfrequency=1d&sort=newest&runquery=1&type=all&format=rss';
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`;
    try {
        const res = await axios.get(proxy);
        console.log('Proxy OK! Content length:', res.data.contents.length);
        if (res.data.contents.includes('<rss')) {
            console.log('Es un RSS válido!');
        }
    } catch (e) {
        console.log('FAIL PROXY:', e.message);
    }
}
testProxy();
