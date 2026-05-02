const RSSParser = require('rss-parser');
const axios = require('axios');
const parser = new RSSParser();

async function testReddit() {
    const url = 'https://www.reddit.com/r/deals/new/.rss';
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MasbaratoBot/1.0' };

    try {
        const res = await axios.get(url, { headers });
        const feed = await parser.parseString(res.data);
        const item = feed.items[0];

        console.log('Title:', item.title);

        // Extraer imagen del contenido de Reddit
        const content = item.content || '';
        const imgMatch = content.match(/<img src="([^"]+)"/);
        const linkMatch = content.match(/<span><a href="([^"]+\.(jpg|png|jpeg))">/);

        let img = '';
        if (imgMatch) img = imgMatch[1];
        else if (linkMatch) img = linkMatch[1];

        console.log('Found Image:', img);

        if (img) {
            const imgRes = await axios.get(img, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            console.log('Download OK:', imgRes.data.length);
        }
    } catch (e) {
        console.log('FAIL:', e.message);
    }
}
testReddit();
