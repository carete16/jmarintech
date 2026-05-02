# 💰 GUÍA MAESTRA DE MONETIZACIÓN

Sigue estos pasos para completar tu configuración de facturación.

---

## 1. ✅ AMAZON (Configurado)
Ya tienes esto listo.
- **Tu ID:** `masbaratodeal-20`
- **Estado:** ✅ FACTURANDO

---

## 2. 🟡 EBAY (Pendiente)
eBay paga muy bien (50-70% de sus comisiones).

1. **Regístrate aquí:** [eBay Partner Network](https://partnernetwork.ebay.com/)
2. Completa el formulario (usa tu web `masbaratodeals.com` o canal de Telegram).
3. Una vez dentro, ve a **Campaigns** > **New Campaign**.
4. Copia el **Campaign ID** (es un número largo, ej: `5338901234`).
5. Abre el archivo `.env` y agrega:
   ```bash
   EBAY_CAMPAIGN_ID=5338901234
   ```

---

## 3. 🟡 TODAS LAS DEMÁS (Microcenter, BestBuy, Walmart, Nike...)
No te registres en cada una. Usa **Sovrn (VigLink)**. Es la forma más rápida.

1. **Regístrate aquí:** [Sovrn Commerce (VigLink)](https://www.sovrn.com/commerce/)
2. Crea una cuenta "Publisher".
3. Ve a **Zones** o **API**. Busca la opción **"Anywhere"** o **"Link Wrapper"**.
4. Te darán un link base que se ve así:
   `https://redirect.viglink.com?key=TU_API_KEY_LARGA&u=`
5. Abre el archivo `.env` y agrega:
   ```bash
   SOVRN_URL_PREFIX=https://redirect.viglink.com?key=abc1234567890def&u=
   ```

**¡MAGIA AUTOMÁTICA!** ✨
Una vez pongas ese `SOVRN_URL_PREFIX`, tu bot automáticamente convertirá links de:
- Microcenter
- BestBuy
- Target
- Nike
- Adidas
- Newegg
- ...y 50,000 tiendas más

...en links de afiliado. **Si alguien compra, tú cobras.**

---

## 4. 📝 EJEMPLO DE ARCHIVO .ENV FINAL

Así debe quedar tu `.env` cuando termines:

```env
# ... otras configuraciones ...

# MONETIZACION
AMAZON_TAG=masbaratodeal-20
EBAY_CAMPAIGN_ID=5338901234
SOVRN_URL_PREFIX=https://redirect.viglink.com?key=tu_key_larga&u=
```

---

## ⚠️ IMPORTANTE

Si mañana consigues afiliación directa con BestBuy (ejemplo), solo agrégala en `LinkTransformer.js` antes del bloque de Sovrn, y ganarás el 100% de la comisión en lugar del 75%. Pero para empezar, Sovrn es la mejor estrategia.
