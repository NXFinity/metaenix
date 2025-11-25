import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

if (!WS_URL) {
  throw new Error(
    'NEXT_PUBLIC_WS_URL is not defined. Please add it to your .env.local file.'
  );
}

let socket: Socket | null = null;
let currentWebsocketId: string | null = null;
let isConnecting = false;

export const connectUserSocket = (websocketId: string): Socket => {
  // ONE connection per user - strict singleton pattern
  // If we already have a socket for this websocketId, return it
  if (socket && currentWebsocketId === websocketId) {
    // Return existing socket regardless of state - Socket.IO handles reconnection
    return socket;
  }

  // If websocketId changed (different user), disconnect old connection
  if (socket && currentWebsocketId !== websocketId) {
    socket.removeAllListeners();
    try {
      if (socket.connected) {
        socket.disconnect();
      }
    } catch {
      // Ignore errors during cleanup
    }
    socket = null;
    currentWebsocketId = null;
    isConnecting = false;
  }

  // If we're already connecting, wait for the existing connection
  if (isConnecting && socket) {
    return socket;
  }

  // Ensure WS_URL doesn't have trailing slash
  const baseUrl = WS_URL.replace(/\/$/, '');
  
  // Connect to Socket.IO namespace - ONE connection per user using websocketId
  // Backend namespace is 'account' which becomes '/account' in Socket.IO
  const namespaceUrl = `${baseUrl}/account`;
  
  // Mark as connecting to prevent duplicate connections
  isConnecting = true;
  
  // Create the singleton connection - always-on with auto-reconnect
  // This connection authenticates with websocketId and enables other gateways
  socket = io(namespaceUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    query: {
      websocketId,
    },
  });
  
  currentWebsocketId = websocketId;
  
  // Reset connecting flag once connected or if connection fails
  socket.on('connect', () => {
    isConnecting = false;
  });
  
  socket.on('connect_error', () => {
    isConnecting = false;
  });

  return socket;
};

export const connectDeveloperSocket = (websocketId: string): Socket => {
  // Ensure WS_URL doesn't have trailing slash and namespace starts with /
  const baseUrl = WS_URL.replace(/\/$/, '');
  const namespace = '/developer';

  return io(`${baseUrl}${namespace}`, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    query: {
      websocketId,
    },
  });
};

export const disconnectSocket = (preventReconnect: boolean = false) => {
  if (socket) {
    // Disable reconnection if this is a forced logout
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
    currentWebsocketId = null;
    isConnecting = false;
  }
};
