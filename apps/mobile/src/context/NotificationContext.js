import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { authToken, API_URL, user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Mock initial notifications
  const MOCK_NOTIFICATIONS = [
    { id: '1', title: 'Order Delivered', message: 'Your grocery order has been delivered successfully.', type: 'order', isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: '2', title: 'Community Alert', message: 'Water supply will be affected tomorrow from 10 AM to 2 PM.', type: 'community', isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: '3', title: 'Special Offer', message: 'Get 50% off on your next salon booking!', type: 'promotion', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  ];

  const fetchNotifications = async () => {
    if (!authToken) {
      // Keep mock data if not logged in to show UI
      setNotifications(MOCK_NOTIFICATIONS);
      updateUnreadCount(MOCK_NOTIFICATIONS);
      setIsLoading(false);
      return;
    }
    
    try {
      // Try to fetch from API
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.data);
          updateUnreadCount(data.data);
          return;
        }
      }
      
      // Fallback to mock data if API fails or endpoint doesn't exist
      throw new Error('API failed, using mock data');
    } catch (err) {
      console.log('Using mock notifications fallback');
      setNotifications(MOCK_NOTIFICATIONS);
      updateUnreadCount(MOCK_NOTIFICATIONS);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUnreadCount = (notifs) => {
    const count = notifs.filter(n => !n.isRead).length;
    setUnreadCount(count);
  };

  useEffect(() => {
    fetchNotifications();
    
    if (authToken && user) {
      // Poll every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [authToken, user, API_URL]);

  const markAsRead = async (id) => {
    // Optimistic UI update
    const updatedNotifs = notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    setNotifications(updatedNotifs);
    updateUnreadCount(updatedNotifs);

    if (!authToken) return;
    
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (err) {
      console.warn('Failed to mark notification as read on server', err);
    }
  };

  const markAllRead = async () => {
    const updatedNotifs = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updatedNotifs);
    setUnreadCount(0);

    if (!authToken) return;

    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (err) {
      console.warn('Failed to mark all notifications as read on server', err);
    }
  };

  const refreshNotifications = () => {
    setIsLoading(true);
    fetchNotifications();
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllRead,
      refreshNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
