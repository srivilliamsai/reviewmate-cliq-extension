import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.setTimeout(30000);

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.GITHUB_TOKEN_SECRET = process.env.GITHUB_TOKEN_SECRET || 'test-github-secret';

let mongoServer;
let useMemoryServer = false;

const connectMongoose = async (uri) =>
  mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    useMemoryServer = true;
    const uri = mongoServer.getUri();
    await connectMongoose(uri);
  } catch (error) {
    console.warn('mongodb-memory-server unavailable, falling back to local Mongo instance:', error.message);
    const fallbackUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/reviewmate_test';
    await connectMongoose(fallbackUri);
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  if (useMemoryServer && mongoServer) {
    await mongoServer.stop();
  }
});
