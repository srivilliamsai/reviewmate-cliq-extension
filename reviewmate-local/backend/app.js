import express from 'express';
import cors from 'cors';

import githubRouter from './routes/github.js';
import reviewsRouter from './routes/reviews.js';
import authRouter from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ message: 'ReviewMate API is running' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/github', authMiddleware, githubRouter);
  app.use('/api/reviews', authMiddleware, reviewsRouter);

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
};

export default createApp;
