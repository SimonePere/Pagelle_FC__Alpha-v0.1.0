const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Debug delle variabili d'ambiente
    const nodeEnv = process.env.NODE_ENV?.trim(); // Rimuovo spazi extra
    console.log(`🔍 NODE_ENV: "${nodeEnv}"`);

    // Seleziona il database corretto basato sull'ambiente
    const mongoUri = nodeEnv === 'test'
      ? process.env.MONGODB_URI_TEST
      : process.env.MONGODB_URI;

    console.log(`🔗 Selected URI contains: ${mongoUri?.includes('test') ? 'TEST' : 'PROD'} database`);

    // Configurazione ottimizzata per connessioni multiple
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,                    // Massimo 10 connessioni contemporanee  
      serverSelectionTimeoutMS: 5000,    // Timeout selezione server
      socketTimeoutMS: 45000,             // Timeout socket
      // bufferMaxEntries e bufferCommands sono stati deprecati in Mongoose 6+
    });

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    console.log(`🎯 Database: ${conn.connection.name}`);

    // Event listeners per debugging
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;