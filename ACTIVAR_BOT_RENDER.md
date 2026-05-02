## INSTRUCCIONES PARA ACTIVAR EL BOT EN RENDER (24/7)

### Paso 1: Detener el bot local
En la terminal donde está corriendo `node index.js`, presiona:
- **Ctrl + C** (para detener el proceso local)

### Paso 2: Activar en Render
1. Ve a: https://dashboard.render.com
2. Inicia sesión con tu cuenta
3. Busca el servicio: **masbarato-deals-net**
4. Verifica el estado:
   - Si dice "Live" (verde) → Ya está corriendo ✅
   - Si dice "Suspended" o "Failed" → Haz clic en "Manual Deploy" o "Resume"

### Paso 3: Verificar los Logs en Render
1. En el dashboard de Render, haz clic en tu servicio
2. Ve a la pestaña "Logs"
3. Deberías ver mensajes como:
   ```
   🚀 Servidor corriendo en puerto 10000
   🔍 Escaneando: TechBargains...
   ✅ VALIDACIÓN ÉXITO: $XX.XX
   📢 POST PUBLICADO: [nombre del producto]
   ```

### Paso 4: Verificar la Web
1. Abre: https://masbarato-deals.onrender.com
2. Refresca la página (F5)
3. Las ofertas deberían aparecer en 1-2 minutos

### ⚠️ IMPORTANTE:
- La base de datos de Render es INDEPENDIENTE de la local
- Solo las ofertas publicadas EN RENDER aparecerán en la web
- El bot local solo sirve para pruebas

### 🔄 Sincronización Automática:
Una vez que el bot esté corriendo en Render:
- Publicará automáticamente cada 15 minutos
- Las ofertas aparecerán en la web Y en Telegram
- No necesitas hacer nada más

### 📊 Monitoreo:
Para verificar que está funcionando:
```bash
# Localmente, verifica tu DB local:
node check_recent.js

# En la web, abre:
https://masbarato-deals.onrender.com/api/deals
```

Si ves un JSON con ofertas, ¡está funcionando! 🎉
