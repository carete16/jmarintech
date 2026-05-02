# 🚀 JMARIN TECH - PROYECTO NUEVO

Este es el proyecto **JMARIN TECH** con todas las mejoras implementadas el 3 de febrero de 2026.

## ✨ Características Principales

### 🎨 **Diseño Mobile-First Premium**
- Interfaz ultra-fluida optimizada para celulares
- Navegación de categorías estilo Instagram (scroll horizontal)
- Diseño glassmorphism y micro-animaciones

### 📱 **Club VIP Multicanal**
- Captura de leads con 4 campos:
  - ✅ Nombre completo
  - ✅ WhatsApp (con selector de código de país)
  - ✅ Email
  - ✅ Telegram (@usuario)

### ⚖️ **Sistema de Pesaje Automático Inteligente**
- Estimación automática de peso según tipo de producto
- Motor de IA basado en palabras clave
- Ejemplos:
  - Laptop → 5.5 lbs
  - Reloj → 1.2 lbs
  - Tenis → 3.5 lbs
  - Audífonos → 1.5 lbs

### 💰 **Calculadora Logística Transparente**
- Precio Base + Ganancia 30% + Tax USA 7% + Envío
- Visualización clara del costo por libra
- Peso final cobrado (Real + 1lb extra)
- Precio final en COP con redondeo hacia arriba

### 🛡️ **Panel Administrativo Express**
- Gestión de ofertas pendientes y publicadas
- Edición en tiempo real de precios y pesos
- Aprobación y publicación instantánea
- Marcado de productos agotados

## 🔧 Configuración

### Variables de Entorno (.env)
```
PORT=10000
TELEGRAM_BOT_TOKEN=8508697731:AAFpdB7H_xnzjCXNcBFWeOsZZMz0sKUQhBg
TELEGRAM_CHANNEL_ID=8394417948
ADMIN_PASSWORD=MasbaratoSecure2026
EMAIL_USER=masbaratodealss@gmail.com
EMAIL_PASS=fqtjomtrwfoyhtto
AMAZON_TAG=masbaratodeal-20
FACEBOOK_ACCESS_TOKEN=...
FACEBOOK_PAGE_ID=492167307323603
INSTAGRAM_USER_ID=17841401348574123
```

### Instalación
```bash
npm install
```

### Desarrollo Local
```bash
node index.js
```
Abre: http://localhost:10000

### Panel Admin
http://localhost:10000/admin-express
Password: `MasbaratoSecure2026`

## 🚀 Despliegue en Render

1. Crear nuevo Web Service en Render
2. Conectar este repositorio
3. Configurar:
   - Build Command: `./render-build.sh`
   - Start Command: `node index.js`
4. Agregar todas las variables de entorno
5. Deploy!

## 📁 Estructura del Proyecto

```
MasbaratoExpress/
├── public/
│   ├── index.html          # Página principal (Mobile-First)
│   ├── admin_express.html  # Panel administrativo
│   └── express.html        # Vista alternativa
├── src/
│   ├── core/              # Procesadores y bots
│   ├── database/          # SQLite DB
│   ├── notifiers/         # Email, Telegram
│   └── utils/             # Helpers y transformadores
├── index.js               # Servidor Express
├── render.yaml            # Config Render
└── .env                   # Variables de entorno
```

## 🎯 Diferencias con Masbarato Deals

| Característica | Masbarato Deals | JMARIN TECH |
|---------------|-----------------|-------------------|
| Enfoque | Agregador de ofertas USA | Importaciones Colombia |
| Precios | USD | COP (Todo Incluido) |
| Formulario VIP | Email básico | Multicanal (4 campos) |
| Diseño | Desktop-first | Mobile-first |
| Peso productos | Manual | Automático (IA) |
| Panel Admin | Básico | Express (avanzado) |

---

**Fecha de creación**: 3 de febrero de 2026
**Versión**: 2.5
**Estado**: ✅ Listo para producción
