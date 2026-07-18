'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { API_URL } from '@/lib/api';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Determine backend URL
    const backendUrl = API_URL.replace('/api/v1', '');

    // Only attempt socket connection after verifying backend is reachable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    fetch(`${backendUrl}/health`, { signal: controller.signal })
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Backend not healthy');

        const newSocket = io(backendUrl, {
          withCredentials: true,
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          timeout: 5000,
        });

        newSocket.on('connect', () => {
          setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
          setIsConnected(false);
        });

        newSocket.on('connect_error', () => {
          // Silently handle connection errors
        });

        setSocket(newSocket);

        return () => {
          newSocket.disconnect();
        };
      })
      .catch(() => {
        clearTimeout(timeoutId);
        // Backend is not reachable — skip socket connection silently
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // Helper method to join a specific shop room (for KDS/Managers)
  const joinShopRoom = useCallback((shopId) => {
    if (socket && isConnected) {
      socket.emit('shop:join', shopId);
    }
  }, [socket, isConnected]);

  // Helper method to join an order tracking room (for Customers)
  const joinOrderRoom = useCallback((orderId) => {
    if (socket && isConnected) {
      socket.emit('order:track', orderId);
    }
  }, [socket, isConnected]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinShopRoom, joinOrderRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

