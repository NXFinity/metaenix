import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

if (!WS_URL) {
  throw new Error(
    'NEXT_PUBLIC_WS_URL is not defined. Please add it to your .env.local file.'
  );
}

let socket: Socket | null = null;

export const connectUserSocket = (websocketId: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(`${WS_URL}/account`, {
    withCredentials: true,
    query: {
      websocketId,
    },
  });

  return socket;
};

export const connectDeveloperSocket = (websocketId: string): Socket => {
  return io(`${WS_URL}/developer`, {
    query: {
      websocketId,
    },
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
