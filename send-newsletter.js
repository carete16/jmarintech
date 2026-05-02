const { db } = require('./src/database/db');
const TelegramNotifier = require('./src/notifiers/TelegramNotifier');
const logger = require('./src/utils/logger');

/**
 * Script para enviar newsletter semanal a suscriptores
 * Ejecutar: node send-newsletter.js
 */

async function sendWeeklyNewsletter() {
    try {
        logger.info('📧 Iniciando envío de newsletter semanal...');

        // Obtener suscriptores activos
        const subscribers = db.prepare("SELECT email FROM subscribers WHERE status = 'active'").all();

        if (subscribers.length === 0) {
            logger.info('No hay suscriptores activos.');
            return;
        }

        // Obtener top 10 ofertas de la semana (con los mejores descuentos y clics)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const topDeals = db.prepare(`
            SELECT title, price_offer, price_official, tienda, link, image, clicks 
            FROM published_deals 
            WHERE posted_at > ? 
            ORDER BY clicks DESC, score DESC
            LIMIT 10
        `).all(weekAgo);

        if (topDeals.length === 0) {
            logger.info('No hay ofertas de esta semana.');
            return;
        }

        // Generar contenido del email
        const emailContent = generateEmailHTML(topDeals);

        logger.info(`📊 ${subscribers.length} suscriptores`);
        logger.info(`🔥 ${topDeals.length} ofertas destacadas`);

        // --- CONFIGURACIÓN DE ENVÍO REAL ---
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            logger.warn('⚠️ No hay credenciales de email en .env. Solo se mostrará el contenido en consola.');
            console.log('\n--- CONTENIDO DEL EMAIL ---');
            console.log(emailContent);
        } else {
            logger.info('🚀 Enviando emails...');
            for (const sub of subscribers) {
                try {
                    await transporter.sendMail({
                        from: `"+BARATO DEALS" <${process.env.EMAIL_USER}>`,
                        to: sub.email,
                        subject: '🔥 TOP 10: Chollos de la Semana que no puedes perderte',
                        html: emailContent
                    });
                    logger.info(`✅ Enviado a: ${sub.email}`);
                } catch (e) {
                    logger.error(`❌ Error enviando a ${sub.email}: ${e.message}`);
                }
            }
        }

        // Notificar en Telegram que se procesó la newsletter
        const bot = TelegramNotifier.bot;
        await bot.telegram.sendMessage(
            process.env.TELEGRAM_CHANNEL_ID,
            `📧 Newsletter semanal procesada para ${subscribers.length} suscriptores.`
        );

        logger.info('✅ Proceso de Newsletter completado');

    } catch (error) {
        logger.error(`Error enviando newsletter: ${error.message}`);
    }
}

function generateEmailHTML(deals) {
    const dealsHTML = deals.map((deal, index) => {
        const discount = deal.price_official > 0
            ? Math.round(((deal.price_official - deal.price_offer) / deal.price_official) * 100)
            : 0;

        return `
        <tr>
            <td style="padding: 20px; border-bottom: 1px solid #eee;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <img src="${deal.image}" alt="${deal.title}" style="max-width: 200px; max-height: 150px; border-radius: 8px;">
                </div>
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${index + 1}. ${deal.title}</h3>
                <p style="margin: 5px 0; color: #666;">
                    <strong style="color: #2563eb; font-size: 24px;">$${deal.price_offer}</strong>
                    ${deal.price_official > 0 ? `<span style="text-decoration: line-through; color: #999; margin-left: 10px;">$${deal.price_official}</span>` : ''}
                    ${discount > 0 ? `<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; margin-left: 10px; font-size: 12px; font-weight: bold;">-${discount}%</span>` : ''}
                </p>
                <p style="margin: 5px 0; color: #888; font-size: 13px;">🏪 ${deal.tienda || 'Masbarato Deals'} | 🔥 ${deal.clicks} personas interesadas</p>
                <a href="https://masbaratodeals.onrender.com/go/${deal.id}" style="display: inline-block; margin-top: 15px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; width: 80%; text-align: center;">🔥 COMPRAR AHORA</a>
            </td>
        </tr>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔥 Top 10 Ofertas de la Semana | +BARATO DEALS</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 50px 20px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 36px; font-weight: 900; letter-spacing: -1px;">+BARATO DEALS</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 18px; font-weight: 500;">🚀 Los Bombazos de la Semana</p>
                        </td>
                    </tr>
                    
                    <!-- Intro -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: center; background-color: #ffffff;">
                            <h2 style="color: #0f172a; margin: 0 0 15px 0; font-size: 22px;">¡Hola, Smart Shopper! 👋</h2>
                            <p style="margin: 0; color: #64748b; font-size: 16px; line-height: 1.6;">
                                Nuestra IA ha seleccionado las <strong>ofertas con mayor ahorro</strong> de los últimos 7 días.<br>
                                ¡Aprovéchalas antes de que se agoten!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Deals -->
                    ${dealsHTML}
                    
                    <!-- CTA -->
                    <tr>
                        <td style="padding: 50px 30px; text-align: center; background-color: #f8fafc;">
                            <h3 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px;">¿Buscas algo más?</h3>
                            <a href="https://masbaratodeals.onrender.com" style="display: inline-block; padding: 16px 40px; background: linear-gradient(to right, #2563eb, #7c3aed); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);">Ver todas las ofertas en vivo</a>
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px;">
                                O recibe alertas al segundo en Telegram: 
                                <a href="https://t.me/Masbarato_deals" style="color: #2563eb; text-decoration: none; font-weight: bold;">@Masbarato_deals</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 40px 20px; text-align: center; background-color: #0f172a; color: #94a3b8; font-size: 12px;">
                            <p style="margin: 0 0 10px 0;">© 2026 +BARATO DEALS - Ahorro inteligente garantizado</p>
                            <p style="margin: 0;">
                                <a href="https://masbaratodeals.onrender.com" style="color: #38bdf8; text-decoration: none; font-weight: 500;">Página Web Oficial</a> | 
                                <a href="#" style="color: #64748b; text-decoration: none;">Dejar de recibir estos emails</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

// Ejecutar
sendWeeklyNewsletter().then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
}).catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
