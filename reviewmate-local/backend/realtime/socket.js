import { Server } from 'socket.io';
import { verifyAuthToken } from '../utils/jwt.js';

let ioInstance;

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*'
    }
  });

  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Auth token required'));
    }

    try {
      const payload = verifyAuthToken(token);
      socket.userId = payload.sub;
      return next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const room = `user:${socket.userId}`;
    socket.join(room);
  });

  return ioInstance;
};

export const emitReviewEvent = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
};
