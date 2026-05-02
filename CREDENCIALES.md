# 🔑 Credenciales y Accesos - MasbaratoDeals

## 🔐 Acceso Administrador
- **URL Login:** `https://masbaratodeals.onrender.com/admin`
- **Contraseña Maestra:** `Masbarato2026`

## 📊 Analytics
- **ID de Medición:** `G-3BYYXE88GW`
- **Panel:** [Google Analytics](https://analytics.google.com)

## 🛠️ Herramientas de Control
### 1. Poblar la Web (Seeding)
Si la web se ve vacía, puedes ejecutar este comando (o pedírmelo) para inyectar ofertas premium:
```bash
curl -X POST https://masbaratodeals.onrender.com/api/seed -H "x-admin-password: Masbarato2026"
```

### 2. SEO
- **Mapa del Sitio:** `https://masbaratodeals.onrender.com/sitemap.xml`
- **Robots:** `https://masbaratodeals.onrender.com/robots.txt`

## 🤖 Bot Telegram
- **Canal:** `@Masbarato_deals`
- **Fuentes Activas:** 
  - Slickdeals (General)
  - TechBargains (Tecnología)
  - BensBargains (Hogar)
- **Frecuencia:** Cada 5 minutos revisa todas las fuentes.

## ⚠️ Solución de Problemas
- **Error "no column named score":** Significa que Render está actualizando la base de datos.
  - **Solución:** Espera 5 minutos y vuelve a probar el comando de Seeding. El sistema se auto-repara al reiniciar.
- **Web vacía:** Usa el comando de Seeding de arriba.

---
*Este documento contiene información sensible. No lo compartas.*
