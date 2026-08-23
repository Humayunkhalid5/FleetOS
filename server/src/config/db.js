const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

async function connectDB() {
  const configuredUri = String(process.env.MONGODB_URI || '').trim();
  if (process.env.NODE_ENV === 'production' && !configuredUri) {
    throw new Error('MONGODB_URI is required in production. Use the MongoDB Atlas connection string from your deployment environment.');
  }
  const uri = configuredUri || 'mongodb://127.0.0.1:27017/fleetos';
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) throw new Error('MONGODB_URI must be a valid MongoDB connection string');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: process.env.NODE_ENV === 'production' ? 15000 : 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    minPoolSize: process.env.NODE_ENV === 'production' ? 1 : 0,
    retryWrites: true,
  });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}

module.exports = connectDB;
