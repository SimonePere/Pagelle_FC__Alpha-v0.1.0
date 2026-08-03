const cron = require('node-cron');
const GodKpiService = require('../services/GodKpiService');

const service = new GodKpiService();

const startGodKpiSnapshotCron = () => {
    cron.schedule('5 * * * *', async () => {
        try {
            await service.materializeSnapshots('hourly');
            console.log('[god-kpi] hourly snapshot done');
        } catch (err) {
            console.error('[god-kpi] hourly snapshot error:', err.message);
        }
    });

    cron.schedule('10 2 * * *', async () => {
        try {
            await service.materializeSnapshots('daily');
            console.log('[god-kpi] daily snapshot done');
        } catch (err) {
            console.error('[god-kpi] daily snapshot error:', err.message);
        }
    });
};

module.exports = { startGodKpiSnapshotCron };