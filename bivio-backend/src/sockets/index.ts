import { Server as SocketIOServer } from 'socket.io';
import { events } from '../shared/events';
import { registerChatSocket } from './chatSocket';

/**
 * Single entry point server.ts calls. Registers every socket "area" and
 * wires domain events to their broadcasts — this file (plus chatSocket.ts)
 * is the only place in the codebase that knows Socket.IO exists. Modules
 * like messaging never import socket.io directly; they emit a typed domain
 * event and this file decides what to do with it.
 */
export function registerSockets(io: SocketIOServer): void {
  registerChatSocket(io);

  // The messaging module emits this after persisting a message, regardless
  // of whether it arrived via REST or a socket handler.
  events.on('MessageSent', ({ roomId, message }) => {
    io.to(`room:${roomId}`).emit('message:new', message);
  });
}
