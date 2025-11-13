import 'dotenv/config';
import http from 'http';

import { connectDatabase } from './config/database.js';
import createApp from './app.js';
import { initSocket } from './realtime/socket.js';
import { scheduleDailyDigest } from './services/email.js';
import { PORT } from './utils/env.js';

const app = createApp();
const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectDatabase();
    initSocket(server);
    scheduleDailyDigest();
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
