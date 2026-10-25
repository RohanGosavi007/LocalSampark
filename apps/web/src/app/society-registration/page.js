'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { apiPost } from '../../lib/api';

/**
 * Register a housing society, as its first administrator.
 *
 * This posted to /api/v1/societies/admin/create — a relative URL, so the
 * request went to the website rather than the API — without a session, to a
 * route only platform staff may use. It also let the person registering type
 * their own subscription fee, and listed "God-Tier" features (drone
 * deliveries, FaceID, EV smart grids) the platform does not have.
 *
 * It now calls POST /society/register, which creates the society and makes the
 * signed-in user its administrator.
 */
export default function SocietyRegistration() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({ name: '', address: '', flatNumber: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!user) {
      router.push('/login?next=/society-registration');
      return;
    }
    setIsLoading(true);
    try {
      await apiPost('/society/register', {
        name: formData.name.trim(),
        address: formData.address.trim(),
        flatNumber: formData.flatNumber.trim() || undefined,
      });
      router.push('/society-admin');
    } catch (err) {
      setError(err.message || 'The society could not be registered.');
      setIsLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Register Your Society</h1>
            <p className="text-text-muted mt-2">You will be the society&apos;s first administrator and can invite residents and staff.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Society Name</label>
              <input required type="text" className={inputClass} placeholder="e.g., Pride Aashiyana"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
              <textarea required rows="3" className={inputClass} placeholder="Full address of the society"
                value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Your Flat Number (optional)</label>
              <input type="text" className={inputClass} placeholder="e.g., B-404"
                value={formData.flatNumber} onChange={e => setFormData({ ...formData, flatNumber: e.target.value })} />
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <h3 className="font-bold text-indigo-900 mb-2">What your society gets</h3>
              <ul className="grid grid-cols-2 gap-2 text-sm text-indigo-800">
                <li>✓ Visitor pre-approval &amp; gate log</li>
                <li>✓ Notices &amp; broadcasts</li>
                <li>✓ Maintenance billing</li>
                <li>✓ Complaints &amp; helpdesk</li>
                <li>✓ Resident directory</li>
                <li>✓ Group buying</li>
              </ul>
            </div>

            {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
            {!user && <p className="text-sm text-gray-600">You will be asked to sign in first.</p>}

            <button type="submit" disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-lg shadow-md transition-all mt-8">
              {isLoading ? 'Registering...' : 'Register Society'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
