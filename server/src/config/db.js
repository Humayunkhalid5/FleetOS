const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return { ok: true, message: 'MongoDB URI not set; using in-memory store' };
    }

    // Fail fast if MongoDB is unreachable (avoids long hangs / slow startup).
    mongoose.set('bufferCommands', false);

    await Promise.race([
      mongoose.connect(uri),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MongoDB connection timed out after 5s')), 5000)
      ),
    ]);
    return { ok: true, message: 'MongoDB connected', connection: mongoose.connection };
  } catch (error) {
    console.warn(`MongoDB connection failed, falling back to in-memory store: ${error.message}`);
    return { ok: false, error };
  }
};

module.exports = connectDB;

