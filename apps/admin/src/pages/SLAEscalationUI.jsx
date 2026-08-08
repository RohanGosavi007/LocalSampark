import React, { useState } from 'react';

const SLAEscalationUI = () => {
    const [escalations] = useState([
        { id: '1', complaint: 'Lift 2 not working', level: 2, status: 'Escalated to Facility Manager', timeInState: '4 hours' },
        { id: '2', complaint: 'Water Leakage in Basement', level: 3, status: 'Escalated to Chairman', timeInState: '12 hours' }
    ]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4 text-red-600">SLA & Escalation Monitor</h1>
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Complaint</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Level</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Breach Duration</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {escalations.map(esc => (
                            <tr key={esc.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{esc.complaint}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded text-white text-xs font-bold ${esc.level === 3 ? 'bg-red-600' : 'bg-orange-500'}`}>
                                        Level {esc.level}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{esc.status}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{esc.timeInState}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button className="text-blue-600 hover:text-blue-900 font-semibold">Intervene</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SLAEscalationUI;
