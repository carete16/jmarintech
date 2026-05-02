# Programas de Afiliados - Configuración Multi-Tienda

Este proyecto está configurado para monetizar ofertas de múltiples tiendas:

## 🏪 Tiendas Soportadas

### 1. Amazon Associates
- **Tag**: `AMAZON_TAG` (env variable)
- **Comisión**: 1-10% según categoría
- **Duración cookie**: 24 horas
- **Registro**: https://affiliate-program.amazon.com

### 2. Walmart Affiliates
- **Tag**: `WALMART_ID` (env variable)
- **Comisión**: 1-4%
- **Duración cookie**: 3 días
- **Registro**: https://affiliates.walmart.com

### 3. eBay Partner Network
- **Tag**: `EBAY_CAMPAIGN_ID` (env variable)
- **Comisión**: 1-4%
- **Duración cookie**: 24 horas
- **Registro**: https://partnernetwork.ebay.com

### 4. Best Buy Affiliate Program
- **Comisión**: 1-2%
- **Registro**: https://www.bestbuyaffiliates.com
- **Nota**: Usa su red de afiliados (actualmente sin tag personalizado)

### 5. Target Affiliates
- **Comisión**: 1-8%
- **Registro**: https://www.target.com/affiliates
- **Nota**: Usa Impact Radius

## 📊 Sistema de Monetización

El `LinkTransformer` automáticamente:
1. **Limpia** enlaces de otros afiliados
2. **Inyecta** tus tags personalizados
3. **Optimiza** URLs para máximo tracking
4. **Extrae** productos específicos (ASINs, Item IDs)

## 💰 Potencial de Ingresos

Con múltiples tiendas activas:
- **Mayor diversidad** de productos
- **Más oportunidades** de comisión
- **Complementos**: Si Amazon no tiene stock, ofreces alternativas
- **Categorías específicas**: Algunas tiendas pagan más en ciertas categorías

## 🔧 Configuración en .env

```env
# Amazon Associates
AMAZON_TAG=tu_tag_amazon

# Walmart Affiliates  
WALMART_ID=tu_id_walmart

# eBay Partner Network
EBAY_CAMPAIGN_ID=tu_campaign_id_ebay
```

## 📈 Próximos Pasos

1. Registrarte en cada programa de afiliados
2. Obtener tus tags/IDs personalizados
3. Agregarlos al archivo `.env`
4. El sistema automáticamente monetizará todas las tiendas

**Nota**: Puedes empezar solo con Amazon y agregar las demás tiendas gradualmente.
