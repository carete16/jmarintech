/**
 * CONFIGURACIÓN GLOBAL | MASBARATO EXPRESS PRO
 * Centraliza todos los parámetros para facilitar modificaciones futuras.
 */
require('dotenv').config(); // ← CARGAR .env PRIMERO

module.exports = {
    // Servidor
    server: {
        port: 10000,
        env: 'production',
        dbPath: process.env.DB_PATH || './src/database/deals.db'
    },

    scraper: {
        auto_scan: false, 
        headless_background: true,
        headless_manual: true, 
        timeout_navigation: 90000,
        timeout_captcha: 60000,
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    },

    // Motor de Inteligencia Artificial (Google Gemini)
    ai: {
        model: "gemini-1.5-flash", // Opciones: "gemini-1.5-pro", "gemini-1.5-flash"
        fallback_enabled: true
    },

    // Categorías Permitidas (Especialización Tecnología)
    categories: [
        'Tecnología',
        'Laptops',
        'PC Towers',
        'Monitores',
        'Celulares'
    ],

    // Parámetros de Negocio
    business: {
        default_markup: 1.15, // 15% de ganancia por defecto
        trm_fixed: 3634,
        shipping_per_lb: 3.5
    }
};
