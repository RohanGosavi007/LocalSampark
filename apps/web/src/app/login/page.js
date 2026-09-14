'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ShieldCheck, User, Bike, Key, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Login.
 *
 * This page used to be a role picker: it listed five portals, called
 * AuthContext.mockLogin() and redirected to the chosen dashboard, under the
 * caption "Authentication is currently bypassed for Staging Mode".
 *
 * mockLogin() returns false without doing anything when NODE_ENV is
 * 'production', which `next build` always sets. So in a production build the
 * page established no session at all, while still redirecting to the protected
 * route — where ProtectedRoute / the dashboard layouts bounced the visitor
 * straight back to /login. The result was an unbreakable redirect loop: nobody,
 * including existing account holders, could sign in to the deployed website.
 *
 * The real authentication already existed in AuthContext (loginEmail, sendOtp,
 * verifyOtp) and was wired up on /register but never here. This page now uses
 * it. The role picker is kept for local development only, where it is genuinely
 * useful, and is compiled out of production builds by the same NODE_ENV check
 * that guards mockLogin itself.
 */

const ROLE_ROUTES = {
  user: '/resident',
  shop_owner: '/shop-dashboard',
  service_provider: '/shop-dashboard',
  delivery_agent: '/delivery-dashboard',
  security_guard: '/gatekeeper',
  super_admin: '/admin-dashboard',
};

const DEV_ROLES = [
  { id: 'user', label: 'Resident / Consumer', icon: User, desc: 'Shop locally & manage society' },
  { id: 'shop_owner', label: 'Shop Owner', icon: Store, desc: 'Manage your local store' },
  { id: 'delivery_agent', label: 'Delivery Partner', icon: Bike, desc: 'Deliver local orders' },
  { id: 'security_guard', label: 'Gatekeeper', icon: Key, desc: 'Society visitor management' },
  { id: 'super_admin', label: 'Franchise Admin', icon: ShieldCheck, desc: 'Super admin dashboard' },
];

const isDev = process.env.NODE_ENV !== 'production';

export default function LoginPage() {
  const router = useRouter();
  const { loginEmail, sendOtp, verifyOtp, mockLogin } = useAuth();

  const [method, setMethod] = useState('phone');
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [selectedRole, setSelectedRole] = useState(null);

  const goToRoleHome = (user) => {
    const role = (user && (user.role || (user.roles && user.roles[0]))) || 'user';
    // Full reload so the guarded destination reads the freshly-written
    // localStorage session instead of racing React state, matching how
    // DevLoginScreen navigates.
    window.location.href = ROLE_ROUTES[role] || '/';
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await sendOtp(phone, 'phone');
      setStep(2);
      setMessage(`OTP sent to ${phone}.${res && res.otp ? ` [DEV: ${res.otp}]` : ''}`);
    } catch (err) {
      setMessage(`${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const data = await verifyOtp(phone, otp);
      if (data && data.registered && data.accessToken) {
        goToRoleHome(data.user);
      } else {
        // The backend recognises the number but has no account for it yet.
        setMessage('No account found for this number. Redirecting you to sign up...');
        setTimeout(() => router.push('/register'), 1200);
      }
    } catch (err) {
      setMessage(`${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const data = await loginEmail(email, password);
      if (data && data.accessToken) {
        goToRoleHome(data.user);
      } else {
        setMessage('Login failed. Please check your credentials.');
      }
    } catch (err) {
      setMessage(`${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);
    if (mockLogin(selectedRole)) {
      window.location.href = ROLE_ROUTES[selectedRole] || '/';
    } else {
      setLoading(false);
      setMessage('Developer sign-in is disabled in this build.');
    }
  };

  const inputClass =
    'w-full bg-background border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-blue-500 transition-colors';
  const buttonClass =
    'w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2';

  const spinner = <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo Area */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-text tracking-tight">LocalSampark</h1>
          <p className="text-text-muted mt-2 font-bold">The Hyper-Local Super App</p>
        </div>

        <div className="bg-card-bg border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>

          <h2 className="text-xl font-bold text-text mb-6">Sign in</h2>

          {/* Method toggle */}
          <div className="flex gap-2 mb-6 bg-background p-1.5 rounded-xl">
            {[
              { id: 'phone', label: 'Phone OTP' },
              { id: 'email', label: 'Email' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setMethod(t.id); setStep(1); setMessage(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  method === t.id ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-text'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {message && (
            <div
              role="status"
              className="mb-5 px-4 py-3 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-300 text-sm font-semibold"
            >
              {message}
            </div>
          )}

          {/* PHONE OTP */}
          {method === 'phone' && step === 1 && (
            <form onSubmit={handleSendOtp}>
              <label htmlFor="phone" className="block text-sm font-bold text-text-muted mb-2">
                Mobile number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                placeholder="+91 XXXXX XXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
              <button type="submit" disabled={loading || !phone} className={`${buttonClass} mt-6`}>
                {loading ? spinner : 'Send OTP'}
              </button>
            </form>
          )}

          {method === 'phone' && step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <label htmlFor="otp" className="block text-sm font-bold text-text-muted mb-2">
                Enter the 6-digit code
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                placeholder="XXXXXX"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={`${inputClass} tracking-[0.5em] text-center text-lg`}
              />
              <button type="submit" disabled={loading || otp.length < 4} className={`${buttonClass} mt-6`}>
                {loading ? spinner : 'Verify & Sign in'}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setMessage(''); }}
                className="w-full mt-3 text-sm font-semibold text-text-muted hover:text-text transition-colors"
              >
                Use a different number
              </button>
            </form>
          )}

          {/* EMAIL + PASSWORD */}
          {method === 'email' && (
            <form onSubmit={handleEmailLogin}>
              <label htmlFor="email" className="block text-sm font-bold text-text-muted mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <label htmlFor="password" className="block text-sm font-bold text-text-muted mb-2 mt-4">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              <button type="submit" disabled={loading || !email || !password} className={`${buttonClass} mt-6`}>
                {loading ? spinner : 'Sign in'}
              </button>
            </form>
          )}

          <div className="flex items-center justify-between mt-6 text-sm">
            <a href="/forgot-password" className="text-text-muted hover:text-text font-semibold transition-colors">
              Forgot password?
            </a>
            <a href="/register" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
              Create an account
            </a>
          </div>
        </div>

        {/*
          Development-only portal switcher. `isDev` is a build-time constant, so
          this whole block is dead-code-eliminated from production bundles —
          the same guard that makes mockLogin() a no-op there.
        */}
        {isDev && (
          <div className="bg-card-bg border border-amber-500/40 rounded-3xl p-6 shadow-2xl mt-6">
            <h2 className="text-sm font-bold text-amber-400 mb-1 uppercase tracking-wider">
              Developer sign-in
            </h2>
            <p className="text-xs text-text-muted mb-4">
              Local builds only. Bypasses authentication entirely.
            </p>
            <form onSubmit={handleDevLogin}>
              <div className="space-y-2 mb-5">
                {DEV_ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border text-left ${
                      selectedRole === role.id
                        ? 'bg-blue-600/10 border-blue-500'
                        : 'bg-background border-border hover:border-primary/40'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        selectedRole === role.id ? 'bg-blue-600 text-white' : 'bg-background-alt text-text-muted'
                      }`}
                    >
                      <role.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-bold ${selectedRole === role.id ? 'text-white' : 'text-text'}`}>
                        {role.label}
                      </h3>
                      <p className="text-xs text-text-muted truncate">{role.desc}</p>
                    </div>
                    {selectedRole === role.id && <ChevronRight size={18} className="text-blue-500" />}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!selectedRole || loading}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
              >
                Enter Portal
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
