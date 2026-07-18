'use client';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useRouter } from 'next/navigation';
import { API_BASE } from '../../lib/api';
export default function SettingsPage() {
    const { admin, loading } = useAdminAuth();
    const router = useRouter();
    const [theme, setTheme] = useState('lucide');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!loading && (!admin || admin.role !== 'super_admin')) {
            router.push('/');
        } else if (admin) {
            fetchTheme();
        }
    }, [admin, loading, router]);

    const fetchTheme = async () => {
        try {
            const res = await fetch(`${API_BASE}/settings/theme`);
            const data = await res.json();
            if (data.success && data.theme) {
                setTheme(data.theme);
            }
        } catch (err) {
            console.error('Failed to fetch theme:', err);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_BASE}/settings/theme`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ theme })
            });
            const data = await res.json();
            if (data.success) {
                alert('Theme updated successfully! The changes will reflect across all apps.');
            } else {
                alert('Error updating theme: ' + data.message);
            }
        } catch (err) {
            alert('Failed to update theme.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !admin) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">UI Settings</h1>
                        <p className="text-gray-500 mt-1">Configure global platform aesthetics.</p>
                    </div>
                    <button onClick={() => router.push('/')} className="text-indigo-600 hover:text-indigo-800">
                        ← Back to Dashboard
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Global Icon Theme</h2>
                    <p className="text-sm text-gray-500 mb-6">Select the icon library to use across the Web and Mobile applications.</p>
                    
                    <div className="flex gap-6 mb-8">
                        <label className={`flex-1 border rounded-xl p-4 cursor-pointer transition-all ${theme === 'lucide' ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}`}>
                            <input 
                                type="radio" 
                                name="theme" 
                                value="lucide" 
                                checked={theme === 'lucide'} 
                                onChange={(e) => setTheme(e.target.value)}
                                className="sr-only"
                            />
                            <div className="font-bold text-lg text-gray-900 mb-1">Lucide Icons</div>
                            <div className="text-sm text-gray-500">Modern, clean, minimal (Default)</div>
                        </label>

                        <label className={`flex-1 border rounded-xl p-4 cursor-pointer transition-all ${theme === 'phosphor' ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}`}>
                            <input 
                                type="radio" 
                                name="theme" 
                                value="phosphor" 
                                checked={theme === 'phosphor'} 
                                onChange={(e) => setTheme(e.target.value)}
                                className="sr-only"
                            />
                            <div className="font-bold text-lg text-gray-900 mb-1">Phosphor Icons</div>
                            <div className="text-sm text-gray-500">Flexible, professional, scalable</div>
                        </label>
                    </div>

                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
