const logger = require('../utils/logger');
const axios = require('axios');
const config = require('../config/settings');

/**
 * AIProcessor: Optimiza títulos y descripciones usando IA.
 * Prioridad: DeepSeek (gratis) → Gemini → OpenAI
 */
class AIProcessor {
    constructor() {
        // Constructor vacío - leer claves en tiempo de ejecución
    }

    _getProvider() {
        // 1️⃣ PRIORIDAD 1: DeepSeek (gratuito, siempre disponible)
        if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'tu_api_key_aqui') {
            return { provider: 'deepseek', apiKey: process.env.DEEPSEEK_API_KEY, model: 'deepseek-chat' };
        }
        // 2️⃣ PRIORIDAD 2: Gemini (respaldo)
        if (process.env.GOOGLE_GEMINI_KEY || process.env.GEMINI_API_KEY) {
            return {
                provider: 'gemini',
                apiKey: process.env.GOOGLE_GEMINI_KEY || process.env.GEMINI_API_KEY,
                model: 'gemini-2.0-flash'
            };
        }
        // 3️⃣ PRIORIDAD 3: OpenAI (respaldo)
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'tu_api_key_aqui') {
            return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' };
        }
        return { provider: 'none', apiKey: null, model: null };
    }

    async callAI(prompt) {
        const { provider, apiKey, model } = this._getProvider();

        if (provider === 'none') {
            logger.warn("⚠️ No se detectó ninguna API Key válida (DeepSeek/Gemini/OpenAI). Función IA deshabilitada.");
            return null;
        }

        try {
            if (provider === 'gemini') {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const response = await axios.post(url, {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3 }
                }, { timeout: 15000 });
                return response.data.candidates[0].content.parts[0].text;
            } else {
                const apiUrl = provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions';
                const response = await axios.post(apiUrl, {
                    model,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3
                }, {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    timeout: 15000
                });
                return response.data.choices[0].message.content;
            }
        } catch (e) {
            logger.error(`❌ Error en IA (${provider}): ${e.message}`);
            return null;
        }
    }

    async standardizeTechSpecs(rawSpecs) {
        if (!rawSpecs || rawSpecs.length < 10) return null;
        const prompt = `Extrae y estandariza las especificaciones técnicas de este texto. 
Responde ÚNICAMENTE un JSON válido (sin markdown) con estos campos:
{
    "screen": "ej: 15.6 pulgadas FHD",
    "processor": "ej: Intel Core i5-1135G7",
    "speed": "ej: 2.4 GHz",
    "ram": "ej: 16GB DDR4",
    "disk": "ej: 256GB SSD",
    "camera": "ej: HD 720p",
    "network": "ej: WiFi 11ac + BT",
    "condition": "ej: Very Good - Refurbished o Excelente (Extrae el estado exacto del producto)"
}

Texto: ${rawSpecs}`;

        const result = await this.callAI(prompt);
        if (!result) return null;
        try {
            return JSON.parse(result.replace(/```json|```/g, '').trim());
        } catch (e) { return null; }
    }

    async generateEnhancedContent(rawTitle, rawSpecs = '') {
        const prompt = `Actúa como experto en E-commerce. Genera un JSON con esta estructura:
{
    "title": "Título corto (max 65 car), persuasivo con 1 emoji al inicio.",
    "description": "2 párrafos cortos de venta (max 250 car).",
    "specs": "Lista de 4 bullet points con emojis."
}
Producto: ${rawTitle}
Especificaciones: ${rawSpecs}
Responde SOLO el JSON.`;

        const result = await this.callAI(prompt);
        if (!result) return { title: rawTitle, description: "", specs: "" };
        try {
            return JSON.parse(result.replace(/```json|```/g, '').trim());
        } catch (e) {
            return { title: rawTitle, description: "", specs: "" };
        }
    }

    async analyzePageContent(html) {
        // Método especial para rescatar datos cuando el scraper falla
        const prompt = `Analiza este fragmento de HTML de eBay/Amazon y extrae el PRECIO y el TÍTULO real.
Responde SOLO un JSON: {"title": "...", "price": 0.00}
Si no encuentras el precio, pon 0.
HTML: ${html.substring(0, 10000)}`; // Enviamos solo una parte por límites de token

        const result = await this.callAI(prompt);
        if (!result) return null;
        try {
            return JSON.parse(result.replace(/```json|```/g, '').trim());
        } catch (e) { return null; }
    }
}

module.exports = new AIProcessor();
