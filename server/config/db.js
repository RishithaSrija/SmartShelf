const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI || mongoURI === 'your_mongodb_connection_string') {
    console.warn('[MongoDB] MONGO_URI is not set or contains default placeholder. Database features will be disabled until configured.');
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    console.warn('[MongoDB] Server is running without active database connection.');
    return false;
  }
};

module.exports = connectDB;
