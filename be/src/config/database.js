const mongoose = require('mongoose');

/**
 * Establishes a connection to MongoDB using the URI defined in the environment.
 */
const connectDatabase = async () => {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Please configure it in your environment.');
  }

  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
    });

    const { host, name } = mongoose.connection;
    console.log(`MongoDB connected: ${host}/${name}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDatabase;
