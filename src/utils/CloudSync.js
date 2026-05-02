const axios = require('axios');
const logger = require('./logger');

/**
 * CloudSync: Envía productos automáticamente a la nube (Render)
 */
class CloudSync {
    static async syncOne(deal) {
        const RENDER_URL = 'https://jmarintech.onrender.com';
        const ADMIN_PASSWORD = process.env.ADMIN_SECRET || 'Masbarato2026';

        if (!deal || deal.status !== 'published') return;

        try {
            logger.info(`☁️  Sincronizando automáticamente con la nube: ${deal.title}`);
            
            const payload = {
                deals: [deal]
            };

            await axios.post(`${RENDER_URL}/api/admin/sync`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': ADMIN_PASSWORD
                },
                timeout: 10000 
            });

            logger.info(`✅ Sincronización exitosa para ID: ${deal.id}`);
        } catch (error) {
            logger.error(`❌ Falló la sincronización con la nube para ${deal.id}: ${error.message}`);
        }
    }
}

module.exports = CloudSync;
