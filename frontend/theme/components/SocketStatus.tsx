'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import { useAlerts } from '@/theme/components/alerts';
import { connectUserSocket, disconnectSocket } from '@/lib/websocket/client';
import type { Socket } from 'socket.io-client';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SocketStatus() {
  const { user, isAuthenticated, logout } = useAuth();
  const { showError } = useAlerts();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef(false);
  const logoutHandledRef = useRef(false);

  useEffect(() => {
    // Reset logout flag when user changes
    isLoggingOutRef.current = false;
    logoutHandledRef.current = false;

    if (!isAuthenticated || !user?.websocketId) {
      // Clean up if user logs out
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socket) {
        disconnectSocket();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get or create the singleton socket connection
    // connectUserSocket handles the singleton pattern internally
    const newSocket = connectUserSocket(user.websocketId);
    const currentWebsocketId = user.websocketId;

    // If this is the same socket instance, don't re-setup listeners
    if (socket === newSocket && newSocket.connected) {
      setIsConnected(true);
      setIsConnecting(false);
      return;
    }

    // Update state based on socket connection status
    setIsConnecting(!newSocket.connected);
    setIsConnected(newSocket.connected);

    // Set up event listeners
    const handleConnect = () => {
      setIsConnected(true);
      setIsConnecting(false);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsConnecting(false);
      // Socket.IO handles reconnection automatically, but we can add manual retry if needed
      if (!reconnectTimeoutRef.current && !newSocket.active) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          // Check if user is still authenticated before reconnecting
          setSocket((prevSocket) => {
            if (prevSocket?.connected) {
              return prevSocket;
            }
            const reconnectSocket = connectUserSocket(currentWebsocketId);
            return reconnectSocket;
          });
        }, 3000);
      }
    };

    const handleError = (error: Error) => {
      console.error('Socket.IO error:', error);
      setIsConnected(false);
      setIsConnecting(false);
    };

    const handleConnected = (data: any) => {
      if (data.type === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
      }
    };

    const handleLogout = (data: any) => {
      console.log('[SocketStatus] Logout event received:', data);
      if (data.type === 'logout' || data.reason === 'session_terminated') {
        // Prevent multiple logout calls
        if (logoutHandledRef.current || isLoggingOutRef.current) {
          console.log('[SocketStatus] Logout already handled, ignoring');
          return;
        }
        logoutHandledRef.current = true;
        isLoggingOutRef.current = true;

        console.log('[SocketStatus] Processing logout...');

        // Show alert to user that their session has been terminated
        const message = data.message || 'Your session has been terminated by an administrator.';
        showError('Session Terminated', message);

        // Prevent any reconnection attempts
        if (newSocket) {
          newSocket.io.opts.reconnection = false;
          newSocket.removeAllListeners();
        }
        setIsConnected(false);
        setIsConnecting(false);
        
        // Clear tokens immediately BEFORE disconnecting
        if (typeof window !== 'undefined') {
          const { tokenStorage } = require('@/lib/auth/token-storage');
          tokenStorage.clearTokens();
          console.log('[SocketStatus] Tokens cleared');
        }
        
        // Disconnect and prevent reconnection
        disconnectSocket(true);
        
        // Reload the page after a short delay to show the alert
        // This will log the user out and redirect to login
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 2000); // 2 seconds to show the alert
      }
    };

    // Set up event listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleError);
    newSocket.on('connected', handleConnected);
    
    // Set up logout listener with explicit logging
    const logoutListener = (data: any) => {
      console.log('[SocketStatus] Logout event received on socket:', {
        socketId: newSocket.id,
        connected: newSocket.connected,
        data,
      });
      handleLogout(data);
    };
    newSocket.on('logout', logoutListener);
    
    // Also listen for any message events to debug
    newSocket.onAny((eventName, ...args) => {
      if (eventName === 'logout') {
        console.log('[SocketStatus] Received logout via onAny:', args);
      }
    });

    // Check initial connection state
    if (newSocket.connected) {
      setIsConnected(true);
      setIsConnecting(false);
    }

    setSocket(newSocket);

    // Cleanup on unmount - but don't close the connection as it should stay open
    // Only remove event listeners and clear reconnect timeout
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleError);
      newSocket.off('connected', handleConnected);
      // Keep logout listener active - don't remove it so we can receive termination events
      // newSocket.off('logout', logoutListener);
      // Don't disconnect the socket here - it should remain open for the session
    };
  }, [isAuthenticated, user?.websocketId]);

  // Don't render if user is not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
        isConnected
          ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
          : isConnecting
          ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
      )}
      title={
        isConnected
          ? 'WebSocket session connected'
          : isConnecting
          ? 'Connecting to WebSocket...'
          : 'WebSocket session disconnected'
      }
      role="status"
      aria-live="polite"
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">Connecting</span>
        </>
      ) : isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span className="hidden sm:inline">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span className="hidden sm:inline">Disconnected</span>
        </>
      )}
    </div>
  );
}
