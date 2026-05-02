FROM ghcr.io/puppeteer/puppeteer:21.5.2

# Variables de entorno para Puppeteer y Producción
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_ENV=production

WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (npm ci es más rápido y limpio)
# Usamos --omit=dev para no instalar cosas innecesarias en prod
RUN npm ci --omit=dev

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando de inicio
CMD [ "node", "index.js" ]
