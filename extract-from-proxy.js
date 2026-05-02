const fs = require('fs');

const html = fs.readFileSync('audit_fail.html', 'utf8');

console.log('--- BUSCANDO URLS OCULTAS EN EL PROXY HTML ---');

// Expresión regular para encontrar URLs http/https dentro del texto
const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
const matches = html.match(urlRegex) || [];

console.log(`Encontradas ${matches.length} cadenas tipo URL.`);

const walmartLinks = matches.filter(url => url.toLowerCase().includes('walmart.com'));
console.log(`URLs de Walmart encontradas: ${walmartLinks.length}`);

walmartLinks.forEach((link, i) => {
    // Limpiar basura que Google pueda haber pegado al final
    let clean = link.split('\\x')[0].split('"')[0].split('<')[0];
    // A veces Google pone &amp;
    clean = clean.replace(/&amp;/g, '&');

    console.log(`[${i}] ${clean}`);
});

// Prueba de extracción general para cualquier tienda
if (walmartLinks.length === 0) {
    console.log('Buscando cualquier enlace externo interesante...');
    matches.forEach(m => {
        if (!m.includes('google') && !m.includes('gstatic') && !m.includes('slickdeals') && (m.includes('.com') || m.includes('.net'))) {
            console.log('-> ' + m);
        }
    });
}
