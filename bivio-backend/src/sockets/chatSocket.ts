import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../shared/prisma';
import { messagingService } from '../modules/messaging/messaging.service';

/**
 * Extracted from server.ts so that file stays pure bootstrap (create the
 * HTTP server, wire the port, wire shutdown) rather than growing every time
 * a new socket concern is added. Each socket "area" gets its own file here
 * (chatSocket.ts today; a future presence.ts or notifications.ts would sit
 * alongside it), and index.ts is the single entry point server.ts calls.
 */
export function registerChatSocket(io: SocketIOServer): void {
  // Auth middleware for the socket handshake — mirrors the HTTP authenticate
  // middleware but for the WebSocket upgrade path.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: string };
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('room:join', async (roomId: string) => {
      // Re-check membership on every join — a client can emit any event with
      // any payload, never trust the room id alone.
      const member = await prisma.chatParticipant.findFirst({
        where: { roomId, userId: socket.data.userId },
      });
      if (!member) return socket.emit('error', { code: 'FORBIDDEN' });
      socket.join(`room:${roomId}`);
    });

    socket.on('message:send', async (payload: { roomId: string; body: string; attachmentUrls?: string[] }) => {
      try {
        // Delegates to the exact same service method the REST fallback uses —
        // persistence, membership, and lock checks never diverge between the
        // two paths. This call persists BEFORE anything is broadcast.
        await messagingService.sendMessage(socket.data.userId, payload.roomId, {
          body: payload.body,
          attachmentUrls: payload.attachmentUrls ?? [],
        });
        // Broadcasting itself happens in the events.on('MessageSent', ...)
        // listener wired in index.ts, triggered by the service call above —
        // so REST-sent messages reach connected sockets too, not just
        // socket-sent ones.
      } catch (err) {
        socket.emit('error', {
          code: 'SEND_FAILED',
          message: err instanceof Error ? err.message : 'Could not send message',
        });
      }
    });
  });
}
