const axios = require('axios');
async function testRedditJson() {
    const url = 'https://www.reddit.com/r/deals/new/.json';
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MasbaratoBot/1.0' };
    try {
        const res = await axios.get(url, { headers });
        const items = res.data.data.children;
        const item = items[0].data;
        console.log('Title:', item.title);
        console.log('Thumbnail:', item.thumbnail);
        console.log('Post Hint:', item.post_hint);
        console.log('URL (Image):', item.url);

        // Si no es imagen directa, intentamos buscar en preview
        if (item.preview && item.preview.images) {
            console.log('Preview Image:', item.preview.images[0].source.url);
        }
    } catch (e) {
        console.log('FAIL REDDIT JSON:', e.message);
    }
}
testRedditJson();
