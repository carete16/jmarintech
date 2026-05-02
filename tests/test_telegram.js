const { Telegraf } = require('telegraf');
require('dotenv').config();

async function testTelegram() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    console.log(`Intentando enviar mensaje a ${channelId} con token ${token ? 'PRESENTE' : 'FALTANTE'}`);

    const bot = new Telegraf(token);
    try {
        await bot.telegram.sendMessage(channelId, '🚀 Test de conexión de MasbaratoDeals. Si ves esto, el bot está bien configurado.');
        console.log('✅ ¡Mensaje enviado con éxito!');
    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error.message);
    }
}

testTelegram();
