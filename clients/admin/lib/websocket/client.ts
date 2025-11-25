import { io, Socket } from 'socket.io-client';
import { adminTokenStorage } from '@/lib/auth/token-storage';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

if (!WS_URL) {
  throw new Error(
    'NEXT_PUBLIC_WS_URL is not defined. Please add it to your .env.local file.'
  );
}

let socket: Socket | null = null;
let isConnecting = false;

export const connectAdminSocket = (): Socket | null => {
  // Check if admin session is valid
  if (!adminTokenStorage.isAdminSessionValid()) {
    return null;
  }

  const adminUser = adminTokenStorage.getAdminUser();
  if (!adminUser?.id) {
    return null;
  }

  // If we already have a socket, return it
  if (socket && socket.connected) {
    return socket;
  }

  // If we're already connecting, return existing socket
  if (isConnecting && socket) {
    return socket;
  }

  // Ensure WS_URL doesn't have trailing slash
  const baseUrl = WS_URL.replace(/\/$/, '');
  
  // Connect to admin namespace
  const namespaceUrl = `${baseUrl}/admin`;
  
  isConnecting = true;
  
  socket = io(namespaceUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    auth: {
      userId: adminUser.id,
      role: adminUser.role,
    },
  });
  
  socket.on('connect', () => {
    isConnecting = false;
  });
  
  socket.on('connect_error', () => {
    isConnecting = false;
  });

  return socket;
};

export const disconnectAdminSocket = (preventReconnect: boolean = false) => {
  if (socket) {
    if (preventReconnect) {
      socket.io.opts.reconnection = false;
    }
    socket.removeAllListeners();
    try {
      socket.disconnect();
    } catch {
      // Ignore errors during disconnect
    }
    socket = null;
    isConnecting = false;
  }
};

export const getAdminSocket = (): Socket | null => {
  return socket;
};

