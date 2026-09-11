import React, { useState } from 'react';

const SocietyDashboard = () => {
    const [isSocietyEnabled, setIsSocietyEnabled] = useState(true);

    const toggleModule = () => {
        setIsSocietyEnabled(!isSocietyEnabled);
        // API Call to update tenant settings (Phase 12.5)
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Society Admin Portal</h1>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-600">Enable Society Module</span>
                    <button 
                        onClick={toggleModule}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${isSocietyEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isSocietyEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
            </div>

            {isSocietyEnabled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <DashboardCard title="Active Visitors" value="42" color="blue" />
                    <DashboardCard title="Pending Complaints" value="12" color="red" />
                    <DashboardCard title="Maintenance Collected" value="₹4,50,000" color="green" />
                    <DashboardCard title="Guard Attendance" value="95%" color="purple" />
                </div>
            ) : (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                    <p className="font-bold">Module Disabled</p>
                    <p>The Society Management module is currently disabled for this tenant.</p>
                </div>
            )}
        </div>
    );
};

const DashboardCard = ({ title, value, color }) => (
    <div className={`bg-white rounded-lg shadow p-6 border-t-4 border-${color}-500`}>
        <h3 className="text-gray-500 text-sm font-medium uppercase">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
    </div>
);

export default SocietyDashboard;
