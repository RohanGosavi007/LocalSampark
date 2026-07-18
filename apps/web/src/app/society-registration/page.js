'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function SocietyRegistration() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    region_id: 'R-1',
    subscription_fee: 5000,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/societies/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        alert('Society Created Successfully!');
        router.push('/dashboard');
      } else {
        alert('Failed to create society');
      }
    } catch (err) {
      alert('Error creating society');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Register Society (God-Tier Edition)</h1>
            <p className="text-gray-500 mt-2">Onboard a new society with all 30 features</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Society Name</label>
              <input 
                required
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="e.g., Pride Aashiyana"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
              <textarea 
                required
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Full address of the society"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Monthly Subscription Fee (₹)</label>
              <p className="text-xs text-gray-500 mb-2">Dynamic pricing based on size and features requested.</p>
              <input 
                required
                type="number"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-bold text-blue-700 bg-blue-50"
                value={formData.subscription_fee}
                onChange={e => setFormData({...formData, subscription_fee: Number(e.target.value)})}
              />
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mt-6">
              <h3 className="font-bold text-indigo-900 mb-2">✨ Included in God-Tier Package</h3>
              <ul className="grid grid-cols-2 gap-2 text-sm text-indigo-800">
                <li>✓ AI CCTV Integration</li>
                <li>✓ FaceID Biometrics</li>
                <li>✓ Drone Deliveries</li>
                <li>✓ EV Smart Grids</li>
                <li>✓ Group Buying</li>
                <li>✓ Medical SOS/CPR</li>
              </ul>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg shadow-md transition-all mt-8"
            >
              {isLoading ? 'Registering...' : 'Register Society'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
