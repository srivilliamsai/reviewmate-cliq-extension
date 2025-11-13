import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/reviewmate';

export const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || DEFAULT_URI;

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

export default mongoose;
