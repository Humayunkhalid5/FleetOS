const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      mongoose.set('bufferCommands', false);
      return { ok: true, message: 'MongoDB URI not set; using in-memory store' };
    }

<<<<<<< HEAD
    // Fail fast if MongoDB is unreachable (avoids long hangs / slow startup).
    mongoose.set('bufferCommands', false);

    await Promise.race([
      mongoose.connect(uri),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MongoDB connection timed out after 5s')), 5000)
      ),
    ]);
=======
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
>>>>>>> origin/aisha
    return { ok: true, message: 'MongoDB connected', connection: mongoose.connection };
  } catch (error) {
    mongoose.set('bufferCommands', false);
    console.warn(`MongoDB connection failed, falling back to in-memory store: ${error.message}`);
    return { ok: false, error };
  }
};

module.exports = connectDB;


