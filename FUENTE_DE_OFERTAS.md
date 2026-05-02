# 🔍 FUENTE DE OFERTAS - MasbaratoDeals

**Fecha:** 14 de Enero, 2026  
**Descubrimiento Importante:** 📝

---

## ⚠️ ACLARACIÓN IMPORTANTE

### El Bot NO usa Slickdeals directamente

**Fuente Real:** **Reddit r/deals**

---

## 📊 ¿POR QUÉ REDDIT Y NO SLICKDEALS?

### Ventajas de Reddit r/deals:

1. **Más Estable** ✅
   - API pública y confiable
   - No bloquea bots
   - Formato JSON consistente

2. **Ofertas de Calidad** ✅
   - Comunidad activa verificando ofertas
   - Sistema de "upvotes" = validación social
   - Solo ofertas USA populares

3. **Sin Problemas Legales** ✅
   - API oficial de Reddit
   - Permitido para bots
   - No viola términos de servicio

4. **Información Completa** ✅
   - Enlaces directos a tiendas
   - Imágenes de productos
   - Precios en los títulos
   - Categorización automática

---

## 🔗 FUENTE ACTUAL

### URL:
```
https://www.reddit.com/r/deals/new/.json?limit=25
```

### Tiendas que Aparecen:
- ✅ Amazon USA
- ✅ eBay
- ✅ Walmart
- ✅ Best Buy
- ✅ Target
- ✅ Otras tiendas USA

---

## 🔒 FILTRO ANTI-COMPETENCIA

### ¿Sigue Siendo Necesario?

**SÍ**, porque:

1. **Reddit puede mencionar Slickdeals**
   - Los usuarios de Reddit a veces comparten links de Slickdeals
   - El filtro los bloqueará automáticamente

2. **Protección General**
   - Elimina cualquier mención a competencia
   - Limpia títulos y descripciones
   - Asegura contenido profesional

3. **Futuras Fuentes**
   - Si agregas Slickdeals directo más adelante
   - Si agregas otras fuentes
   - El filtro siempre estará activo

---

## 📋 EJEMPLO DE OFERTAS DE REDDIT

### Oferta Típica:

```json
{
  "title": "Apple AirPods Pro (2nd Gen) - $189 (was $249)",
  "url": "https://www.amazon.com/dp/B0CHWRXH8B",
  "score": 245,
  "tienda": "Amazon USA"
}
```

### Después del Procesamiento:

```
🔥 OFERTA EN AMAZON

Apple AirPods Pro (2nd Gen)
💰 $189 (antes $249)
📉 24% OFF

👉 https://amazon.com/dp/B0CHWRXH8B?tag=masbaratodeal-20

⭐ Oferta exclusiva verificada por +BARATO DEALS
```

---

## 🎯 FLUJO COMPLETO

```
Reddit r/deals
    ↓
Extracción de Ofertas (SlickdealsCollector)
    ↓
Filtro de Calidad (score >= 50, descuento >= 30%)
    ↓
Transformación de Enlaces (tag de afiliado)
    ↓
Filtro Anti-Competencia (eliminar "Slickdeals")
    ↓
Generación de Contenido Viral (IA)
    ↓
Publicación en Telegram
```

---

## 📊 ESTADÍSTICAS DE REDDIT

### Límite de Ofertas:
- **25 ofertas** por consulta
- **Top 10** se seleccionan
- **Cada 30 minutos** se actualiza

### Criterios de Selección:
1. ✅ Debe ser de tienda USA
2. ✅ Debe tener precio en el título
3. ✅ Debe tener imagen disponible
4. ✅ Score mínimo (upvotes)

---

## 🔄 ¿QUIERES AGREGAR SLICKDEALS DIRECTO?

### Actualmente NO está implementado porque:

1. **Slickdeals bloquea bots** fácilmente
2. **Reddit es más confiable** y estable
3. **Misma calidad de ofertas** (Reddit copia de Slickdeals)
4. **Sin riesgo legal** (API oficial)

### Si quieres agregarlo:

Necesitarías:
- Proxy rotativo
- User-Agent aleatorio
- Delays entre requests
- Manejo de CAPTCHAs
- **Más complejo y menos confiable**

---

## ✅ RECOMENDACIÓN

**MANTENER Reddit r/deals como fuente principal**

### Razones:

1. ✅ **Funciona perfectamente** ahora
2. ✅ **Ofertas de alta calidad** (validadas por comunidad)
3. ✅ **Sin bloqueos** ni problemas
4. ✅ **API estable** y confiable
5. ✅ **Mismo contenido** que Slickdeals (la comunidad lo comparte)

---

## 🎉 CONCLUSIÓN

### Tu Bot Está Usando:

- **Fuente:** Reddit r/deals ✅
- **Calidad:** Ofertas USA verificadas ✅
- **Estabilidad:** API oficial de Reddit ✅
- **Filtro:** Anti-competencia activo ✅
- **Monetización:** Tag de afiliado en todos los links ✅

### Tu Audiencia Ve:

```
🔥 OFERTA EN AMAZON
[Producto]
💰 Precio con descuento
👉 Link con TU tag de afiliado
⭐ Crédito para MasbaratoDeals
```

**SIN saber que viene de Reddit** ✅

---

## 📝 NOTA FINAL

El nombre "SlickdealsCollector" en el código es **histórico**.

En realidad usa **Reddit**, que es:
- Más confiable
- Más estable
- Misma calidad de ofertas
- Sin problemas legales

**El filtro anti-competencia sigue siendo útil** para:
- Limpiar menciones a Slickdeals en títulos de Reddit
- Protección general contra competencia
- Futuras fuentes que agregues

---

**¿Quieres ver las ofertas actuales que está tomando?**

Ejecuta: `node mostrar-ofertas-slickdeals.js`
