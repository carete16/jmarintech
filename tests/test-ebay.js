const LinkTransformer = require('./src/utils/LinkTransformer');
const { saveDeal } = require('./src/database/db');

async function testEbayRedirection() {
    console.log('--- PRUEBA DE REDIRECCIÓN EBAY AFILIADOS ---');

    // 1. URL Original (Simulada desde Slickdeals o directa)
    const originalEbayUrl = 'https://www.ebay.com/itm/123456789012?hash=item1234567890:g:abcd';
    console.log('URL Original:', originalEbayUrl);

    // 2. Transformación a Afiliado
    const affiliateUrl = LinkTransformer.transform(originalEbayUrl);
    console.log('URL Transformada (eBay Partner Network):', affiliateUrl);

    // 3. Simular guardado en DB para la ruta /go/
    const testDeal = {
        id: 'test-ebay-99',
        link: affiliateUrl,
        title: 'EBAY TEST PRODUCT (EPN)',
        price_official: 100,
        price_offer: 70,
        image: 'https://picsum.photos/200'
    };

    saveDeal(testDeal);
    console.log('\n✅ Oferta de prueba insertada con ID: test-ebay-99');
    console.log('🔗 Link de Tracking Interno: http://localhost:4000/go/test-ebay-99');
    console.log('\nAl hacer clic en el link de arriba, el bot debería registrar el clic y redirigir a eBay con tu CampID.');
}

testEbayRedirection();
