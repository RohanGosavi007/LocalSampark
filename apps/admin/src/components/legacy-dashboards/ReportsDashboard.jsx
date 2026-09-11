import React from 'react';

const ReportsDashboard = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Export Reports</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tally XML Export */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Tally ERP/Prime Integration</h2>
                    <p className="text-sm text-gray-600 mb-4">Export maintenance bill receipts in Tally-compatible XML format.</p>
                    <div className="flex space-x-4">
                        <select className="border border-gray-300 rounded p-2 text-sm">
                            <option>August 2026</option>
                            <option>July 2026</option>
                        </select>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                            Download Tally XML
                        </button>
                    </div>
                </div>

                {/* CSV Export */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Data Export (CSV/Excel)</h2>
                    <p className="text-sm text-gray-600 mb-4">Download society records in Excel format for external processing.</p>
                    <div className="flex flex-col space-y-3">
                        <button className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 w-full text-left">
                            📄 Export Visitor Logs (Last 30 Days)
                        </button>
                        <button className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 w-full text-left">
                            💰 Export Maintenance Bills (Current Month)
                        </button>
                        <button className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 w-full text-left">
                            🚗 Export Parking Registry
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsDashboard;
