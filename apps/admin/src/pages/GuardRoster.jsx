import React, { useState, useEffect } from 'react';

const GuardRoster = () => {
    const [roster, setRoster] = useState([]);

    useEffect(() => {
        // Fetch roster data from API
        setRoster([
            { id: '1', guard_name: 'Rahul Kumar', shift_date: '2026-08-10', shift_type: 'Morning', start_time: '06:00', end_time: '14:00', status: 'Scheduled' },
            { id: '2', guard_name: 'Amit Singh', shift_date: '2026-08-10', shift_type: 'Night', start_time: '22:00', end_time: '06:00', status: 'Scheduled' }
        ]);
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Guard Shift Roster</h1>
            <div className="bg-white shadow rounded-lg p-4">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guard</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timings</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {roster.map(shift => (
                            <tr key={shift.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{shift.guard_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{shift.shift_date}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{shift.shift_type}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{shift.start_time} - {shift.end_time}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        {shift.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GuardRoster;
