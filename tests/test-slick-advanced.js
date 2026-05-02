const axios = require('axios');
async function testSlickdeals() {
    const url = 'https://slickdeals.net/newsearch.php?mode=frontpage&threadfrequency=1d&sort=newest&runquery=1&type=all&format=rss';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
    };
    try {
        const res = await axios.get(url, { headers, timeout: 10000 });
        console.log('SUCCESS!', res.data.substring(0, 200));
    } catch (e) {
        console.log('FAIL:', e.status, e.message);
        if (e.response) console.log('Response status:', e.response.status);
    }
}
testSlickdeals();
