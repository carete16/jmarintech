const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    // 1. Configurar Puppeteer
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=800,800']
    });
    const page = await browser.newPage();

    // 2. Cargar el HTML final
    const htmlPath = path.join(process.cwd(), 'logo_generator.html');
    const fileUrl = `file://${htmlPath}`;
    console.log(`📸 Cargando Generador Final: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // 3. Capturar Logo OFICIAL
    console.log("📸 Generando logo 'Trust & Security'...");
    const socialLogo = await page.$('.social-fusion-container');
    if (socialLogo) {
        await socialLogo.screenshot({
            path: 'public/images/logo_masbarato_oficial.png',
            omitBackground: true
        });
        console.log("✅ LOGO CREADO: public/images/logo_masbarato_oficial.png");
    } else {
        console.error("❌ Error: No se encontró el contenedor del logo.");
    }

    await browser.close();
    console.log("✨ ¡Listo para usar en Instagram, WhatsApp y Facebook!");
})();
