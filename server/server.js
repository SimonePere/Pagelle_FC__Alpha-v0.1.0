const app = require('./src/app');
const connectDB = require('./src/config/database');
const { startCloseExpiredVotingSessionsCron } = require('./src/jobs/closeExpiredVotingSessions');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);

  // 🕐 Avvia scheduler per chiusura automatica votazioni scadute (ogni 5 min).
  //    Single-instance su Render → niente lock distribuiti.
  startCloseExpiredVotingSessionsCron();
});