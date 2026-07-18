import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useBackendData(endpoint, mockData = []) {
  const { API_URL, authToken } = useAuth();
  const [data, setData] = useState(mockData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}${endpoint}`, { 
          headers: { Authorization: `Bearer ${authToken}` } 
        });
        if(res.ok) {
           const json = await res.json();
           setData(Array.isArray(json) ? json : (json.data || json.rows || mockData));
        }
      } catch (e) {
        console.log(`Failed to fetch ${endpoint}, using mock data fallback`);
      } finally {
        setLoading(false);
      }
    };
    if (API_URL) fetchData();
  }, [API_URL, endpoint, authToken]);

  return { data, loading, setData };
}
