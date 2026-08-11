'use client';
import React, { useState } from 'react';
import {
  Store, Clock, MapPin, Phone, Mail, CreditCard, Gift,
  Truck, Camera, Save, ChevronDown, ChevronUp, ToggleLeft,
  ToggleRight, Info, Edit2, Check, X, Globe, AlertCircle, RefreshCw
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const INITIAL_SETTINGS = {
  shopName: 'Sharma General Store',
  tagline: 'Fresh groceries, delivered to your door',
  description: 'We are a family-run grocery store serving the Dhanori community since 2005. We stock fresh produce, daily essentials, and specialty items.',
  gstNumber: '27AABCS1429B1ZB',
  fssai: 'FSSAI-2021-PUNE-00123',
  logoUrl: '',
  bannerUrl: '',
  phone: '+91 98765 43210',
  whatsapp: '+91 98765 43210',
  email: 'sharma.store@gmail.com',
  website: '',
  hours: {
    Monday:    { open: '08:00', close: '21:00', closed: false },
    Tuesday:   { open: '08:00', close: '21:00', closed: false },
    Wednesday: { open: '08:00', close: '21:00', closed: false },
    Thursday:  { open: '08:00', close: '21:00', closed: false },
    Friday:    { open: '08:00', close: '21:00', closed: false },
    Saturday:  { open: '08:00', close: '22:00', closed: false },
    Sunday:    { open: '10:00', close: '18:00', closed: false },
  },
  holidayMode: false,
  holidayMessage: 'We are closed for a short holiday. Back soon!',
  minOrderValue: 100,
  deliveryRadius: 5,
  deliveryFee: 30,
  freeDeliveryAbove: 500,
  paymentCash: true,
  paymentUPI: true,
  paymentCard: false,
  loyaltyEnabled: true,
  loyaltyPointsPer100: 10,
  loyaltyRedemptionRate: 1,
  paymentFlow: 'instant', // 'instant' or 'approve'
};

function Section({ icon: Icon, title, children, accent = 'var(--primary)' }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '1.25rem' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
            <Icon size={18} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</span>
        </div>
        {open ? <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />}
      </button>
      {open && <div style={{ padding: '0 1.5rem 1.5rem' }}>{children}</div>}
    </div>
  );
}

function Field({ label, help, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>{label}</label>
      {children}
      {help && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{help}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <button onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      {value ? <ToggleRight size={28} style={{ color: 'var(--primary)' }} /> : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />}
      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</span>
    </button>
  );
}

export default function ShopSettingsManager({ token, shopId }) {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing settings
  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/shops/my-shop/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.shop) {
          // Map backend shop fields to our settings state if needed, or parse a settings JSON
          if (data.shop.settings) {
            try {
              const parsed = JSON.parse(data.shop.settings);
              setSettings(s => ({ ...s, ...parsed }));
            } catch (e) {
              console.error('Failed to parse shop settings', e);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token, shopId]);

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));
  const setHour = (day, field, val) => setSettings(s => ({ ...s, hours: { ...s.hours, [day]: { ...s.hours[day], [field]: val } } }));
  const copyHoursToAll = (day) => {
    const src = settings.hours[day];
    const newHours = {};
    DAYS.forEach(d => { newHours[d] = { ...src }; });
    setSettings(s => ({ ...s, hours: newHours }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/shops/my-shop/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ settings: JSON.stringify(settings) })
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        alert('Failed to save settings');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving settings');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '12px' }}>Loading Settings...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 840 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>⚙️ Shop Profile & Settings</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Configure all your shop details, hours, delivery rules, and payment options</p>
        </div>
        <button onClick={handleSave} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
          background: saved ? 'var(--success)' : 'var(--primary)', color: 'white', border: 'none',
          borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', transition: 'background 0.3s'
        }}>
          {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save All Changes</>}
        </button>
      </div>

      {/* 1. Basic Info */}
      <Section icon={Store} title="Basic Information" accent="#6366f1">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Shop Name *">
              <TextInput value={settings.shopName} onChange={v => set('shopName', v)} placeholder="Your Shop Name" />
            </Field>
          </div>
          <Field label="Tagline">
            <TextInput value={settings.tagline} onChange={v => set('tagline', v)} placeholder="One-line description" />
          </Field>
          <Field label="GST Number">
            <TextInput value={settings.gstNumber} onChange={v => set('gstNumber', v)} placeholder="GSTIN" />
          </Field>
          <Field label="FSSAI License (if food)">
            <TextInput value={settings.fssai} onChange={v => set('fssai', v)} placeholder="FSSAI License No." />
          </Field>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Description">
              <textarea value={settings.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Tell customers about your shop..."
                style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </Field>
          </div>
        </div>
      </Section>

      {/* 2. Media */}
      <Section icon={Camera} title="Logo & Banner" accent="#8b5cf6">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Shop Logo URL" help="Recommended: 200×200px, PNG/JPG">
            <TextInput value={settings.logoUrl} onChange={v => set('logoUrl', v)} placeholder="https://..." />
          </Field>
          <Field label="Shop Banner URL" help="Recommended: 1200×400px, JPG">
            <TextInput value={settings.bannerUrl} onChange={v => set('bannerUrl', v)} placeholder="https://..." />
          </Field>
        </div>
      </Section>

      {/* 3. Contact */}
      <Section icon={Phone} title="Contact Details" accent="#0ea5e9">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Phone Number"><TextInput value={settings.phone} onChange={v => set('phone', v)} placeholder="+91 XXXXX XXXXX" /></Field>
          <Field label="WhatsApp Business Number"><TextInput value={settings.whatsapp} onChange={v => set('whatsapp', v)} placeholder="+91 XXXXX XXXXX" /></Field>
          <Field label="Email Address"><TextInput value={settings.email} onChange={v => set('email', v)} placeholder="shop@example.com" /></Field>
          <Field label="Website (optional)"><TextInput value={settings.website} onChange={v => set('website', v)} placeholder="https://yourshop.com" /></Field>
        </div>
      </Section>

      {/* 4. Business Hours */}
      <Section icon={Clock} title="Business Hours" accent="#f59e0b">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: settings.holidayMode ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.05)', borderRadius: '0.75rem', border: `1px solid ${settings.holidayMode ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.2)'}` }}>
          <Toggle value={settings.holidayMode} onChange={v => set('holidayMode', v)} label="Holiday / Closed Mode" />
          {settings.holidayMode && (
            <input value={settings.holidayMessage} onChange={e => set('holidayMessage', e.target.value)}
              style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--background)', fontSize: '0.8rem' }}
              placeholder="Holiday message for customers..." />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {DAYS.map(day => (
            <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 0.875rem', background: 'var(--background)', borderRadius: '0.625rem', border: '1px solid var(--border)' }}>
              <span style={{ width: 90, fontWeight: 600, fontSize: '0.875rem', flexShrink: 0 }}>{day}</span>
              <Toggle value={!settings.hours[day].closed} onChange={v => setHour(day, 'closed', !v)} label="" />
              {!settings.hours[day].closed ? (
                <>
                  <input type="time" value={settings.hours[day].open} onChange={e => setHour(day, 'open', e.target.value)}
                    style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem', background: 'var(--surface)', fontSize: '0.875rem' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>to</span>
                  <input type="time" value={settings.hours[day].close} onChange={e => setHour(day, 'close', e.target.value)}
                    style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem', background: 'var(--surface)', fontSize: '0.875rem' }} />
                  <button onClick={() => copyHoursToAll(day)} style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Copy to all →
                  </button>
                </>
              ) : (
                <span style={{ color: 'var(--error)', fontSize: '0.8rem', fontWeight: 600 }}>CLOSED</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* 5. Delivery */}
      <Section icon={Truck} title="Delivery Settings" accent="#10b981">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Minimum Order Value (₹)" help="Orders below this won't be accepted">
            <TextInput type="number" value={settings.minOrderValue} onChange={v => set('minOrderValue', Number(v))} />
          </Field>
          <Field label="Delivery Radius (km)" help="Maximum distance you deliver to">
            <TextInput type="number" value={settings.deliveryRadius} onChange={v => set('deliveryRadius', Number(v))} />
          </Field>
          <Field label="Delivery Fee (₹)">
            <TextInput type="number" value={settings.deliveryFee} onChange={v => set('deliveryFee', Number(v))} />
          </Field>
          <Field label="Free Delivery Above (₹)" help="Set 0 to disable free delivery">
            <TextInput type="number" value={settings.freeDeliveryAbove} onChange={v => set('freeDeliveryAbove', Number(v))} />
          </Field>
        </div>
      </Section>

      {/* 6. Payments */}
      <Section icon={CreditCard} title="Payment Methods & Flow" accent="#f97316">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <Field label="Payment Flow" help="How and when customers pay">
            <select 
              value={settings.paymentFlow || 'instant'} 
              onChange={e => set('paymentFlow', e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="instant">Instant Capture (Customer pays at checkout)</option>
              <option value="approve">Approve -&gt; Pay (Shop accepts order, then customer pays)</option>
            </select>
          </Field>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <Toggle value={settings.paymentCash} onChange={v => set('paymentCash', v)} label="Accept Cash on Delivery" />
          <Toggle value={settings.paymentUPI} onChange={v => set('paymentUPI', v)} label="Accept UPI Payments (GPay, PhonePe, Paytm)" />
          <Toggle value={settings.paymentCard} onChange={v => set('paymentCard', v)} label="Accept Card Payments (POS Terminal required)" />
        </div>
      </Section>

      {/* 7. Loyalty Program */}
      <Section icon={Gift} title="Loyalty Program" accent="#ec4899">
        <div style={{ marginBottom: '1rem' }}>
          <Toggle value={settings.loyaltyEnabled} onChange={v => set('loyaltyEnabled', v)} label="Enable Loyalty Points for Customers" />
        </div>
        {settings.loyaltyEnabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Points Earned per ₹100 spent" help="e.g., 10 points per ₹100">
              <TextInput type="number" value={settings.loyaltyPointsPer100} onChange={v => set('loyaltyPointsPer100', Number(v))} />
            </Field>
            <Field label="Points to Rupee Rate" help="e.g., 1 point = ₹1 off">
              <TextInput type="number" value={settings.loyaltyRedemptionRate} onChange={v => set('loyaltyRedemptionRate', Number(v))} />
            </Field>
          </div>
        )}
      </Section>
    </div>
  );
}
