const Telegram = require('./src/notifiers/TelegramNotifier');
const config = require('dotenv').config();

async function ping() {
    console.log("🚑 EMERGENCY BROADCAST...");

    try {
        await Telegram.bot.telegram.sendMessage(process.env.TELEGRAM_CHANNEL_ID,
            "🟢 <b>SISTEMA RESTAURADO Y OPERATIVO</b>\n\nEl bot de MasbaratoDeals se ha reiniciado correctamente. Las ofertas comenzarán a fluir en breve. 🚀",
            { parse_mode: 'HTML' }
        );
        console.log("✅ Mensaje enviado DIRECTO (Bypass de todo).");
    } catch (e) {
        console.error("❌ ERROR FATAL TELEGRAM:", e.message);
    }
}

ping();
