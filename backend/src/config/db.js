const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { });
    console.log('MongoDB connected');
  } catch (e) {
    console.error('MongoDB connection error:', e.message);
    process.exit(1);
  }
};
