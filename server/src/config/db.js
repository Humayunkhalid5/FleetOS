const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      mongoose.set('bufferCommands', false);
      return { ok: true, message: 'MongoDB URI not set; using in-memory store' };
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    return { ok: true, message: 'MongoDB connected', connection: mongoose.connection };
  } catch (error) {
    mongoose.set('bufferCommands', false);
    console.warn(`MongoDB connection failed, falling back to in-memory store: ${error.message}`);
    return { ok: false, error };
  }
};

module.exports = connectDB;


