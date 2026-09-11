import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { authToken, API_URL, user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Three hard-coded notifications used to stand in whenever the request
   * failed, and one of the conditions for "failed" was the response lacking a
   * `success` flag — which GET /notifications never sent, because it returned
   * the database driver's raw result object. So the fallback was not an edge
   * case: it was what every user saw on every launch.
   *
   * Two of the three were claims a user would act on. "Order Delivered — Your
   * grocery order has been delivered successfully" tells someone a parcel has
   * arrived when it has not, and "Water supply will be affected tomorrow from
   * 10 AM to 2 PM" is a civic notice a household would fill buckets for. The
   * third advertised 50% off a salon booking no shop had offered.
   *
   * A signed-out or failing app now shows an empty tray, which is true.
   */
  const fetchNotifications = async () => {
    if (!authToken) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!res.ok) throw new Error(`Notifications unavailable (${res.status})`);

      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data?.data ?? []);
      setNotifications(rows);
      updateUnreadCount(rows);
      setError(null);
    } catch (err) {
      setNotifications([]);
      setUnreadCount(0);
      setError(err?.message || 'Could not load notifications.');
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
      error,
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
