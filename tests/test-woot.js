const RSSParser = require('rss-parser');
const axios = require('axios');
const parser = new RSSParser();

async function testWoot() {
    try {
        const response = await axios.get('https://www.woot.com/offers/rss'); // Intenta RSS de Woot
        const feed = await parser.parseString(response.data);
        console.log('Woot Feed:', feed.items[0].title);
        console.log('Image:', feed.items[0].media); // Algunos usan media:content
    } catch (e) {
        console.log('FAIL WOOT:', e.message);
    }
}
testWoot();
