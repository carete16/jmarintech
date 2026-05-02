const axios = require('axios');
const fs = require('fs');

async function testDownload() {
    const url = 'https://www.dealnews.com/rss/todays-deals.xml';
    const response = await axios.get(url);
    const content = response.data;

    // Buscar la primera imagen
    const imgMatch = content.match(/src="([^"]+)"/);
    if (imgMatch) {
        const imgUrl = imgMatch[1];
        console.log('Probando descarga de:', imgUrl);

        try {
            const imgRes = await axios({
                method: 'get',
                url: imgUrl,
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            console.log('Éxito! Tamaño:', imgRes.data.length);
        } catch (e) {
            console.log('Fallo descarga:', e.message);
        }
    } else {
        console.log('No se encontró imagen en el feed');
    }
}

testDownload();
