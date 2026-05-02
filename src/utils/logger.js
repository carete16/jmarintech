const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

// Parche para evitar el crash por EIO (Error de Entrada/Salida en Mac/OneDrive)
const originalLog = logger.log;
logger.log = function(...args) {
    try {
        return originalLog.apply(this, args);
    } catch (e) {
        if (e.code !== 'EIO') console.error("Logger Error:", e);
    }
};

module.exports = logger;
