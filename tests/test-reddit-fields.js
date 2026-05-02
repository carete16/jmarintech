const RSSParser = require('rss-parser');
const axios = require('axios');
const parser = new RSSParser();

async function testRedditFields() {
    const url = 'https://www.reddit.com/r/deals/new/.rss';
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MasbaratoBot/1.0' };
    const res = await axios.get(url, { headers });
    const feed = await parser.parseString(res.data);
    console.log(Object.keys(feed.items[0]));
    console.log(JSON.stringify(feed.items[0], null, 2));
}
testRedditFields();
