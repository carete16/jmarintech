const { Telegraf } = require('telegraf');
require('dotenv').config();

async function testTelegram() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    console.log(`Testing Telegram with Token: ${token.substring(0, 10)}... and Channel: ${channelId}`);

    const bot = new Telegraf(token);
    try {
        await bot.telegram.sendMessage(channelId, "🚀 PRUEBA DE CONEXIÓN: MasbaratoDeals está intentando enviar una oferta.");
        console.log("✅ Mensaje enviado con éxito a Telegram.");
    } catch (e) {
        console.error("❌ Error enviando a Telegram:", e.message);
    }
}

testTelegram();
