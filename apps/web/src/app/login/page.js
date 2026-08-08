'use client';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function LoginPage() {
  const { sendOtp, verifyOtp, loginEmail, registerEmail, error: authError } = useAuth();
  
  const [method, setMethod] = useState('firebase'); // firebase, phone, whatsapp, email, register
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = input credentials, 2 = verify OTP, 3 = register profile
  const [isNewUser, setIsNewUser] = useState(false);
  
  // Profile state for new users
  const [fullName, setFullName] = useState('');
  const [regionId, setRegionId] = useState('');
  
  // Email auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;

    let formattedPhone = phoneNumber.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      // If it's just 10 digits, add +91. If it already starts with 91, add +.
      if (formattedPhone.length === 10) {
        formattedPhone = '+91' + formattedPhone;
      } else if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
        formattedPhone = '+' + formattedPhone;
      } else {
        formattedPhone = '+91' + formattedPhone; // default fallback
      }
      setPhoneNumber(formattedPhone);
    }

    setLoading(true);
    setMessage('');
    try {
      const data = await sendOtp(formattedPhone, method);
      setStep(2);
      setMessage(`🔐 Verification code sent successfully! ${data.otp ? `[DEV: ${data.otp}]` : ''}`);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    setMessage('');
    try {
      const data = await verifyOtp(phoneNumber, otp, fullName, regionId, method);
      if (!data.registered) {
        setIsNewUser(true);
        setStep(3);
        setMessage('📝 Please complete your profile to register.');
      } else {
        setMessage('✅ Login successful! Redirecting...');
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await loginEmail(email, password);
      setMessage('✅ Login successful! Redirecting...');
      window.location.href = '/dashboard';
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await registerEmail(email, password, fullName, regionId);
      setMessage('✅ Registration successful! Please check console for email verification link.');
      setMethod('email');
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Quick dev login helper
  const handleQuickLogin = async (role) => {
    if (role === 'visitor') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
      return;
    }

    setLoading(true);
    try {
      const rolePhones = {
        'user': '+919000000001',
        'resident_member': '+919000000002',
        'society_admin': '+919000000003',
        'security_guard': '+919000000004',
        'shop_owner': '+919000000005',
        'service_provider': '+919000000006',
        'delivery_agent': '+919000000007',
        'field_agent': '+919000000008',
        'area_agent': '+919000000009',
        'territory_admin': '+919000000010',
        'moderator': '+919000000011',
        'super_admin': '+919000000012'
      };

      const phone = rolePhones[role] || '+919000000001';

      // Send & verify automatically for dev speed
      const sendRes = await sendOtp(phone, 'phone');
      const devOtp = sendRes.otp || '123456';
      await verifyOtp(phone, devOtp, '', '', 'phone');
      
      let redirectUrl = '/dashboard';
      if (role === 'super_admin' || role === 'admin') redirectUrl = '/admin-dashboard';
      else if (role === 'territory_admin') redirectUrl = '/franchise-dashboard';
      else if (role === 'area_agent' || role === 'field_agent') redirectUrl = '/field-dashboard';
      else if (role === 'shop_owner') redirectUrl = '/shop-dashboard';
      else if (role === 'delivery_agent') redirectUrl = '/delivery-dashboard';
      else if (role === 'service_provider') redirectUrl = '/service-dashboard';
      else if (role === 'society_admin') redirectUrl = '/society-admin-dashboard';
      else if (role === 'security_guard') redirectUrl = '/security-dashboard';
      else if (role === 'moderator') redirectUrl = '/moderator-dashboard';

      window.location.href = redirectUrl;
    } catch (err) {
      setMessage(`❌ Dev Preset Login Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' }}>
        <div className="glass-card card-3d" style={{ width: '100%', maxWidth: '520px', padding: '2.5rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem' }}>🏘️</span>
            <h1 style={{ fontSize: '1.75rem', marginTop: '1rem', fontWeight: 700 }}>Welcome to LocalSampark</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Neighborhood Doorstep Super-App</p>
          </div>

          {message && (
            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', marginBottom: '1.5rem', fontSize: '0.88rem', fontWeight: 600 }}>
              {message}
            </div>
          )}

          {/* Tab Selection */}
          {step === 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--background)', padding: '0.35rem', borderRadius: '0.5rem' }}>
              {['firebase', 'phone', 'whatsapp', 'email'].map((t) => (
                <button
                  key={t}
                  onClick={() => setMethod(t)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.35rem',
                    border: 'none',
                    background: (method === t || (t === 'email' && method === 'register')) ? 'var(--primary)' : 'transparent',
                    color: (method === t || (t === 'email' && method === 'register')) ? 'white' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    cursor: 'pointer'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Firebase Recaptcha Container */}
          <div id="recaptcha-container"></div>

          {/* Form Step 1: Input Details */}
          {step === 1 && (method === 'firebase' || method === 'phone' || method === 'whatsapp') && (
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder="+91 XXXXX XXXXX" 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                {loading ? 'Sending...' : `Send OTP via ${method === 'whatsapp' ? 'WhatsApp' : method === 'firebase' ? 'Firebase' : 'SMS'}`}
              </button>
            </form>
          )}

          {step === 1 && method === 'email' && (
            <form onSubmit={handleEmailLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@email.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                {loading ? 'Logging in...' : 'Verify & Login'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
                <button type="button" onClick={() => setMethod('register')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Sign up
                </button>
              </div>
            </form>
          )}

          {step === 1 && method === 'register' && (
            <form onSubmit={handleEmailRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ramesh Shinde" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@email.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                {loading ? 'Creating Account...' : 'Register Profile'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
                <button type="button" onClick={() => setMethod('email')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Log in
                </button>
              </div>
            </form>
          )}

          {/* Form Step 2: OTP Entry */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label className="form-label">Enter 6-Digit OTP</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="XXXXXX" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.75rem' }}>
                Back
              </button>
            </form>
          )}

          {/* Form Step 3: Register Details for New Users */}
          {step === 3 && (
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Your Name" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Select Neighborhood Territory *</label>
                <select 
                  className="form-input" 
                  value={regionId} 
                  onChange={(e) => setRegionId(e.target.value)}
                  required
                >
                  <option value="">Select your local area</option>
                  <option value="dhanori-pune">Dhanori, Pune (411015)</option>
                  <option value="viman-nagar">Viman Nagar, Pune (411014)</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                {loading ? 'Saving Profile...' : 'Complete Profile Setup'}
              </button>
            </form>
          )}

          {/* Quick Presets for Development Testing */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textAlign: 'center' }}>
              ⚡ QUICK DEVELOPER PRESET LOGINS
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Resident & Community:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginTop: '0.25rem' }}>
                  <button onClick={() => handleQuickLogin('visitor')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Visitor (Guest)</button>
                  <button onClick={() => handleQuickLogin('user')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Resident</button>
                  <button onClick={() => handleQuickLogin('resident_member')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Society Res.</button>
                  <button onClick={() => handleQuickLogin('society_admin')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Society Admin</button>
                  <button onClick={() => handleQuickLogin('security_guard')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Security Guard</button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Business & Providers:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: '0.4rem', marginTop: '0.25rem' }}>
                  <button onClick={() => handleQuickLogin('shop_owner')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Shop Owner</button>
                  <button onClick={() => handleQuickLogin('service_provider')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Gig Worker</button>
                  <button onClick={() => handleQuickLogin('delivery_agent')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Rider</button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Admin & Franchise:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginTop: '0.25rem' }}>
                  <button onClick={() => handleQuickLogin('field_agent')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Field Agent</button>
                  <button onClick={() => handleQuickLogin('area_agent')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Area Agent</button>
                  <button onClick={() => handleQuickLogin('territory_admin')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Franchise</button>
                  <button onClick={() => handleQuickLogin('moderator')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem' }}>Moderator</button>
                  <button onClick={() => handleQuickLogin('super_admin')} className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.68rem', gridColumn: 'span 2' }}>Super Admin</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
