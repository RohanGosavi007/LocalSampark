'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
    const [iconTheme, setIconTheme] = useState('lucide');

    useEffect(() => {
        fetch(`${API_URL}/api/v1/settings/theme`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.success && data.theme) {
                    setIconTheme(data.theme);
                }
            })
            .catch(() => {
                // Backend unavailable — silently use default 'lucide' theme
            });
    }, []);

    return (
        <ConfigContext.Provider value={{ iconTheme, setIconTheme }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    return useContext(ConfigContext);
}

