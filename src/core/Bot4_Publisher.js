const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();
const logger = require('../utils/logger');
const { saveDeal } = require('../database/db');

class TelegramNotifier {
    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.channels = {
            'Tecnología': process.env.CHANNEL_TECH || process.env.TELEGRAM_CHANNEL_ID,
            'Hogar': process.env.CHANNEL_HOGAR || process.env.TELEGRAM_CHANNEL_ID,
            'Moda': process.env.CHANNEL_MODA || process.env.TELEGRAM_CHANNEL_ID,
            'Relojes': process.env.CHANNEL_MODA || process.env.TELEGRAM_CHANNEL_ID,
            'PC Components': process.env.CHANNEL_TECH || process.env.TELEGRAM_CHANNEL_ID,
            'Sneakers': process.env.CHANNEL_MODA || process.env.TELEGRAM_CHANNEL_ID,
            'default': process.env.TELEGRAM_CHANNEL_ID
        };
    }

    async downloadImage(url) {
        if (!url) return null;
        try {
            const config = {
                method: 'get',
                url: url,
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Referer': 'https://www.google.com/'
                },
                timeout: 12000
            };

            let response = await axios(config);

            // Si falla directamente (ej: 403), intentamos via un servicio de bypass simple si existe o repetimos con proxy
            if (response.status !== 200) {
                logger.warn(`⚠️ Reintentando descarga con proxy para: ${url}`);
                // Podríamos usar un servicio como wsrv.nl para bypass de hotlinking
                const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
                response = await axios({ ...config, url: proxyUrl });
            }

            if (response.status === 200) {
                return Buffer.from(response.data, 'binary');
            }
        } catch (error) {
            // Último intento con weserv si el anterior falló por excepción
            try {
                const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
                const res = await axios({
                    url: proxyUrl,
                    responseType: 'arraybuffer',
                    timeout: 8000
                });
                if (res.status === 200) return Buffer.from(res.data, 'binary');
            } catch (e) { }

            logger.error(`Error descarga imagen (${url.substring(0, 30)}...): ${error.message}`);
        }
        return null;
    }

    async sendOffer(deal) {
        try {
            // 1. ASIGNAR ID ÚNICO SEGURO
            const crypto = require('crypto');
            let safeId = deal.id;
            if (!safeId || safeId.includes('http')) {
                safeId = crypto.createHash('md5').update(deal.link || Date.now().toString()).digest('hex').substring(0, 12);
            }

            // 2. GUARDAR EN BASE DE DATOS LOCAL (SIEMPRE)
            try {
                saveDeal({
                    id: safeId,
                    link: deal.link,
                    original_link: deal.original_link || deal.link,
                    title: deal.title,
                    price_official: deal.price_official,
                    price_offer: deal.price_offer,
                    image: deal.image,
                    tienda: deal.tienda,
                    categoria: deal.categoria,
                    description: deal.viralContent || deal.description,
                    coupon: deal.coupon,
                    badge: deal.badge,
                    score: deal.score,
                    status: deal.status || 'published',
                    price_cop: deal.price_cop || 0,
                    is_historic_low: deal.is_historic_low
                });
                logger.info(`💾 Deal guardado en la Web: ${deal.title}`);
            } catch (dbErr) {
                logger.error(`❌ Error DB Local: ${dbErr.message}`);
            }

            // 3. INTENTAR ENVÍO A TELEGRAM (SI HAY TOKEN)
            if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'tu_token_aqui') {

                // --- SEGURIDAD: No publicar pendientes ---
                if (deal.status === 'pending_express') {
                    logger.info(`⏳ Oferta guardada en pendiente (Express) - No se envía a Telegram aún.`);
                    return true;
                }
                const channelId = this.channels[deal.categoria] || this.channels['default'];
                let photoBuffer = null;
                if (deal.image && !deal.image.includes('.svg') && !deal.image.includes('placehold.co')) {
                    photoBuffer = await this.downloadImage(deal.image);
                }

                // --- FORMATO DE ALERTA RELÁMPAGO (MONETIZACIÓN AGRESIVA) ---
                const discount = deal.price_official > deal.price_offer
                    ? Math.round((1 - deal.price_offer / deal.price_official) * 100)
                    : 0;

                let alertHeader = "";
                if (discount >= 70) {
                    alertHeader = "🚨🚨 <b>¡ALERTA DE ERROR DE PRECIO / LIQUIDACIÓN!</b> 🚨🚨\n\n";
                    deal.viralContent = (deal.viralContent || "") + "\n\n⚠️ <b>ESTO VA A VOLAR:</b> Aprovecha ahora antes de que corrijan el precio.";
                }

                let caption = `${alertHeader}<b>${deal.title}</b>\n\n${deal.viralContent || ''}`;

                // --- LOGICA EXPRESS (PRECIO COP) ---
                if (deal.price_cop > 0) {
                    const copFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(deal.price_cop);
                    caption += `\n\n🇨🇴 <b>PRECIO FINAL COLOMBIA: ${copFormatted}</b>`;
                    caption += `\n📦 <i>Envío Gratis e Impuestos Incluidos</i>`;
                    caption += `\n🚀 <a href="https://masbaratoexpress.onrender.com/">Ver en Masbarato Express</a>`;
                } else if (deal.coupon) {
                    caption += `\n\n🎟️ <b>CUPÓN:</b> <code>${deal.coupon}</code>`;
                }

                const inlineKeyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🛒 VER OFERTA', url: deal.link }]
                        ]
                    }
                };

                try {
                    if (photoBuffer && photoBuffer.length > 500) {
                        await this.bot.telegram.sendPhoto(channelId,
                            { source: photoBuffer },
                            { caption, parse_mode: 'HTML', ...inlineKeyboard }
                        );
                    } else {
                        await this.bot.telegram.sendMessage(channelId,
                            caption,
                            { parse_mode: 'HTML', ...inlineKeyboard }
                        );
                    }
                    logger.info(`📢 Notificado en Telegram con botón de compra.`);
                } catch (tgErr) {
                    if (tgErr.message.includes('401')) {
                        logger.error(`🚨 ERROR CRÍTICO TELEGRAM: TOKEN INVÁLIDO (401). El bot no puede publicar. Por favor, actualiza TELEGRAM_BOT_TOKEN en .env`);
                    } else {
                        logger.warn(`⚠️ Telegram Error (omitido): ${tgErr.message}`);
                    }
                }
            }

            // 4. INTENTAR ENVÍO A REDES SOCIALES (FB/IG)
            if (deal.status !== 'pending_express') {
                try {
                    const SocialPublisher = require('./Bot5_SocialPublisher');
                    await SocialPublisher.publish(deal);
                } catch (socialErr) {
                    logger.warn(`⚠️ Social Error (omitido): ${socialErr.message}`);
                }
            }

            return true;
        } catch (error) {
            logger.error(`Error crítico en Publisher: ${error.message}`);
            return false;
        }
    }
}

module.exports = new TelegramNotifier();
