import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

let socket = null;
let refCount = 0;

export function getSocket() {
  return socket;
}

export function useSocket(token) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    refCount++;

    if (!socket || socket.disconnected) {
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });
    }

    socketRef.current = socket;

    return () => {
      refCount--;
      if (refCount <= 0 && socket) {
        socket.disconnect();
        socket = null;
        refCount = 0;
        socketRef.current = null;
      }
      // Don't null socketRef if socket is still alive —
      // other components' cleanup effects need it to emit leave events
    };
  }, [token]);

  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event, handler) => {
    const s = socketRef.current;
    if (s) {
      s.on(event, handler);
    }
    return () => {
      if (s) {
        s.off(event, handler);
      }
    };
  }, []);

  return { socket: socketRef.current, emit, on };
}
