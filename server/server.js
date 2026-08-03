const app = require('./src/app');
const connectDB = require('./src/config/database');
const { startCloseExpiredVotingSessionsCron } = require('./src/jobs/closeExpiredVotingSessions');
const { startPeriodicAwardsCron } = require('./src/jobs/generatePeriodicAwards');
const { startSeasonRolloverCron } = require('./src/jobs/seasonRolloverJob');
const { startGodKpiSnapshotCron } = require('./src/god/jobs/godKpiSnapshotJob');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);

  // 🕐 Avvia scheduler per chiusura automatica votazioni scadute (ogni 5 min).
  startCloseExpiredVotingSessionsCron();

  // 🏆 Avvia scheduler per generazione Award periodici (monthly + season).
  startPeriodicAwardsCron();

  // 🔄 Avvia scheduler per rollover automatico della stagione (11:00 daily).
  startSeasonRolloverCron();

  // 📊 Avvia scheduler per snapshot KPI di God (hourly + daily).
  startGodKpiSnapshotCron();
});