const axios = require('axios');
async function testSlickWeserv() {
    const target = 'https://slickdeals.net/newsearch.php?mode=frontpage&threadfrequency=1d&sort=newest&runquery=1&type=all&format=rss';
    const url = `https://images.weserv.nl/?url=${encodeURIComponent(target)}&output=text`;
    try {
        const res = await axios.get(url);
        console.log('SUCCESS WESERV SLICK!', res.data.substring(0, 500));
    } catch (e) {
        console.log('FAIL WESERV SLICK:', e.message);
    }
}
testSlickWeserv();
