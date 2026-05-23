import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server | null = null;

export function createWs(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });
  return io;
}

export function getWs(): Server {
  if (!io) throw new Error('WebSocket server not initialized');
  return io;
}
