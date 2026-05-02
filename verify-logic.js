const LinkTransformer = require('./src/utils/LinkTransformer');

const deal = {
    id: 'test_klipsch',
    title: 'Klipsch RP-8000F II Floorstanding Speakers (Pair) $900 + Free S/H',
    tienda: 'Oferta USA',
    link: 'https://slickdeals.net/f/19107874-klipsch-...'
};

async function test() {
    console.log('--- TEST LOGICA TRANSFORMER ---');
    console.log('Titulo:', deal.title);
    console.log('Tienda Original:', deal.tienda);

    const result = await LinkTransformer.transform(deal.link, deal);

    console.log('URL Generada:', result);

    if (result.includes('adorama')) {
        console.log('✅ ÉXITO: Detectado como Adorama');
    } else if (result.includes('amazon')) {
        console.log('❌ FALLO: Detectado como Amazon (Fallback)');
    } else {
        console.log('❓ OTRO:', result);
    }
}

test();
