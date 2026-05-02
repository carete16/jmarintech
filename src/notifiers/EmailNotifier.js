const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
require('dotenv').config();

class EmailNotifier {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail', // O el servicio que prefiera el usuario
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        this.recipient = process.env.EMAIL_RECIPIENT;
    }

    async sendDailyReport(stats) {
        try {
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
                logger.warn('Configuración de Email incompleta. Saltando reporte...');
                return;
            }

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: this.recipient,
                subject: `📊 Reporte Diario Masbarato Deals - ${new Date().toLocaleDateString()}`,
                html: `
                    <h2>Resumen de Operaciones</h2>
                    <p>Hoy ha sido un día productivo para cazar ofertas.</p>
                    <ul>
                        <li><b>Ofertas Publicadas:</b> ${stats.last_24h}</li>
                        <li><b>Ingresos Estimados:</b> $${stats.estimated_revenue} USD</li>
                        <li><b>Total Histórico:</b> ${stats.total_published}</li>
                    </ul>
                    <hr>
                    <p>Consulta el dashboard completo en: <a href="${process.env.BASE_URL || 'https://masbaratoexpress.onrender.com'}">Dashboard Masbarato</a></p>
                `
            };

            await this.transporter.sendMail(mailOptions);
            logger.info('Reporte diario enviado por email.');
        } catch (error) {
            logger.error(`Error enviando email: ${error.message}`);
        }
    }

    async sendAlert(message) {
        try {
            if (!process.env.EMAIL_USER) return;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: this.recipient,
                subject: '🚨 ALERTA CRÍTICA: Masbarato Deals Bot',
                text: message
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            logger.error(`Error enviando alerta: ${error.message}`);
        }
    }
}

module.exports = new EmailNotifier();
