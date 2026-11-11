import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    socket = io(socketUrl, {
      autoConnect: false,
      auth: {
        token,
      },
    });
  } else if (token) {
    socket.auth = { token };
  }
  return socket;
};
