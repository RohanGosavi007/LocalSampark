'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

import { API_URL } from '@/lib/api';
const API = `${API_URL}/api/v1/society-management`;

// ─── API Helper ─────────────────────────────────────────────
async function api(path, options = {}) {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  return res.json();
}

// ─── Inline Styles ──────────────────────────────────────────
const styles = {
  page: { minHeight: '100vh', padding: '2rem 0' },
  header: { textAlign: 'center', marginBottom: '2rem' },
  roleBar: { display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  roleBtn: (active) => ({
    padding: '0.6rem 1.5rem', borderRadius: '50px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.85rem',
    background: active ? 'linear-gradient(135deg, var(--primary), #818cf8)' : 'var(--card-bg)', color: active ? '#fff' : 'var(--text)',
    boxShadow: active ? '0 8px 28px -6px rgba(99,102,241,0.55)' : '0 2px 8px rgba(0,0,0,0.05)',
    border: active ? 'none' : '1px solid var(--card-border)', transition: 'var(--transition)'
  }),
  tabs: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '0.5rem', borderRadius: 'var(--radius)', background: 'var(--card-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--card-border)' },
  tab: (active) => ({
    padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem',
    background: active ? 'var(--primary)' : 'transparent', color: active ? '#fff' : 'var(--text-muted)', transition: 'var(--transition)', whiteSpace: 'nowrap'
  }),
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '0.75rem 1rem', background: 'var(--card-bg)', fontSize: '0.88rem' },
  tdFirst: { borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)' },
  tdLast: { borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' },
  statusBadge: (status) => {
    const colors = { pending: '#f59e0b', approved: '#10b981', declined: '#ef4444', checked_in: '#6366f1', checked_out: '#64748b', open: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981', closed: '#64748b', paid: '#10b981', overdue: '#ef4444', received: '#f59e0b', collected: '#10b981', active: '#ef4444', confirmed: '#10b981', cancelled: '#64748b', going: '#10b981', maybe: '#f59e0b', not_going: '#ef4444', present: '#10b981', absent: '#ef4444', partial: '#f59e0b' };
    const c = colors[status] || '#64748b';
    return { display: 'inline-block', padding: '0.2rem 0.7rem', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 700, background: `${c}18`, color: c, textTransform: 'capitalize' };
  },
  modal: { position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' },
  modalContent: { background: 'var(--background-alt)', borderRadius: 'var(--radius)', padding: '2.5rem', maxWidth: '550px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', border: '1px solid var(--card-border)' },
  webcam: { width: '100%', maxWidth: '320px', borderRadius: 'var(--radius-sm)', background: '#000', aspectRatio: '4/3' },
  photo: { width: '120px', height: '90px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '2px solid var(--card-border)' },
  emergencyBtn: { width: '100%', padding: '2rem', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', fontSize: '1.5rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 12px 40px -8px rgba(239,68,68,0.6)', transition: 'var(--transition)', fontFamily: 'var(--font-heading)' },
  emergencyOverlay: { position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(220,38,38,0.95)', animation: 'pulse 0.5s ease-in-out infinite alternate' },
  doorbellOverlay: { position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.95)', backdropFilter: 'blur(12px)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  pollBar: (pct, color) => ({ width: `${pct}%`, height: '28px', borderRadius: '14px', background: `linear-gradient(135deg, ${color}, ${color}cc)`, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)', display: 'flex', alignItems: 'center', paddingLeft: '10px', color: '#fff', fontSize: '0.75rem', fontWeight: 700, minWidth: pct > 5 ? 'auto' : '0' }),
  calCard: (type) => {
    const colors = { festival: '#f59e0b', meeting: '#6366f1', sports: '#10b981', cultural: '#ec4899', maintenance: '#f97316', general: '#64748b' };
    return { borderLeft: `4px solid ${colors[type] || '#64748b'}` };
  },
  noticeCard: (priority) => {
    const colors = { normal: 'var(--primary)', important: '#f59e0b', urgent: '#ef4444' };
    return { borderLeft: `4px solid ${colors[priority] || 'var(--primary)'}` };
  },
  select: { width: '100%', padding: '0.85rem 1.1rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', background: 'var(--background-alt)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.95rem', cursor: 'pointer' },
  toggle: (on) => ({ width: '44px', height: '24px', borderRadius: '12px', background: on ? 'var(--primary)' : 'var(--border)', cursor: 'pointer', position: 'relative', border: 'none', transition: 'var(--transition)' }),
  toggleDot: (on) => ({ position: 'absolute', top: '2px', left: on ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'var(--transition)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' })
};

// ─── WebcamCapture Component ────────────────────────────────
function WebcamCapture({ label, onCapture }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) { alert('Camera access denied. Please enable camera permissions.'); }
  };

  const capture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 480;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0, 640, 480);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setCaptured(dataUrl);
    onCapture(dataUrl);
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const retake = () => { setCaptured(null); onCapture(''); startCamera(); };

  useEffect(() => { return () => { if (stream) stream.getTracks().forEach(t => t.stop()); }; }, [stream]);

  return (
    <div style={{ flex: 1 }}>
      <label className="form-label">{label}</label>
      {captured ? (
        <div>
          <img src={captured} alt="Captured" style={styles.webcam} />
          <button className="btn btn-secondary" style={{ marginTop: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={retake}>📸 Retake</button>
        </div>
      ) : stream ? (
        <div>
          <video ref={videoRef} autoPlay playsInline muted style={styles.webcam} />
          <button className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={capture}>📸 Capture</button>
        </div>
      ) : (
        <button className="btn btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }} onClick={startCamera}>📷 Open Camera</button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function SocietyPage() {
  const { user } = useAuth();
  const [societyRole, setSocietyRole] = useState('resident');
  const [activeTab, setActiveTab] = useState('visitors');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Doorbell / Emergency / Reminder Modals ─────────────
  const [doorbellData, setDoorbellData] = useState(null);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [reminderAlarm, setReminderAlarm] = useState(null);

  // ─── Visitor State ────────────────────────────────────────
  const [visitorForm, setVisitorForm] = useState({ visitorName: '', visitorPhone: '', purpose: 'guest', flatNumber: '', vehicleNumber: '', notes: '' });
  const [visitorPhoto, setVisitorPhoto] = useState('');
  const [idCardPhoto, setIdCardPhoto] = useState('');
  const [visitors, setVisitors] = useState([]);
  const [visitorAnalytics, setVisitorAnalytics] = useState(null);

  // ─── Members State ────────────────────────────────────────
  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ phone: '', flatNumber: '', role: 'resident' });
  const [editMemberId, setEditMemberId] = useState(null);
  const [editMemberForm, setEditMemberForm] = useState({});

  // ─── Guard Messages & Reminders ───────────────────────────
  const [guardMessages, setGuardMessages] = useState([]);
  const [guardMsgText, setGuardMsgText] = useState('');
  const [reminders, setReminders] = useState([]);
  const [reminderForm, setReminderForm] = useState({ title: '', description: '', reminderTime: '', priority: 'normal' });

  // ─── Staff ────────────────────────────────────────────────
  const [staff, setStaff] = useState([]);
  const [staffForm, setStaffForm] = useState({ staffName: '', staffPhone: '', staffType: 'maid', assignedFlats: '' });
  const [todayAttendance, setTodayAttendance] = useState({ attendance: [], allStaff: [] });

  // ─── Bills ────────────────────────────────────────────────
  const [bills, setBills] = useState([]);
  const [billForm, setBillForm] = useState({ month: '', baseAmount: '', waterCharges: '0', parkingCharges: '0', otherCharges: '0', dueDate: '' });
  const [billSummary, setBillSummary] = useState(null);

  // ─── Parking ──────────────────────────────────────────────
  const [parkingSlots, setParkingSlots] = useState([]);
  const [parkingForm, setParkingForm] = useState({ slotNumber: '', slotType: 'car', flatNumber: '', vehicleNumber: '' });

  // ─── Amenities ────────────────────────────────────────────
  const [amenities, setAmenities] = useState([]);
  const [amenityForm, setAmenityForm] = useState({ name: '', description: '', capacity: '', hourlyRate: '0', rules: '' });
  const [bookingForm, setBookingForm] = useState({ bookingDate: '', startTime: '', endTime: '', purpose: '' });
  const [myBookings, setMyBookings] = useState([]);

  // ─── Complaints ───────────────────────────────────────────
  const [complaints, setComplaints] = useState([]);
  const [complaintForm, setComplaintForm] = useState({ category: 'plumbing', title: '', description: '', priority: 'medium' });

  // ─── Packages ─────────────────────────────────────────────
  const [packages, setPackages] = useState([]);
  const [packageForm, setPackageForm] = useState({ flatNumber: '', courierName: '', packageDescription: '' });

  // ─── Polls ────────────────────────────────────────────────
  const [polls, setPolls] = useState([]);
  const [pollForm, setPollForm] = useState({ title: '', description: '', options: ['', ''], pollType: 'single', endsAt: '' });
  const [pollResults, setPollResults] = useState({});

  // ─── Emergency ────────────────────────────────────────────
  const [emergencies, setEmergencies] = useState([]);
  const [emergencyForm, setEmergencyForm] = useState({ alertType: 'fire', description: '' });

  // ─── Directory ────────────────────────────────────────────
  const [directory, setDirectory] = useState([]);
  const [dirSearch, setDirSearch] = useState('');

  // ─── Events ───────────────────────────────────────────────
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({ title: '', description: '', eventDate: '', startTime: '', endTime: '', venue: '', eventType: 'general', maxAttendees: '' });

  // ─── Notices ──────────────────────────────────────────────
  const [notices, setNotices] = useState([]);
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', priority: 'normal' });

  // ─── Settings ─────────────────────────────────────────────
  const [settings, setSettings] = useState({});

  // ─── Analytics Dashboard ──────────────────────────────────
  const [dashboardData, setDashboardData] = useState(null);

  // ─── AGM & Budget ─────────────────────────────────────────
  const [agmData, setAgmData] = useState([]);
  const [budgetList, setBudgetList] = useState([]);

  // ─── Forum & Shifts ───────────────────────────────────────
  const [forumTopics, setForumTopics] = useState([]);
  const [shiftsList, setShiftsList] = useState([]);

  // ─── Ratings, Intercom & Audits ───────────────────────────
  const [auditsList, setAuditsList] = useState([]);
  const [ratingsList, setRatingsList] = useState([]);
  const [intercomLogs, setIntercomLogs] = useState([]);

  // ─── Document Templates ───────────────────────────────────
  const [templatesList, setTemplatesList] = useState([
    { id: 'noc-bank', name: 'Bank Loan NOC', description: 'No Objection Certificate for Bank Home Loan', type: 'financial' },
    { id: 'noc-passport', name: 'Passport Address Proof NOC', description: 'Address verification for passport renewal', type: 'identity' },
    { id: 'noc-tenant', name: 'Tenant Move-In Agreement NOC', description: 'Mandatory NOC for new tenants', type: 'residential' },
    { id: 'noc-renovation', name: 'Flat Renovation Permission', description: 'Permission for internal flat renovation', type: 'maintenance' }
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // ─── Flash message ────────────────────────────────────────
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  // ─── Tab definitions per role ─────────────────────────────
  const tabsByRole = {
    admin: [
      { id: 'dashboard', icon: '📊', label: 'Dashboard' },
      { id: 'visitors', icon: '👥', label: 'Visitors' }, { id: 'members', icon: '🏠', label: 'Members' },
      { id: 'staff', icon: '🧹', label: 'Staff' }, { id: 'bills', icon: '💰', label: 'Bills' },
      { id: 'parking', icon: '🅿️', label: 'Parking' }, { id: 'amenities', icon: '🏊', label: 'Amenities' },
      { id: 'complaints', icon: '📋', label: 'Complaints' }, { id: 'packages', icon: '📦', label: 'Packages' },
      { id: 'polls', icon: '🗳️', label: 'Polls' }, { id: 'emergency', icon: '🚨', label: 'Emergency' },
      { id: 'directory', icon: '📞', label: 'Directory' }, { id: 'events', icon: '📅', label: 'Events' },
      { id: 'notices', icon: '📝', label: 'Notices' }, 
      { id: 'forum', icon: '🗣️', label: 'Forum' }, { id: 'shifts', icon: '⏰', label: 'Shifts' },
      { id: 'ratings', icon: '⭐', label: 'Ratings' }, { id: 'intercom', icon: '📞', label: 'Intercom' },
      { id: 'agm', icon: '🏛️', label: 'AGM' }, { id: 'budget', icon: '📈', label: 'Budget' },
      { id: 'audits', icon: '🧯', label: 'Audits' }, { id: 'templates', icon: '📄', label: 'Templates' },
      { id: 'settings', icon: '⚙️', label: 'Settings' }
    ],
    guard: [
      { id: 'visitors', icon: '👥', label: 'Visitors' }, { id: 'staff', icon: '🧹', label: 'Staff' },
      { id: 'packages', icon: '📦', label: 'Packages' }, { id: 'parking', icon: '🅿️', label: 'Parking' },
      { id: 'messages', icon: '💬', label: 'Messages' }, { id: 'reminders', icon: '⏰', label: 'Reminders' },
      { id: 'shifts', icon: '⏰', label: 'Shifts' }, { id: 'intercom', icon: '📞', label: 'Intercom' },
      { id: 'emergency', icon: '🚨', label: 'Emergency' }, { id: 'directory', icon: '📞', label: 'Directory' },
      { id: 'notices', icon: '📝', label: 'Notices' }
    ],
    resident: [
      { id: 'visitors', icon: '🔔', label: 'My Visitors' }, { id: 'bills', icon: '💰', label: 'Bills' },
      { id: 'complaints', icon: '📋', label: 'Complaints' }, { id: 'amenities', icon: '🏊', label: 'Amenities' },
      { id: 'packages', icon: '📦', label: 'Packages' }, { id: 'parking', icon: '🅿️', label: 'Parking' },
      { id: 'polls', icon: '🗳️', label: 'Polls' }, { id: 'staff', icon: '🧹', label: 'Staff' },
      { id: 'messages', icon: '💬', label: 'Guard Msg' }, { id: 'reminders', icon: '⏰', label: 'Reminders' },
      { id: 'forum', icon: '🗣️', label: 'Forum' }, { id: 'ratings', icon: '⭐', label: 'Ratings' },
      { id: 'intercom', icon: '📞', label: 'Intercom' }, { id: 'agm', icon: '🏛️', label: 'AGM' },
      { id: 'templates', icon: '📄', label: 'Docs' },
      { id: 'emergency', icon: '🚨', label: 'Emergency' }, { id: 'directory', icon: '📞', label: 'Directory' },
      { id: 'events', icon: '📅', label: 'Events' }, { id: 'notices', icon: '📝', label: 'Notices' }
    ]
  };

  // ─── Data Loaders ─────────────────────────────────────────
  const load = useCallback(async (tab) => {
    setLoading(true);
    try {
      if (tab === 'visitors') {
        if (societyRole === 'guard') { const r = await api('/visitors/today'); setVisitors(r.data || []); }
        else if (societyRole === 'resident') { const r = await api('/my-visitors'); setVisitors(r.data || []); }
        else { const r = await api('/visitors/all'); setVisitors(r.data || []); const a = await api('/visitors/analytics'); setVisitorAnalytics(a.data || null); }
      } else if (tab === 'members') { const r = await api('/members'); setMembers(r.data || []); }
      else if (tab === 'messages') {
        if (societyRole === 'guard') { const r = await api('/guard-messages'); setGuardMessages(r.data || []); }
      }
      else if (tab === 'reminders') {
        if (societyRole === 'guard') { const r = await api('/guard-reminders'); setReminders(r.data || []); }
      }
      else if (tab === 'staff') {
        const r = await api('/staff'); setStaff(r.data || []);
        if (societyRole === 'guard' || societyRole === 'admin') { const a = await api('/staff/attendance/today'); setTodayAttendance(a.data || { attendance: [], allStaff: [] }); }
      }
      else if (tab === 'bills') {
        if (societyRole === 'admin') { const r = await api('/bills'); setBills(r.data || []); const s = await api('/bills/summary'); setBillSummary(s.data || null); }
        else { const r = await api('/my-bills'); setBills(r.data || []); }
      }
      else if (tab === 'parking') { const r = await api(societyRole === 'resident' ? '/my-parking' : '/parking'); setParkingSlots(r.data || []); }
      else if (tab === 'amenities') { const r = await api('/amenities'); setAmenities(r.data || []); if (societyRole === 'resident') { const b = await api('/my-bookings'); setMyBookings(b.data || []); } }
      else if (tab === 'complaints') {
        if (societyRole === 'admin') { const r = await api('/complaints/all'); setComplaints(r.data || []); }
        else { const r = await api('/my-complaints'); setComplaints(r.data || []); }
      }
      else if (tab === 'packages') {
        if (societyRole === 'guard' || societyRole === 'admin') { const r = await api('/packages/pending'); setPackages(r.data || []); }
        else { const r = await api('/my-packages'); setPackages(r.data || []); }
      }
      else if (tab === 'polls') { const r = await api('/polls'); setPolls(r.data || []); }
      else if (tab === 'emergency') { const r = await api('/emergency/active'); setEmergencies(r.data || []); }
      else if (tab === 'directory') { const r = await api(`/directory${dirSearch ? `?search=${dirSearch}` : ''}`); setDirectory(r.data || []); }
      else if (tab === 'events') { const r = await api('/events'); setEvents(r.data || []); }
      else if (tab === 'notices') { 
        const r = await fetch(`${API_URL}/api/v1/society/notices`, { headers: { 'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}` }}); 
        const d = await r.json(); 
        setNotices(d.data || []); 
      }
      else if (tab === 'settings') { const r = await api('/settings'); setSettings(r.data || {}); }
      else if (tab === 'dashboard' && societyRole === 'admin') {
        const r = await api('/society-analytics/dashboard');
        if (r.success) setDashboardData(r.data);
      }
      else if (tab === 'agm') {
        const r = await api('/society-compliance/agm');
        if (r.success) setAgmData(r.data || []);
      }
      else if (tab === 'budget') {
        const r = await api('/society-compliance/budget');
        if (r.success) setBudgetList(r.data || []);
      }
      else if (tab === 'forum') {
        const r = await api('/society-forum/topic');
        if (r.success) setForumTopics(r.data || []);
      }
      else if (tab === 'shifts') {
        const r = await api('/society-shifts/roster');
        if (r.success) setShiftsList(r.data || []);
      }
      else if (tab === 'audits') {
        const r = await api('/society-compliance/audit');
        if (r.success) setAuditsList(r.data || []);
      }
    } catch (e) {
      // Load error handled silently
    }
    setLoading(false);
  }, [societyRole, dirSearch]);

  useEffect(() => { load(activeTab); }, [activeTab, load]);

  // Reset tab when role changes
  useEffect(() => {
    const tabs = tabsByRole[societyRole];
    if (tabs.length > 0) setActiveTab(tabs[0].id);
  }, [societyRole]);

  // ═══════════════════════════════════════════════════════════
  // RENDER SECTIONS
  // ═══════════════════════════════════════════════════════════

  // ─── VISITORS TAB ─────────────────────────────────────────
  const renderVisitors = () => {
    if (societyRole === 'guard') return (
      <div>
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '1.5rem' }}>📝 Log New Visitor</h3>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Visitor Name *</label><input className="form-input" value={visitorForm.visitorName} onChange={e => setVisitorForm({...visitorForm, visitorName: e.target.value})} placeholder="Full name" /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={visitorForm.visitorPhone} onChange={e => setVisitorForm({...visitorForm, visitorPhone: e.target.value})} placeholder="+91..." /></div>
            <div className="form-group"><label className="form-label">Purpose</label>
              <select style={styles.select} value={visitorForm.purpose} onChange={e => setVisitorForm({...visitorForm, purpose: e.target.value})}>
                <option value="guest">Guest Visit</option><option value="delivery">Delivery</option><option value="plumber">Plumber</option><option value="electrician">Electrician</option><option value="cab">Cab / Taxi</option><option value="other">Other</option>
              </select></div>
            <div className="form-group"><label className="form-label">Flat Number *</label><input className="form-input" value={visitorForm.flatNumber} onChange={e => setVisitorForm({...visitorForm, flatNumber: e.target.value})} placeholder="e.g. A-401" /></div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <WebcamCapture label="📸 Visitor Photo" onCapture={setVisitorPhoto} />
            <WebcamCapture label="🪪 ID Card Photo" onCapture={setIdCardPhoto} />
          </div>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Vehicle Number</label><input className="form-input" value={visitorForm.vehicleNumber} onChange={e => setVisitorForm({...visitorForm, vehicleNumber: e.target.value})} placeholder="MH 12 AB 1234" /></div>
            <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={visitorForm.notes} onChange={e => setVisitorForm({...visitorForm, notes: e.target.value})} placeholder="Additional notes" /></div>
          </div>
          <button className="btn btn-primary" onClick={async () => {
            const r = await api('/visitors', { method: 'POST', body: { ...visitorForm, visitorPhoto, idCardPhoto } });
            if (r.success) { flash('🔔 Doorbell sent to resident!'); setVisitorForm({ visitorName: '', visitorPhone: '', purpose: 'guest', flatNumber: '', vehicleNumber: '', notes: '' }); setVisitorPhoto(''); setIdCardPhoto(''); load('visitors'); }
            else flash('❌ ' + (r.error || 'Error'));
          }}>🔔 Send Entry Request to Flat Owner</button>
        </div>
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '1rem' }}>📋 Today's Visitor Log</h3>
          {renderVisitorTable()}
        </div>
      </div>
    );

    if (societyRole === 'resident') return (
      <div className="glass-card">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '1rem' }}>🔔 My Visitors</h3>
        {visitors.filter(v => v.status === 'pending').length > 0 && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
            <strong>⚠️ {visitors.filter(v => v.status === 'pending').length} pending visitor(s) awaiting your response</strong>
          </div>
        )}
        {renderVisitorTable()}
      </div>
    );

    // Admin
    return (
      <div>
        {visitorAnalytics && (
          <div style={styles.statsGrid}>
            {[
              { label: 'Today Total', value: visitorAnalytics.today, icon: '👥' },
              { label: 'Approved', value: visitorAnalytics.approved, icon: '✅' },
              { label: 'Declined', value: visitorAnalytics.declined, icon: '❌' },
              { label: 'Pending', value: visitorAnalytics.pending, icon: '⏳' }
            ].map((s, i) => (
              <div key={i} className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{s.icon}</div>
                <div className="stat-chip-value">{s.value || 0}</div>
                <div className="stat-chip-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}
        <div className="glass-card">{renderVisitorTable()}</div>
      </div>
    );
  };

  const renderVisitorTable = () => (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead><tr><th style={styles.th}>Visitor</th><th style={styles.th}>Flat</th><th style={styles.th}>Purpose</th><th style={styles.th}>Status</th><th style={styles.th}>Time</th><th style={styles.th}>Photos</th><th style={styles.th}>Actions</th></tr></thead>
        <tbody>
          {visitors.map(v => (
            <tr key={v.id}>
              <td style={{...styles.td, ...styles.tdFirst}}><strong>{v.visitor_name}</strong><br/><span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{v.visitor_phone}</span></td>
              <td style={styles.td}>{v.flat_number}</td>
              <td style={styles.td}><span style={{textTransform:'capitalize'}}>{v.purpose}</span></td>
              <td style={styles.td}><span style={styles.statusBadge(v.status)}>{v.status?.replace('_',' ')}</span></td>
              <td style={styles.td}><span style={{fontSize:'0.78rem'}}>{v.created_at ? new Date(v.created_at).toLocaleTimeString() : ''}</span></td>
              <td style={styles.td}>
                <div style={{display:'flex',gap:'0.5rem'}}>
                  {v.visitor_photo_url && <img src={v.visitor_photo_url} alt="" style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover'}} />}
                  {v.id_card_photo_url && <img src={v.id_card_photo_url} alt="" style={{width:'40px',height:'30px',borderRadius:'4px',objectFit:'cover'}} />}
                </div>
              </td>
              <td style={{...styles.td, ...styles.tdLast}}>
                <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                  {societyRole === 'resident' && v.status === 'pending' && <>
                    <button className="btn btn-primary" style={{padding:'0.3rem 0.8rem',fontSize:'0.75rem'}} onClick={async()=>{await api(`/visitors/${v.id}/approve`,{method:'PUT'});flash('✅ Approved');load('visitors');}}>✅ Allow</button>
                    <button className="btn btn-danger" style={{padding:'0.3rem 0.8rem',fontSize:'0.75rem'}} onClick={async()=>{await api(`/visitors/${v.id}/decline`,{method:'PUT'});flash('❌ Declined');load('visitors');}}>❌ Decline</button>
                  </>}
                  {societyRole === 'guard' && v.status === 'approved' && <button className="btn btn-primary" style={{padding:'0.3rem 0.8rem',fontSize:'0.75rem'}} onClick={async()=>{await api(`/visitors/${v.id}/check-in`,{method:'PUT'});flash('Checked in');load('visitors');}}>🚶 Check In</button>}
                  {societyRole === 'guard' && v.status === 'checked_in' && <button className="btn btn-secondary" style={{padding:'0.3rem 0.8rem',fontSize:'0.75rem'}} onClick={async()=>{await api(`/visitors/${v.id}/check-out`,{method:'PUT'});flash('Checked out');load('visitors');}}>🚪 Check Out</button>}
                </div>
              </td>
            </tr>
          ))}
          {visitors.length === 0 && <tr><td style={{...styles.td,...styles.tdFirst,...styles.tdLast,textAlign:'center'}} colSpan={7}>No visitors found</td></tr>}
        </tbody>
      </table>
    </div>
  );

  // ─── MEMBERS TAB ──────────────────────────────────────────
  const renderMembers = () => (
    <div>
      <div className="glass-card" style={{marginBottom:'2rem'}}>
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>➕ Add Society Member</h3>
        <div style={styles.formRow}>
          <div className="form-group"><label className="form-label">Phone (LocalSampark User)</label><input className="form-input" value={memberForm.phone} onChange={e=>setMemberForm({...memberForm,phone:e.target.value})} placeholder="+919999999999" /></div>
          <div className="form-group"><label className="form-label">Flat Number</label><input className="form-input" value={memberForm.flatNumber} onChange={e=>setMemberForm({...memberForm,flatNumber:e.target.value})} placeholder="A-401" /></div>
          <div className="form-group"><label className="form-label">Role</label>
            <select style={styles.select} value={memberForm.role} onChange={e=>setMemberForm({...memberForm,role:e.target.value})}>
              <option value="resident">Resident</option><option value="guard">Security Guard</option><option value="admin">Admin</option>
            </select></div>
        </div>
        <button className="btn btn-primary" onClick={async()=>{
          const r = await api('/members',{method:'POST',body:memberForm});
          if(r.success){flash('✅ Member added');setMemberForm({phone:'',flatNumber:'',role:'resident'});load('members');}
          else flash('❌ '+(r.error||'Error'));
        }}>Add Member</button>
      </div>
      <div className="glass-card">
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>👥 Society Members ({members.length})</h3>
        <div style={{overflowX:'auto'}}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>Phone</th><th style={styles.th}>Flat</th><th style={styles.th}>Role</th><th style={styles.th}>Status</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>{members.map(m=>(
              <tr key={m.id}>
                <td style={{...styles.td,...styles.tdFirst}}>{m.full_name}</td>
                <td style={styles.td}>{m.phone_number}</td>
                <td style={styles.td}>{editMemberId===m.id?<input className="form-input" style={{padding:'0.3rem',width:'80px'}} value={editMemberForm.flatNumber||''} onChange={e=>setEditMemberForm({...editMemberForm,flatNumber:e.target.value})}/>:m.flat_number}</td>
                <td style={styles.td}>{editMemberId===m.id?<select style={{...styles.select,padding:'0.3rem',width:'100px'}} value={editMemberForm.role||''} onChange={e=>setEditMemberForm({...editMemberForm,role:e.target.value})}><option value="resident">Resident</option><option value="guard">Guard</option><option value="admin">Admin</option></select>:<span className="badge badge-primary" style={{textTransform:'capitalize'}}>{m.role}</span>}</td>
                <td style={styles.td}><span style={styles.statusBadge(m.is_active?'approved':'declined')}>{m.is_active?'Active':'Inactive'}</span></td>
                <td style={{...styles.td,...styles.tdLast}}>
                  {editMemberId===m.id?<div style={{display:'flex',gap:'0.3rem'}}><button className="btn btn-primary" style={{padding:'0.25rem 0.6rem',fontSize:'0.72rem'}} onClick={async()=>{await api(`/members/${m.id}`,{method:'PUT',body:editMemberForm});flash('Updated');setEditMemberId(null);load('members');}}>Save</button><button className="btn btn-secondary" style={{padding:'0.25rem 0.6rem',fontSize:'0.72rem'}} onClick={()=>setEditMemberId(null)}>Cancel</button></div>:
                  <div style={{display:'flex',gap:'0.3rem'}}><button className="btn btn-secondary" style={{padding:'0.25rem 0.6rem',fontSize:'0.72rem'}} onClick={()=>{setEditMemberId(m.id);setEditMemberForm({flatNumber:m.flat_number,role:m.role});}}>✏️</button><button className="btn btn-danger" style={{padding:'0.25rem 0.6rem',fontSize:'0.72rem'}} onClick={async()=>{if(confirm('Remove member?')){await api(`/members/${m.id}`,{method:'DELETE'});flash('Removed');load('members');}}}>🗑️</button></div>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─── GUARD MESSAGES TAB ───────────────────────────────────
  const renderMessages = () => (
    <div>
      {(societyRole === 'resident' || societyRole === 'admin') && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>💬 Send Message to Guard</h3>
          <div className="form-group"><input className="form-input" value={guardMsgText} onChange={e=>setGuardMsgText(e.target.value)} placeholder="Type your message for the security guard..." /></div>
          <button className="btn btn-primary" onClick={async()=>{
            if(!guardMsgText.trim()) return;
            const r = await api('/guard-message',{method:'POST',body:{message:guardMsgText}});
            if(r.success){flash('✅ Message sent to guard');setGuardMsgText('');}
            else flash('❌ '+(r.error||'Error'));
          }}>Send Message</button>
        </div>
      )}
      {societyRole === 'guard' && (
        <div className="glass-card">
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📩 Messages from Residents ({guardMessages.filter(m=>!m.is_read).length} unread)</h3>
          {guardMessages.map(m=>(
            <div key={m.id} style={{padding:'1rem',borderRadius:'var(--radius-sm)',marginBottom:'0.75rem',background:m.is_read?'transparent':'var(--primary-light)',border:'1px solid var(--card-border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <strong>{m.sender_name}</strong>
                <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p style={{margin:'0.5rem 0',color:'var(--text)'}}>{m.message}</p>
              {!m.is_read && <button className="btn btn-secondary" style={{padding:'0.2rem 0.6rem',fontSize:'0.72rem'}} onClick={async()=>{await api(`/guard-messages/${m.id}/read`,{method:'PUT'});load('messages');}}>Mark Read</button>}
            </div>
          ))}
          {guardMessages.length===0 && <p style={{color:'var(--text-muted)',textAlign:'center'}}>No messages</p>}
        </div>
      )}
    </div>
  );

  // ─── REMINDERS TAB ────────────────────────────────────────
  const renderReminders = () => (
    <div>
      {(societyRole === 'resident' || societyRole === 'admin') && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>⏰ Set Guard Reminder</h3>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Task Title *</label><input className="form-input" value={reminderForm.title} onChange={e=>setReminderForm({...reminderForm,title:e.target.value})} placeholder="e.g. Gate round check" /></div>
            <div className="form-group"><label className="form-label">Time *</label><input className="form-input" type="datetime-local" value={reminderForm.reminderTime} onChange={e=>setReminderForm({...reminderForm,reminderTime:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Priority</label>
              <select style={styles.select} value={reminderForm.priority} onChange={e=>setReminderForm({...reminderForm,priority:e.target.value})}>
                <option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
              </select></div>
          </div>
          <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={reminderForm.description} onChange={e=>setReminderForm({...reminderForm,description:e.target.value})} placeholder="Details..." /></div>
          <button className="btn btn-accent" onClick={async()=>{
            const r = await api('/guard-reminder',{method:'POST',body:reminderForm});
            if(r.success){flash('⏰ Reminder set');setReminderForm({title:'',description:'',reminderTime:'',priority:'normal'});}
            else flash('❌ '+(r.error||'Error'));
          }}>Set Reminder</button>
        </div>
      )}
      {societyRole === 'guard' && (
        <div className="glass-card">
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>⏰ My Active Reminders</h3>
          {reminders.map(r=>(
            <div key={r.id} style={{padding:'1rem',borderRadius:'var(--radius-sm)',marginBottom:'0.75rem',border:'1px solid var(--card-border)',borderLeft:`4px solid ${r.priority==='critical'?'#ef4444':r.priority==='high'?'#f59e0b':'var(--primary)'}`,background:'var(--card-bg)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <strong>{r.priority==='critical'?'🔴':r.priority==='high'?'🟡':'🔵'} {r.title}</strong>
                <button className="btn btn-secondary" style={{padding:'0.2rem 0.6rem',fontSize:'0.72rem'}} onClick={async()=>{await api(`/guard-reminders/${r.id}/dismiss`,{method:'PUT'});flash('Dismissed');load('reminders');}}>Dismiss</button>
              </div>
              {r.description && <p style={{fontSize:'0.85rem',color:'var(--text-muted)',margin:'0.3rem 0'}}>{r.description}</p>}
              <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>⏰ {new Date(r.reminder_time).toLocaleString()} • Set by {r.created_by_name}</span>
            </div>
          ))}
          {reminders.length===0 && <p style={{color:'var(--text-muted)',textAlign:'center'}}>No active reminders</p>}
        </div>
      )}
    </div>
  );

  // ─── STAFF TAB ────────────────────────────────────────────
  const renderStaff = () => (
    <div>
      {societyRole === 'admin' && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>➕ Register Domestic Staff</h3>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={staffForm.staffName} onChange={e=>setStaffForm({...staffForm,staffName:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={staffForm.staffPhone} onChange={e=>setStaffForm({...staffForm,staffPhone:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Type</label>
              <select style={styles.select} value={staffForm.staffType} onChange={e=>setStaffForm({...staffForm,staffType:e.target.value})}>
                <option value="maid">Maid</option><option value="cook">Cook</option><option value="driver">Driver</option><option value="gardener">Gardener</option><option value="watchman">Watchman</option><option value="other">Other</option>
              </select></div>
            <div className="form-group"><label className="form-label">Assigned Flats</label><input className="form-input" value={staffForm.assignedFlats} onChange={e=>setStaffForm({...staffForm,assignedFlats:e.target.value})} placeholder="A-401, A-402" /></div>
          </div>
          <button className="btn btn-primary" onClick={async()=>{
            const r = await api('/staff',{method:'POST',body:{...staffForm,assignedFlats:staffForm.assignedFlats.split(',').map(s=>s.trim())}});
            if(r.success){flash('✅ Staff added');setStaffForm({staffName:'',staffPhone:'',staffType:'maid',assignedFlats:''});load('staff');}
            else flash('❌ '+(r.error||'Error'));
          }}>Add Staff</button>
        </div>
      )}
      {societyRole === 'guard' && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📋 Mark Attendance Today</h3>
          <div className="grid-3">
            {(todayAttendance.allStaff||[]).map(s=>{
              const att = (todayAttendance.attendance||[]).find(a=>a.staff_id===s.id);
              return (
                <div key={s.id} className="glass-card" style={{padding:'1.2rem',textAlign:'center'}}>
                  <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>{s.staff_type==='maid'?'🧹':s.staff_type==='cook'?'👨‍🍳':s.staff_type==='driver'?'🚗':'👷'}</div>
                  <strong>{s.staff_name}</strong>
                  <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:'0.5rem'}}>{s.staff_type} • {s.staff_phone}</div>
                  {att?.check_in_time && <div style={{fontSize:'0.72rem',color:'var(--accent)'}}>In: {new Date(att.check_in_time).toLocaleTimeString()}</div>}
                  {att?.check_out_time && <div style={{fontSize:'0.72rem',color:'var(--secondary)'}}>Out: {new Date(att.check_out_time).toLocaleTimeString()}</div>}
                  <div style={{display:'flex',gap:'0.4rem',marginTop:'0.75rem',justifyContent:'center'}}>
                    {!att?.check_in_time && <button className="btn btn-primary" style={{padding:'0.3rem 0.7rem',fontSize:'0.72rem'}} onClick={async()=>{await api(`/staff/${s.id}/attendance`,{method:'POST',body:{action:'check_in'}});flash('✅ Checked in');load('staff');}}>Check In</button>}
                    {att?.check_in_time && !att?.check_out_time && <button className="btn btn-accent" style={{padding:'0.3rem 0.7rem',fontSize:'0.72rem'}} onClick={async()=>{await api(`/staff/${s.id}/attendance`,{method:'POST',body:{action:'check_out'}});flash('✅ Checked out');load('staff');}}>Check Out</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="glass-card">
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>🧹 Domestic Staff ({staff.length})</h3>
        <div className="grid-3">
          {staff.map(s=>(
            <div key={s.id} className="glass-card hover-glow" style={{padding:'1.2rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.5rem'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>{s.staff_type==='maid'?'🧹':s.staff_type==='cook'?'👨‍🍳':s.staff_type==='driver'?'🚗':'👷'}</div>
                <div><strong>{s.staff_name}</strong><div style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{s.staff_type} • {s.staff_phone}</div></div>
              </div>
              {s.assigned_flats && <div style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>Flats: {typeof s.assigned_flats==='string'?s.assigned_flats:JSON.parse(s.assigned_flats).join(', ')}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── BILLS TAB ────────────────────────────────────────────
  const renderBills = () => (
    <div>
      {societyRole === 'admin' && (
        <>
          {billSummary && (
            <div style={styles.statsGrid}>
              {[{label:'Total Bills',value:billSummary.totalBills,icon:'📄'},{label:'Total Amount',value:`₹${billSummary.totalAmount||0}`,icon:'💰'},{label:'Collected',value:`₹${billSummary.collectedAmount||0}`,icon:'✅'},{label:'Pending',value:billSummary.pendingCount,icon:'⏳'},{label:'Overdue',value:billSummary.overdueCount,icon:'🔴'}].map((s,i)=>(
                <div key={i} className="glass-card" style={{padding:'1.2rem',textAlign:'center'}}>
                  <div style={{fontSize:'1.5rem'}}>{s.icon}</div><div className="stat-chip-value" style={{fontSize:'1.3rem'}}>{s.value}</div><div className="stat-chip-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="glass-card" style={{marginBottom:'2rem'}}>
            <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📄 Generate Monthly Bills</h3>
            <div style={styles.formRow}>
              <div className="form-group"><label className="form-label">Month</label><input className="form-input" type="month" value={billForm.month} onChange={e=>setBillForm({...billForm,month:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Base Amount (₹)</label><input className="form-input" type="number" value={billForm.baseAmount} onChange={e=>setBillForm({...billForm,baseAmount:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Water (₹)</label><input className="form-input" type="number" value={billForm.waterCharges} onChange={e=>setBillForm({...billForm,waterCharges:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Parking (₹)</label><input className="form-input" type="number" value={billForm.parkingCharges} onChange={e=>setBillForm({...billForm,parkingCharges:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Other (₹)</label><input className="form-input" type="number" value={billForm.otherCharges} onChange={e=>setBillForm({...billForm,otherCharges:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={billForm.dueDate} onChange={e=>setBillForm({...billForm,dueDate:e.target.value})} /></div>
            </div>
            <button className="btn btn-accent" onClick={async()=>{const r=await api('/bills/generate',{method:'POST',body:billForm});if(r.success){flash('✅ '+r.message);load('bills');}else flash('❌ '+(r.error||'Error'));}}>Generate Bills for All Flats</button>
          </div>
        </>
      )}
      <div className="glass-card">
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>{societyRole==='admin'?'💰 All Bills':'💰 My Maintenance Bills'}</h3>
        <div style={{overflowX:'auto'}}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Flat</th>{societyRole==='admin'&&<th style={styles.th}>Name</th>}<th style={styles.th}>Month</th><th style={styles.th}>Amount</th><th style={styles.th}>Status</th><th style={styles.th}>Due</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>{bills.map(b=>(
              <tr key={b.id}>
                <td style={{...styles.td,...styles.tdFirst}}>{b.flat_number}</td>
                {societyRole==='admin'&&<td style={styles.td}>{b.full_name}</td>}
                <td style={styles.td}>{b.month}</td>
                <td style={styles.td}><strong>₹{b.total_amount}</strong></td>
                <td style={styles.td}><span style={styles.statusBadge(b.payment_status)}>{b.payment_status}</span></td>
                <td style={styles.td}>{b.due_date}</td>
                <td style={{...styles.td,...styles.tdLast}}>
                  {societyRole==='resident'&&b.payment_status!=='paid'&&<button className="btn btn-primary" style={{padding:'0.3rem 0.8rem',fontSize:'0.72rem'}} onClick={async()=>{const ref=prompt('Enter payment reference (UPI ID / Transaction ID):');if(ref){await api(`/bills/${b.id}/pay`,{method:'PUT',body:{paymentReference:ref}});flash('✅ Paid');load('bills');}}}>💳 Pay Now</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─── PARKING TAB ──────────────────────────────────────────
  const renderParking = () => (
    <div>
      {societyRole === 'admin' && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>➕ Add Parking Slot</h3>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Slot Number</label><input className="form-input" value={parkingForm.slotNumber} onChange={e=>setParkingForm({...parkingForm,slotNumber:e.target.value})} placeholder="P-01" /></div>
            <div className="form-group"><label className="form-label">Type</label><select style={styles.select} value={parkingForm.slotType} onChange={e=>setParkingForm({...parkingForm,slotType:e.target.value})}><option value="car">Car</option><option value="bike">Bike</option><option value="visitor">Visitor</option></select></div>
            <div className="form-group"><label className="form-label">Assign to Flat</label><input className="form-input" value={parkingForm.flatNumber} onChange={e=>setParkingForm({...parkingForm,flatNumber:e.target.value})} placeholder="A-401" /></div>
            <div className="form-group"><label className="form-label">Vehicle Number</label><input className="form-input" value={parkingForm.vehicleNumber} onChange={e=>setParkingForm({...parkingForm,vehicleNumber:e.target.value})} /></div>
          </div>
          <button className="btn btn-primary" onClick={async()=>{const r=await api('/parking',{method:'POST',body:parkingForm});if(r.success){flash('✅ Slot added');setParkingForm({slotNumber:'',slotType:'car',flatNumber:'',vehicleNumber:''});load('parking');}else flash('❌ '+(r.error||'Error'));}}>Add Slot</button>
        </div>
      )}
      <div className="glass-card">
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>🅿️ Parking Slots</h3>
        <div className="grid-3">
          {parkingSlots.map(s=>(
            <div key={s.id} className="glass-card hover-glow" style={{padding:'1.2rem',textAlign:'center',borderTop:`3px solid ${s.is_occupied?'#ef4444':'#10b981'}`}}>
              <div style={{fontSize:'1.5rem',fontWeight:900,fontFamily:'var(--font-heading)'}}>{s.slot_number}</div>
              <span className="badge" style={{background:s.is_occupied?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.15)',color:s.is_occupied?'#ef4444':'#10b981'}}>{s.is_occupied?'Occupied':'Available'}</span>
              <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:'0.5rem'}}>{s.slot_type} • {s.flat_number||'Unassigned'}</div>
              {s.vehicle_number && <div style={{fontSize:'0.85rem',fontWeight:600,marginTop:'0.25rem'}}>🚗 {s.vehicle_number}</div>}
              {societyRole==='admin'&&<button className="btn btn-danger" style={{padding:'0.2rem 0.5rem',fontSize:'0.7rem',marginTop:'0.5rem'}} onClick={async()=>{await api(`/parking/${s.id}`,{method:'DELETE'});load('parking');}}>Remove</button>}
            </div>
          ))}
          {parkingSlots.length===0 && <p style={{color:'var(--text-muted)',gridColumn:'1/-1',textAlign:'center'}}>No parking slots configured</p>}
        </div>
      </div>
    </div>
  );

  // ─── AMENITIES TAB ────────────────────────────────────────
  const renderAmenities = () => (
    <div>
      {societyRole === 'admin' && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>➕ Add Amenity</h3>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={amenityForm.name} onChange={e=>setAmenityForm({...amenityForm,name:e.target.value})} placeholder="Clubhouse, Gym..." /></div>
            <div className="form-group"><label className="form-label">Capacity</label><input className="form-input" type="number" value={amenityForm.capacity} onChange={e=>setAmenityForm({...amenityForm,capacity:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Hourly Rate (₹)</label><input className="form-input" type="number" value={amenityForm.hourlyRate} onChange={e=>setAmenityForm({...amenityForm,hourlyRate:e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="form-label">Rules</label><input className="form-input" value={amenityForm.rules} onChange={e=>setAmenityForm({...amenityForm,rules:e.target.value})} placeholder="Usage rules..." /></div>
          <button className="btn btn-primary" onClick={async()=>{const r=await api('/amenities',{method:'POST',body:amenityForm});if(r.success){flash('✅ Amenity added');setAmenityForm({name:'',description:'',capacity:'',hourlyRate:'0',rules:''});load('amenities');}else flash('❌ '+(r.error||'Error'));}}>Add Amenity</button>
        </div>
      )}
      <div className="glass-card" style={{marginBottom:'2rem'}}>
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>🏊 Amenities & Facilities</h3>
        <div className="grid-3">
          {amenities.map(a=>(
            <div key={a.id} className="glass-card hover-glow" style={{padding:'1.5rem'}}>
              <h4 style={{fontFamily:'var(--font-heading)',marginBottom:'0.5rem'}}>{a.name}</h4>
              {a.capacity>0 && <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Capacity: {a.capacity}</div>}
              {a.hourly_rate>0 && <div style={{fontSize:'0.8rem',color:'var(--secondary)'}}>₹{a.hourly_rate}/hr</div>}
              {a.rules && <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:'0.5rem'}}>{a.rules}</div>}
              {societyRole==='resident'&&(
                <div style={{marginTop:'1rem'}}>
                  <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                    <input className="form-input" type="date" style={{padding:'0.3rem',fontSize:'0.8rem',flex:1}} value={bookingForm.bookingDate} onChange={e=>setBookingForm({...bookingForm,bookingDate:e.target.value})} />
                    <input className="form-input" type="time" style={{padding:'0.3rem',fontSize:'0.8rem',width:'100px'}} value={bookingForm.startTime} onChange={e=>setBookingForm({...bookingForm,startTime:e.target.value})} />
                    <input className="form-input" type="time" style={{padding:'0.3rem',fontSize:'0.8rem',width:'100px'}} value={bookingForm.endTime} onChange={e=>setBookingForm({...bookingForm,endTime:e.target.value})} />
                  </div>
                  <button className="btn btn-primary" style={{padding:'0.3rem 0.8rem',fontSize:'0.75rem',marginTop:'0.5rem'}} onClick={async()=>{const r=await api(`/amenities/${a.id}/book`,{method:'POST',body:bookingForm});if(r.success){flash('✅ Booked!');load('amenities');}else flash('❌ '+(r.error||'Error'));}}>Book Now</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {societyRole==='resident'&&myBookings.length>0&&(
        <div className="glass-card">
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📋 My Bookings</h3>
          {myBookings.map(b=>(
            <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem',borderRadius:'var(--radius-sm)',marginBottom:'0.5rem',border:'1px solid var(--card-border)'}}>
              <div><strong>{b.amenity_name}</strong> • {b.booking_date} • {b.start_time} - {b.end_time}</div>
              <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                <span style={styles.statusBadge(b.status)}>{b.status}</span>
                {b.status==='confirmed'&&<button className="btn btn-danger" style={{padding:'0.2rem 0.5rem',fontSize:'0.7rem'}} onClick={async()=>{await api(`/bookings/${b.id}/cancel`,{method:'PUT'});flash('Cancelled');load('amenities');}}>Cancel</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── COMPLAINTS TAB ───────────────────────────────────────
  const renderComplaints = () => (
    <div>
      {societyRole === 'resident' && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📝 File a Complaint</h3>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Category</label>
              <select style={styles.select} value={complaintForm.category} onChange={e=>setComplaintForm({...complaintForm,category:e.target.value})}>
                <option value="plumbing">Plumbing</option><option value="electrical">Electrical</option><option value="water">Water Supply</option><option value="noise">Noise</option><option value="parking">Parking</option><option value="cleanliness">Cleanliness</option><option value="security">Security</option><option value="other">Other</option>
              </select></div>
            <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={complaintForm.title} onChange={e=>setComplaintForm({...complaintForm,title:e.target.value})} placeholder="Brief title" /></div>
            <div className="form-group"><label className="form-label">Priority</label>
              <select style={styles.select} value={complaintForm.priority} onChange={e=>setComplaintForm({...complaintForm,priority:e.target.value})}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select></div>
          </div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={complaintForm.description} onChange={e=>setComplaintForm({...complaintForm,description:e.target.value})} placeholder="Describe the issue in detail..." /></div>
          <button className="btn btn-accent" onClick={async()=>{const r=await api('/complaints',{method:'POST',body:complaintForm});if(r.success){flash('✅ Complaint filed');setComplaintForm({category:'plumbing',title:'',description:'',priority:'medium'});load('complaints');}else flash('❌ '+(r.error||'Error'));}}>Submit Complaint</button>
        </div>
      )}
      <div className="glass-card">
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📋 {societyRole==='admin'?'All Complaints':'My Complaints'}</h3>
        {complaints.map(c=>(
          <div key={c.id} style={{padding:'1rem',borderRadius:'var(--radius-sm)',marginBottom:'0.75rem',border:'1px solid var(--card-border)',borderLeft:`4px solid ${c.priority==='critical'?'#ef4444':c.priority==='high'?'#f59e0b':c.priority==='medium'?'#3b82f6':'#64748b'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'0.5rem'}}>
              <div><strong>{c.title}</strong>{societyRole==='admin'&&<span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}> — {c.full_name} ({c.flat_number})</span>}</div>
              <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}><span className="badge badge-secondary" style={{textTransform:'capitalize'}}>{c.category}</span><span style={styles.statusBadge(c.status)}>{c.status?.replace('_',' ')}</span></div>
            </div>
            <p style={{fontSize:'0.85rem',color:'var(--text-muted)',margin:'0.5rem 0'}}>{c.description}</p>
            {c.admin_notes && <p style={{fontSize:'0.8rem',color:'var(--primary)',fontStyle:'italic'}}>Admin: {c.admin_notes}</p>}
            {societyRole==='admin'&&c.status!=='resolved'&&c.status!=='closed'&&(
              <div style={{display:'flex',gap:'0.4rem',marginTop:'0.5rem'}}>
                <button className="btn btn-primary" style={{padding:'0.25rem 0.6rem',fontSize:'0.72rem'}} onClick={async()=>{const notes=prompt('Admin notes:');await api(`/complaints/${c.id}/assign`,{method:'PUT',body:{status:'in_progress',adminNotes:notes||''}});flash('Updated');load('complaints');}}>In Progress</button>
                <button className="btn btn-accent" style={{padding:'0.25rem 0.6rem',fontSize:'0.72rem'}} onClick={async()=>{await api(`/complaints/${c.id}/resolve`,{method:'PUT'});flash('✅ Resolved');load('complaints');}}>Resolve</button>
              </div>
            )}
          </div>
        ))}
        {complaints.length===0 && <p style={{color:'var(--text-muted)',textAlign:'center'}}>No complaints</p>}
      </div>
    </div>
  );

  // ─── PACKAGES TAB ─────────────────────────────────────────
  const renderPackages = () => (
    <div>
      {societyRole === 'guard' && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📦 Log Received Package</h3>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Flat Number *</label><input className="form-input" value={packageForm.flatNumber} onChange={e=>setPackageForm({...packageForm,flatNumber:e.target.value})} placeholder="A-401" /></div>
            <div className="form-group"><label className="form-label">Courier</label><input className="form-input" value={packageForm.courierName} onChange={e=>setPackageForm({...packageForm,courierName:e.target.value})} placeholder="Amazon, Flipkart..." /></div>
            <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={packageForm.packageDescription} onChange={e=>setPackageForm({...packageForm,packageDescription:e.target.value})} placeholder="Package details" /></div>
          </div>
          <button className="btn btn-primary" onClick={async()=>{const r=await api('/packages',{method:'POST',body:packageForm});if(r.success){flash('📦 Package logged & resident notified');setPackageForm({flatNumber:'',courierName:'',packageDescription:''});load('packages');}else flash('❌ '+(r.error||'Error'));}}>Log Package</button>
        </div>
      )}
      <div className="glass-card">
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📦 {societyRole==='resident'?'My Packages':'Pending Packages'}</h3>
        {packages.map(p=>(
          <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1rem',borderRadius:'var(--radius-sm)',marginBottom:'0.5rem',border:'1px solid var(--card-border)'}}>
            <div>
              <strong>{p.courier_name||'Package'}</strong> → Flat {p.flat_number}
              {p.package_description && <span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}> • {p.package_description}</span>}
              <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{new Date(p.created_at).toLocaleString()}</div>
            </div>
            <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
              <span style={styles.statusBadge(p.status)}>{p.status}</span>
              {p.status==='received'&&<button className="btn btn-primary" style={{padding:'0.25rem 0.6rem',fontSize:'0.72rem'}} onClick={async()=>{await api(`/packages/${p.id}/collect`,{method:'PUT'});flash('✅ Collected');load('packages');}}>Collect</button>}
            </div>
          </div>
        ))}
        {packages.length===0 && <p style={{color:'var(--text-muted)',textAlign:'center'}}>No packages</p>}
      </div>
    </div>
  );

  // ─── POLLS TAB ────────────────────────────────────────────
  const renderPolls = () => (
    <div>
      {societyRole === 'admin' && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>🗳️ Create New Poll</h3>
          <div className="form-group"><label className="form-label">Question / Title</label><input className="form-input" value={pollForm.title} onChange={e=>setPollForm({...pollForm,title:e.target.value})} placeholder="e.g. Should we install CCTV at parking area?" /></div>
          <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={pollForm.description} onChange={e=>setPollForm({...pollForm,description:e.target.value})} placeholder="Optional details" /></div>
          <div className="form-group"><label className="form-label">Options</label>
            {pollForm.options.map((o,i)=>(
              <div key={i} style={{display:'flex',gap:'0.5rem',marginBottom:'0.4rem'}}>
                <input className="form-input" value={o} onChange={e=>{const opts=[...pollForm.options];opts[i]=e.target.value;setPollForm({...pollForm,options:opts});}} placeholder={`Option ${i+1}`} />
                {pollForm.options.length>2 && <button className="btn btn-danger" style={{padding:'0.2rem 0.5rem',fontSize:'0.7rem'}} onClick={()=>{const opts=pollForm.options.filter((_,j)=>j!==i);setPollForm({...pollForm,options:opts});}}>✕</button>}
              </div>
            ))}
            <button className="btn btn-secondary" style={{padding:'0.3rem 0.8rem',fontSize:'0.75rem'}} onClick={()=>setPollForm({...pollForm,options:[...pollForm.options,'']})}>+ Add Option</button>
          </div>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Ends At</label><input className="form-input" type="datetime-local" value={pollForm.endsAt} onChange={e=>setPollForm({...pollForm,endsAt:e.target.value})} /></div>
          </div>
          <button className="btn btn-primary" onClick={async()=>{const r=await api('/polls',{method:'POST',body:{...pollForm,options:pollForm.options.filter(o=>o.trim())}});if(r.success){flash('✅ Poll created');setPollForm({title:'',description:'',options:['',''],pollType:'single',endsAt:''});load('polls');}else flash('❌ '+(r.error||'Error'));}}>Create Poll</button>
        </div>
      )}
      <div className="glass-card">
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>🗳️ Active Polls</h3>
        {polls.map(p=>{
          const options = typeof p.options==='string'?JSON.parse(p.options):p.options;
          const results = pollResults[p.id];
          const colors = ['#6366f1','#f59e0b','#10b981','#ef4444','#ec4899','#8b5cf6'];
          return (
            <div key={p.id} className="glass-card" style={{marginBottom:'1.5rem',padding:'1.5rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                <div><h4 style={{fontFamily:'var(--font-heading)'}}>{p.title}</h4>
                  {p.description && <p style={{fontSize:'0.85rem',color:'var(--text-muted)',margin:'0.3rem 0'}}>{p.description}</p>}
                  <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>By {p.creator_name} • {p.total_votes} votes • {p.status}</span>
                </div>
                {societyRole==='admin'&&p.status==='active'&&<button className="btn btn-danger" style={{padding:'0.25rem 0.6rem',fontSize:'0.72rem'}} onClick={async()=>{await api(`/polls/${p.id}/close`,{method:'PUT'});flash('Poll closed');load('polls');}}>Close</button>}
              </div>
              <div style={{marginTop:'1rem'}}>
                {results ? results.results.map((r,i)=>(
                  <div key={i} style={{marginBottom:'0.5rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.85rem',marginBottom:'0.2rem'}}><span>{r.option}</span><span style={{fontWeight:700}}>{r.percentage}% ({r.votes})</span></div>
                    <div style={{width:'100%',height:'28px',borderRadius:'14px',background:'var(--border)',overflow:'hidden'}}><div style={styles.pollBar(r.percentage,colors[i%colors.length])}></div></div>
                  </div>
                )) : options.map((o,i)=>(
                  <div key={i} style={{marginBottom:'0.4rem'}}>
                    {p.status==='active'&&p.myVote===null&&societyRole==='resident'?
                      <button className="btn btn-secondary" style={{width:'100%',justifyContent:'start',padding:'0.5rem 1rem',fontSize:'0.85rem'}} onClick={async()=>{await api(`/polls/${p.id}/vote`,{method:'POST',body:{selectedOption:i}});flash('✅ Voted');load('polls');}}>{o}</button>
                      :<div style={{padding:'0.5rem 1rem',borderRadius:'var(--radius-sm)',border:'1px solid var(--card-border)',fontSize:'0.85rem',background:p.myVote===i?'var(--primary-light)':'transparent'}}>{o} {p.myVote===i&&'✓'}</div>
                    }
                  </div>
                ))}
                {!results && <button className="btn btn-secondary" style={{marginTop:'0.5rem',padding:'0.3rem 0.8rem',fontSize:'0.75rem'}} onClick={async()=>{const r=await api(`/polls/${p.id}/results`);if(r.success)setPollResults({...pollResults,[p.id]:r.data});}}>📊 View Results</button>}
              </div>
            </div>
          );
        })}
        {polls.length===0 && <p style={{color:'var(--text-muted)',textAlign:'center'}}>No active polls</p>}
      </div>
    </div>
  );

  // ─── EMERGENCY TAB ────────────────────────────────────────
  const renderEmergency = () => (
    <div>
      <div className="glass-card" style={{marginBottom:'2rem',textAlign:'center'}}>
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.5rem',marginBottom:'1.5rem',color:'#ef4444'}}>🚨 EMERGENCY ALERT</h3>
        <div style={styles.formRow}>
          <div className="form-group"><label className="form-label">Alert Type</label>
            <select style={styles.select} value={emergencyForm.alertType} onChange={e=>setEmergencyForm({...emergencyForm,alertType:e.target.value})}>
              <option value="fire">🔥 Fire</option><option value="medical">🏥 Medical</option><option value="security_breach">🔒 Security Breach</option><option value="gas_leak">💨 Gas Leak</option><option value="earthquake">🌍 Earthquake</option><option value="other">⚠️ Other</option>
            </select></div>
          <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={emergencyForm.description} onChange={e=>setEmergencyForm({...emergencyForm,description:e.target.value})} placeholder="Brief description" /></div>
        </div>
        <button style={styles.emergencyBtn} onClick={async()=>{
          if(!confirm('⚠️ This will trigger a LOUD ALARM for ALL society members. Are you sure?')) return;
          const r=await api('/emergency',{method:'POST',body:emergencyForm});
          if(r.success) flash('🚨 EMERGENCY ALERT TRIGGERED!');
          else flash('❌ '+(r.error||'Error'));
          load('emergency');
        }}>🚨 TRIGGER EMERGENCY ALERT</button>
      </div>
      {emergencies.length>0 && (
        <div className="glass-card">
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem',color:'#ef4444'}}>🔴 Active Emergencies</h3>
          {emergencies.map(e=>(
            <div key={e.id} style={{padding:'1rem',borderRadius:'var(--radius-sm)',marginBottom:'0.75rem',border:'2px solid #ef4444',background:'rgba(239,68,68,0.05)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><strong style={{fontSize:'1.1rem',color:'#ef4444'}}>🚨 {e.alert_type?.replace('_',' ').toUpperCase()}</strong><span style={{fontSize:'0.85rem',color:'var(--text-muted)'}}> — {e.flat_number} by {e.triggered_by_name}</span></div>
                {(societyRole==='admin'||societyRole==='guard')&&<button className="btn btn-primary" style={{padding:'0.3rem 0.8rem',fontSize:'0.75rem'}} onClick={async()=>{await api(`/emergency/${e.id}/resolve`,{method:'PUT',body:{status:'resolved'}});flash('✅ Resolved');load('emergency');}}>Resolve</button>}
              </div>
              {e.description && <p style={{fontSize:'0.85rem',marginTop:'0.3rem'}}>{e.description}</p>}
              <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{new Date(e.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── DIRECTORY TAB ────────────────────────────────────────
  const renderDirectory = () => (
    <div className="glass-card">
      <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📞 Flat Directory</h3>
      <div className="form-group"><input className="form-input" value={dirSearch} onChange={e=>{setDirSearch(e.target.value);}} onKeyDown={e=>{if(e.key==='Enter')load('directory');}} placeholder="🔍 Search by flat, name, or phone..." /></div>
      <div className="grid-3">
        {directory.map((d,i)=>(
          <div key={i} className="glass-card hover-glow" style={{padding:'1rem',display:'flex',alignItems:'center',gap:'1rem'}}>
            <div style={{width:'45px',height:'45px',borderRadius:'50%',background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',fontWeight:700,color:'var(--primary)',fontFamily:'var(--font-heading)',flexShrink:0}}>{d.flat_number}</div>
            <div>
              <strong>{d.full_name}</strong>
              <div style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{d.phone_number} • <span style={{textTransform:'capitalize'}}>{d.role}</span></div>
            </div>
          </div>
        ))}
        {directory.length===0 && <p style={{color:'var(--text-muted)',gridColumn:'1/-1',textAlign:'center'}}>No residents found</p>}
      </div>
    </div>
  );

  // ─── EVENTS TAB ───────────────────────────────────────────
  const renderEvents = () => (
    <div>
      {societyRole === 'admin' && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📅 Create Event</h3>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={eventForm.title} onChange={e=>setEventForm({...eventForm,title:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={eventForm.eventDate} onChange={e=>setEventForm({...eventForm,eventDate:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Type</label>
              <select style={styles.select} value={eventForm.eventType} onChange={e=>setEventForm({...eventForm,eventType:e.target.value})}>
                <option value="festival">🎉 Festival</option><option value="meeting">📋 Meeting</option><option value="sports">⚽ Sports</option><option value="cultural">🎭 Cultural</option><option value="maintenance">🔧 Maintenance</option><option value="general">📌 General</option>
              </select></div>
          </div>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Start Time</label><input className="form-input" type="time" value={eventForm.startTime} onChange={e=>setEventForm({...eventForm,startTime:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">End Time</label><input className="form-input" type="time" value={eventForm.endTime} onChange={e=>setEventForm({...eventForm,endTime:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Venue</label><input className="form-input" value={eventForm.venue} onChange={e=>setEventForm({...eventForm,venue:e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})} /></div>
          <button className="btn btn-primary" onClick={async()=>{const r=await api('/events',{method:'POST',body:eventForm});if(r.success){flash('✅ Event created');setEventForm({title:'',description:'',eventDate:'',startTime:'',endTime:'',venue:'',eventType:'general',maxAttendees:''});load('events');}else flash('❌ '+(r.error||'Error'));}}>Create Event</button>
        </div>
      )}
      <div className="glass-card">
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📅 Upcoming Events</h3>
        {events.map(e=>(
          <div key={e.id} className="glass-card" style={{...styles.calCard(e.event_type),marginBottom:'1rem',padding:'1.2rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',flexWrap:'wrap',gap:'0.5rem'}}>
              <div>
                <h4 style={{fontFamily:'var(--font-heading)'}}>{e.title}</h4>
                <div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginTop:'0.3rem'}}>📅 {e.event_date} {e.start_time && `• ⏰ ${e.start_time} - ${e.end_time}`} {e.venue && `• 📍 ${e.venue}`}</div>
                {e.description && <p style={{fontSize:'0.85rem',margin:'0.5rem 0'}}>{e.description}</p>}
                <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>By {e.organizer_name} • {e.going_count} going</span>
              </div>
              <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                {societyRole==='resident'&&['going','maybe','not_going'].map(s=>(
                  <button key={s} className={`btn ${e.myRsvp===s?'btn-primary':'btn-secondary'}`} style={{padding:'0.25rem 0.6rem',fontSize:'0.72rem'}} onClick={async()=>{await api(`/events/${e.id}/rsvp`,{method:'POST',body:{status:s}});load('events');}}>{s==='going'?'✅ Going':s==='maybe'?'🤔 Maybe':'❌ No'}</button>
                ))}
                {societyRole==='admin'&&<button className="btn btn-danger" style={{padding:'0.25rem 0.6rem',fontSize:'0.72rem'}} onClick={async()=>{await api(`/events/${e.id}`,{method:'DELETE'});flash('Event cancelled');load('events');}}>Cancel</button>}
              </div>
            </div>
          </div>
        ))}
        {events.length===0 && <p style={{color:'var(--text-muted)',textAlign:'center'}}>No upcoming events</p>}
      </div>
    </div>
  );

  // ─── NOTICES TAB ──────────────────────────────────────────
  const renderNotices = () => (
    <div>
      {societyRole === 'admin' && (
        <div className="glass-card" style={{marginBottom:'2rem'}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📝 Post Notice</h3>
          <div style={styles.formRow}>
            <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={noticeForm.title} onChange={e=>setNoticeForm({...noticeForm,title:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Priority</label>
              <select style={styles.select} value={noticeForm.priority} onChange={e=>setNoticeForm({...noticeForm,priority:e.target.value})}>
                <option value="normal">🔵 Normal</option><option value="important">🟠 Important</option><option value="urgent">🔴 Urgent</option>
              </select></div>
          </div>
          <div className="form-group"><label className="form-label">Content</label><textarea className="form-input" rows={3} value={noticeForm.content} onChange={e=>setNoticeForm({...noticeForm,content:e.target.value})} placeholder="Notice content..." /></div>
          <button className="btn btn-primary" onClick={async()=>{const r=await api('/notices',{method:'POST',body:noticeForm});if(r.success){flash('✅ Notice posted');setNoticeForm({title:'',content:'',priority:'normal'});load('notices');}else flash('❌ '+(r.error||'Error'));}}>Post Notice</button>
        </div>
      )}
      <div className="glass-card">
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1rem'}}>📝 Society Notices</h3>
        {notices.map(n=>(
          <div key={n.id} className="glass-card" style={{...styles.noticeCard(n.priority),marginBottom:'1rem',padding:'1.2rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h4 style={{fontFamily:'var(--font-heading)'}}>{n.priority==='urgent'?'🔴':n.priority==='important'?'🟠':'🔵'} {n.title}</h4>
              <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{new Date(n.created_at).toLocaleDateString()}</span>
            </div>
            <p style={{fontSize:'0.9rem',margin:'0.5rem 0',lineHeight:1.6}}>{n.content}</p>
            <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Posted by {n.posted_by_name}</span>
          </div>
        ))}
        {notices.length===0 && <p style={{color:'var(--text-muted)',textAlign:'center'}}>No notices</p>}
      </div>
    </div>
  );

  // ─── SETTINGS TAB ─────────────────────────────────────────
  const renderSettings = () => (
    <div className="glass-card">
      <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1.5rem'}}>⚙️ Society Settings</h3>
      <div style={{display:'grid',gap:'1.5rem'}}>
        {[
          { key: 'visitorPhotoRequired', label: 'Visitor Photo Required', type: 'toggle' },
          { key: 'idCardRequired', label: 'ID Card Required', type: 'toggle' },
          { key: 'autoApproveExpected', label: 'Auto-Approve Expected Visitors', type: 'toggle' },
          { key: 'maxVisitorsPerFlat', label: 'Max Visitors Per Flat (per day)', type: 'number' },
          { key: 'guardShiftStart', label: 'Guard Shift Start', type: 'time' },
          { key: 'guardShiftEnd', label: 'Guard Shift End', type: 'time' },
          { key: 'maintenanceDueDay', label: 'Maintenance Due Day (of month)', type: 'number' },
          { key: 'lateFeePercentage', label: 'Late Fee (%)', type: 'number' }
        ].map(f => (
          <div key={f.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1rem',borderRadius:'var(--radius-sm)',border:'1px solid var(--card-border)'}}>
            <label className="form-label" style={{marginBottom:0}}>{f.label}</label>
            {f.type === 'toggle' ? (
              <button style={styles.toggle(settings[f.key])} onClick={()=>setSettings({...settings,[f.key]:!settings[f.key]})}>
                <div style={styles.toggleDot(settings[f.key])} />
              </button>
            ) : f.type === 'time' ? (
              <input className="form-input" type="time" style={{width:'140px'}} value={settings[f.key]||''} onChange={e=>setSettings({...settings,[f.key]:e.target.value})} />
            ) : (
              <input className="form-input" type="number" style={{width:'100px'}} value={settings[f.key]||''} onChange={e=>setSettings({...settings,[f.key]:e.target.value})} />
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{marginTop:'1.5rem'}} onClick={async()=>{const r=await api('/settings',{method:'PUT',body:settings});if(r.success)flash('✅ Settings saved');else flash('❌ '+(r.error||'Error'));}}>Save Settings</button>
    </div>
  );

  // ─── DASHBOARD TAB ────────────────────────────────────────
  const renderDashboard = () => (
    <div>
      <div className="glass-card" style={{marginBottom:'2rem', background: 'linear-gradient(135deg, var(--primary), #818cf8)', color: '#fff', border: 'none'}}>
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.5rem',marginBottom:'0.5rem',color:'#fff'}}>📊 Admin Analytics Dashboard</h3>
        <p style={{opacity: 0.9}}>Real-time overview of LocalSampark society metrics.</p>
      </div>
      
      {dashboardData ? (
        <div style={styles.statsGrid}>
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
            <div className="stat-chip-value" style={{ fontSize: '2rem' }}>{dashboardData.visitorsToday}</div>
            <div className="stat-chip-label" style={{ fontSize: '0.9rem' }}>Visitors Today</div>
          </div>
          
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚨</div>
            <div className="stat-chip-value" style={{ fontSize: '2rem', color: dashboardData.openComplaints > 0 ? '#ef4444' : 'var(--text)' }}>{dashboardData.openComplaints}</div>
            <div className="stat-chip-label" style={{ fontSize: '0.9rem' }}>Open Complaints</div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏊</div>
            <div className="stat-chip-value" style={{ fontSize: '2rem' }}>{dashboardData.activeBookings}</div>
            <div className="stat-chip-label" style={{ fontSize: '0.9rem' }}>Active Amenities Bookings</div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{textAlign: 'center', padding: '3rem'}}>
          <p style={{color: 'var(--text-muted)'}}>Loading dashboard data...</p>
        </div>
      )}

      {dashboardData && (
        <div className="glass-card" style={{ marginTop: '2rem' }}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',marginBottom:'1.5rem'}}>💰 Financial Overview (Current Year)</h3>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Allocated Budget</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>₹{(dashboardData.budget?.allocated || 0).toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Spent Amount</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>₹{(dashboardData.budget?.spent || 0).toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Remaining</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>₹{((dashboardData.budget?.allocated || 0) - (dashboardData.budget?.spent || 0)).toLocaleString()}</div>
            </div>
          </div>
          <div style={{ width: '100%', height: '12px', background: 'var(--border)', borderRadius: '6px', marginTop: '1.5rem', overflow: 'hidden', display: 'flex' }}>
             <div style={{ width: `${(dashboardData.budget?.allocated || 1) > 0 ? ((dashboardData.budget?.spent || 0) / (dashboardData.budget?.allocated || 1)) * 100 : 0}%`, background: '#ef4444', height: '100%' }}></div>
          </div>
        </div>
      )}
    </div>
  );

  // ─── AGM TAB ──────────────────────────────────────────────
  const renderAGM = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{fontFamily:'var(--font-heading)',fontSize:'1.8rem'}}>🏛️ AGM & Meetings</h2>
        {societyRole === 'admin' && <button className="primary-btn">Schedule Meeting</button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {agmData.length === 0 ? <p style={{color:'var(--text-muted)'}}>No upcoming meetings scheduled.</p> : 
          agmData.map(agm => (
            <div key={agm.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{agm.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>📅 {new Date(agm.meeting_date).toLocaleString()} | 📍 {agm.location}</p>
                <p style={{ fontSize: '0.95rem' }}>{agm.agenda}</p>
              </div>
              <span className="badge badge-primary" style={{ padding: '0.5rem 1rem' }}>{agm.status}</span>
            </div>
          ))
        }
      </div>
    </div>
  );

  // ─── BUDGET TAB ───────────────────────────────────────────
  const renderBudget = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{fontFamily:'var(--font-heading)',fontSize:'1.8rem'}}>📈 Society Budget</h2>
        {societyRole === 'admin' && <button className="primary-btn">Allocate Budget</button>}
      </div>
      
      <div className="table-responsive">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Financial Year</th>
              <th>Category</th>
              <th>Allocated (₹)</th>
              <th>Spent (₹)</th>
              <th>Remaining (₹)</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {budgetList.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign:'center', padding:'2rem'}}>No budget data found</td></tr>
            ) : (
              budgetList.map(b => (
                <tr key={b.id}>
                  <td>{b.financial_year}</td>
                  <td><strong>{b.category}</strong></td>
                  <td style={{color: '#10b981'}}>₹{b.allocated_amount.toLocaleString()}</td>
                  <td style={{color: '#ef4444'}}>₹{b.spent_amount.toLocaleString()}</td>
                  <td>₹{(b.allocated_amount - b.spent_amount).toLocaleString()}</td>
                  <td style={{width: '200px'}}>
                    <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (b.spent_amount / b.allocated_amount) * 100)}%`, background: '#ef4444', height: '100%' }}></div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── FORUM TAB ────────────────────────────────────────────
  const renderForum = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{fontFamily:'var(--font-heading)',fontSize:'1.8rem'}}>🗣️ Community Forum</h2>
        <button className="primary-btn">Start New Topic</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {forumTopics.length === 0 ? <p style={{color:'var(--text-muted)'}}>No topics in the forum yet.</p> : 
          forumTopics.map(topic => (
            <div key={topic.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '2rem', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                {topic.category === 'Announcement' ? '📢' : '💬'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{topic.title}</h3>
                  {topic.is_pinned === 1 && <span className="badge" style={{background:'#f59e0b', color:'#fff'}}>Pinned</span>}
                  {topic.is_locked === 1 && <span className="badge" style={{background:'#ef4444', color:'#fff'}}>Locked</span>}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-primary">{topic.category}</span> • Posted {new Date(topic.created_at).toLocaleDateString()} • {topic.view_count} views
                </p>
                <p style={{ fontSize: '0.95rem' }}>{topic.content}</p>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  // ─── SHIFTS TAB ───────────────────────────────────────────
  const renderShifts = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{fontFamily:'var(--font-heading)',fontSize:'1.8rem'}}>⏰ Guard Shifts Roster</h2>
        {societyRole === 'admin' && <button className="primary-btn">Assign Shift</button>}
      </div>
      
      <div className="table-responsive">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Guard Name</th>
              <th>Shift Type</th>
              <th>Timings</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shiftsList.length === 0 ? (
              <tr><td colSpan="5" style={{textAlign:'center', padding:'2rem'}}>No shifts assigned for this period</td></tr>
            ) : (
              shiftsList.map(s => (
                <tr key={s.id}>
                  <td>{new Date(s.shift_date).toLocaleDateString()}</td>
                  <td>
                    <div style={{fontWeight: 600}}>{s.guard_name || 'Guard User'}</div>
                    <div style={{fontSize: '0.85rem', color:'var(--text-muted)'}}>{s.phone_number}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{s.shift_type}</span>
                  </td>
                  <td>{s.start_time} - {s.end_time}</td>
                  <td>
                    {s.check_in_time ? (
                      <span style={{color: '#10b981', fontWeight: 600}}>✓ Checked In</span>
                    ) : (
                      <span style={{color: 'var(--text-muted)'}}>Pending</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── RATINGS TAB ──────────────────────────────────────────
  const renderRatings = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{fontFamily:'var(--font-heading)',fontSize:'1.8rem'}}>⭐ Staff & Guard Ratings</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {ratingsList.map(r => (
          <div key={r.id} className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{r.target_name}</div>
              <div style={{ color: '#fbbf24', fontSize: '1.2rem' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
            </div>
            <span className="badge badge-primary" style={{ marginBottom: '1rem' }}>{r.target_type}</span>
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.95rem' }}>"{r.feedback}"</p>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(r.date).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── INTERCOM TAB ─────────────────────────────────────────
  const renderIntercom = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{fontFamily:'var(--font-heading)',fontSize:'1.8rem'}}>📞 Digital SIP Intercom Logs</h2>
      </div>
      <div className="table-responsive">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Caller</th>
              <th>Destination Flat</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {intercomLogs.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.time).toLocaleString()}</td>
                <td>{log.caller}</td>
                <td><strong>{log.flat}</strong></td>
                <td>{log.duration}</td>
                <td>
                  <span style={{ color: log.status === 'completed' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {log.status === 'completed' ? '✓ Completed' : '✗ Missed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── AUDITS TAB ───────────────────────────────────────────
  const renderAudits = () => (
    <div className="glass-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.3rem'}}>🧯 Safety & Facility Audits</h3>
        {societyRole === 'admin' && <button className="btn btn-primary" style={{padding:'0.4rem 1rem'}}>+ New Audit</button>}
      </div>
      <table style={styles.table}>
        <thead><tr><th style={styles.th}>Category</th><th style={styles.th}>Auditor</th><th style={styles.th}>Date</th><th style={styles.th}>Status</th><th style={styles.th}>Issues Found</th><th style={styles.th}>Actions</th></tr></thead>
        <tbody>
          {auditsList.map(a => (
            <tr key={a.id}>
              <td style={{...styles.td,...styles.tdFirst}}><strong>{a.category?.replace('_',' ')}</strong></td>
              <td style={styles.td}>{a.auditor_name}</td>
              <td style={styles.td}>{new Date(a.audit_date).toLocaleDateString()}</td>
              <td style={styles.td}><span style={styles.statusBadge(a.compliance_status)}>{a.compliance_status}</span></td>
              <td style={styles.td}>{a.issues_found > 0 ? <span style={{color:'#ef4444',fontWeight:'bold'}}>{a.issues_found} issues</span> : <span style={{color:'#10b981'}}>None</span>}</td>
              <td style={{...styles.td,...styles.tdLast}}><button className="btn" style={{padding:'0.3rem 0.8rem',fontSize:'0.8rem',background:'rgba(255,255,255,0.1)',color:'#fff'}}>View Report</button></td>
            </tr>
          ))}
          {auditsList.length === 0 && <tr><td colSpan="6" style={{...styles.td,...styles.tdFirst,...styles.tdLast,textAlign:'center'}}>No audits found</td></tr>}
        </tbody>
      </table>
    </div>
  );

  // ─── DOCUMENT TEMPLATES TAB ───────────────────────────────
  const renderTemplates = () => (
    <div className="glass-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.3rem'}}>📄 Document Templates & NOCs</h3>
          <p style={{fontSize:'0.9rem',opacity:0.8}}>Automated official society letters and certificates</p>
        </div>
      </div>
      
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',gap:'1rem'}}>
        {templatesList.map(t => (
          <div key={t.id} style={{background:'rgba(255,255,255,0.05)',padding:'1.5rem',borderRadius:'var(--radius-sm)',border:'1px solid rgba(255,255,255,0.1)',transition:'transform 0.2s',cursor:'pointer'}} onClick={() => setSelectedTemplate(t)} onMouseOver={e=>e.currentTarget.style.transform='translateY(-5px)'} onMouseOut={e=>e.currentTarget.style.transform='none'}>
            <div style={{fontSize:'2rem',marginBottom:'1rem'}}>{t.type==='financial'?'🏦':t.type==='identity'?'🛂':t.type==='residential'?'🏠':'🛠️'}</div>
            <h4 style={{fontSize:'1.1rem',marginBottom:'0.5rem',fontFamily:'var(--font-heading)'}}>{t.name}</h4>
            <p style={{fontSize:'0.85rem',opacity:0.7,marginBottom:'1.5rem'}}>{t.description}</p>
            <button className="btn btn-primary" style={{width:'100%',padding:'0.5rem'}}>Generate NOC</button>
          </div>
        ))}
      </div>

      {selectedTemplate && (
        <div style={styles.emergencyOverlay}>
          <div style={{...styles.modal,maxWidth:'500px'}}>
            <h2 style={{fontFamily:'var(--font-heading)',fontSize:'1.5rem',marginBottom:'0.5rem',color:'var(--primary)'}}>Generate {selectedTemplate.name}</h2>
            <p style={{opacity:0.8,marginBottom:'1.5rem',fontSize:'0.9rem'}}>This will automatically fill the template with your registered details and the society's official letterhead.</p>
            <div className="form-group">
              <label className="form-label">Purpose of Issue (Required)</label>
              <textarea className="form-input" rows="3" placeholder="State the reason for requesting this document..."></textarea>
            </div>
            <div style={{display:'flex',gap:'1rem',marginTop:'2rem'}}>
              <button className="btn btn-primary" style={{flex:1}} onClick={()=>{flash('✅ Document Generated & Emailed to you!');setSelectedTemplate(null);}}>Generate & Download</button>
              <button className="btn" style={{flex:1,background:'rgba(255,255,255,0.1)',color:'#fff'}} onClick={()=>setSelectedTemplate(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Tab Content Router ───────────────────────────────────
  const renderTabContent = () => {
    switch(activeTab) {
      case 'visitors': return renderVisitors();
      case 'members': return renderMembers();
      case 'messages': return renderMessages();
      case 'reminders': return renderReminders();
      case 'staff': return renderStaff();
      case 'bills': return renderBills();
      case 'parking': return renderParking();
      case 'amenities': return renderAmenities();
      case 'complaints': return renderComplaints();
      case 'packages': return renderPackages();
      case 'polls': return renderPolls();
      case 'emergency': return renderEmergency();
      case 'directory': return renderDirectory();
      case 'events': return renderEvents();
      case 'notices': return renderNotices();
      case 'settings': return renderSettings();
      // New Phase features
      case 'dashboard': return renderDashboard();
      case 'forum': return renderForum();
      case 'shifts': return renderShifts();
      case 'ratings': return renderRatings();
      case 'intercom': return renderIntercom();
      case 'agm': return renderAGM();
      case 'budget': return renderBudget();
      case 'audits': return renderAudits();
      case 'templates': return renderTemplates();
      default: return null;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // DOORBELL MODAL
  // ═══════════════════════════════════════════════════════════
  const DoorbellModal = () => {
    if (!doorbellData) return null;
    return (
      <div style={styles.doorbellOverlay} onClick={e=>e.stopPropagation()}>
        <div style={{textAlign:'center',color:'#fff',maxWidth:'500px',padding:'2rem'}}>
          <div style={{fontSize:'5rem',marginBottom:'1rem',animation:'float 1s ease-in-out infinite'}}>🔔</div>
          <h2 style={{fontFamily:'var(--font-heading)',fontSize:'2rem',marginBottom:'0.5rem'}}>Visitor at Your Door!</h2>
          <p style={{fontSize:'1.1rem',marginBottom:'1.5rem',opacity:0.9}}>"{doorbellData.visitorName}" wants to visit flat {doorbellData.flatNumber}</p>
          <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'var(--radius)',padding:'1.5rem',marginBottom:'1.5rem',textAlign:'left'}}>
            <div style={{marginBottom:'0.5rem'}}><strong>Name:</strong> {doorbellData.visitorName}</div>
            <div style={{marginBottom:'0.5rem'}}><strong>Phone:</strong> {doorbellData.visitorPhone}</div>
            <div style={{marginBottom:'0.5rem'}}><strong>Purpose:</strong> {doorbellData.purpose}</div>
            <div style={{marginBottom:'0.5rem'}}><strong>Guard:</strong> {doorbellData.guardName}</div>
            <div style={{display:'flex',gap:'1rem',marginTop:'1rem',justifyContent:'center'}}>
              {doorbellData.visitorPhoto && <img src={doorbellData.visitorPhoto} alt="Visitor" style={{width:'140px',height:'105px',borderRadius:'var(--radius-sm)',objectFit:'cover'}} />}
              {doorbellData.idCardPhoto && <img src={doorbellData.idCardPhoto} alt="ID Card" style={{width:'140px',height:'105px',borderRadius:'var(--radius-sm)',objectFit:'cover'}} />}
            </div>
          </div>
          <div style={{display:'flex',gap:'1rem',justifyContent:'center'}}>
            <button className="btn" style={{padding:'1rem 3rem',fontSize:'1.2rem',fontWeight:900,background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',borderRadius:'var(--radius)',boxShadow:'0 12px 30px rgba(16,185,129,0.5)'}} onClick={async()=>{await api(`/visitors/${doorbellData.visitorId}/approve`,{method:'PUT'});setDoorbellData(null);flash('✅ Approved');load('visitors');}}>✅ ALLOW ENTRY</button>
            <button className="btn" style={{padding:'1rem 3rem',fontSize:'1.2rem',fontWeight:900,background:'linear-gradient(135deg,#ef4444,#dc2626)',color:'#fff',borderRadius:'var(--radius)',boxShadow:'0 12px 30px rgba(239,68,68,0.5)'}} onClick={async()=>{await api(`/visitors/${doorbellData.visitorId}/decline`,{method:'PUT'});setDoorbellData(null);flash('❌ Declined');load('visitors');}}>❌ DECLINE</button>
          </div>
          <button style={{marginTop:'1.5rem',background:'transparent',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',padding:'0.5rem 1.5rem',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'0.85rem'}} onClick={()=>setDoorbellData(null)}>Dismiss</button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // EMERGENCY ALARM MODAL
  // ═══════════════════════════════════════════════════════════
  const EmergencyModal = () => {
    if (!emergencyAlert) return null;
    return (
      <div style={styles.emergencyOverlay}>
        <div style={{textAlign:'center',color:'#fff'}}>
          <div style={{fontSize:'6rem',animation:'pulse 0.5s ease-in-out infinite alternate'}}>🚨</div>
          <h1 style={{fontFamily:'var(--font-heading)',fontSize:'3rem',margin:'1rem 0'}}>EMERGENCY!</h1>
          <h2 style={{fontSize:'1.5rem',textTransform:'uppercase'}}>{emergencyAlert.alertType?.replace('_',' ')}</h2>
          {emergencyAlert.description && <p style={{fontSize:'1.1rem',marginTop:'0.5rem'}}>{emergencyAlert.description}</p>}
          <p style={{marginTop:'0.5rem',opacity:0.8}}>Flat: {emergencyAlert.flatNumber} • By: {emergencyAlert.triggeredBy}</p>
          <button className="btn" style={{marginTop:'2rem',padding:'1rem 3rem',fontSize:'1.2rem',background:'#fff',color:'#dc2626',fontWeight:900,borderRadius:'var(--radius)'}} onClick={()=>setEmergencyAlert(null)}>ACKNOWLEDGE</button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // GUARD REMINDER ALARM MODAL
  // ═══════════════════════════════════════════════════════════
  const ReminderModal = () => {
    if (!reminderAlarm) return null;
    return (
      <div style={{...styles.modal,background:'rgba(249,115,22,0.95)'}}>
        <div style={{textAlign:'center',color:'#fff',maxWidth:'400px'}}>
          <div style={{fontSize:'5rem',animation:'float 0.8s ease-in-out infinite'}}>⏰</div>
          <h2 style={{fontFamily:'var(--font-heading)',fontSize:'2rem',margin:'1rem 0'}}>REMINDER!</h2>
          <h3>{reminderAlarm.title}</h3>
          {reminderAlarm.description && <p style={{marginTop:'0.5rem',opacity:0.9}}>{reminderAlarm.description}</p>}
          <p style={{fontSize:'0.85rem',marginTop:'0.5rem',opacity:0.7}}>Set by {reminderAlarm.createdBy}</p>
          <button className="btn" style={{marginTop:'2rem',padding:'1rem 3rem',fontSize:'1.1rem',background:'#fff',color:'#f97316',fontWeight:900,borderRadius:'var(--radius)'}} onClick={()=>setReminderAlarm(null)}>DISMISS</button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════
  if (!mounted) {
    return (
      <div style={styles.page}>
        <div className="container">
          {/* Header */}
          <div style={styles.header} className="animate-fade-in">
            <span className="section-tag">🏢 SOCIETY MANAGEMENT</span>
            <h1 style={{fontFamily:'var(--font-heading)',fontSize:'2.5rem',marginBottom:'0.5rem'}}>
              <span className="gradient-text">Society Management Platform</span>
            </h1>
            <p className="text-muted" style={{maxWidth:'600px',margin:'0 auto'}}>
              Complete society management — visitors, bills, complaints, amenities, and more
            </p>
          </div>
          <div style={{textAlign:'center',padding:'4rem'}}>
            <div style={{display:'inline-block',width:'32px',height:'32px',border:'3px solid var(--border)',borderTopColor:'var(--primary)',borderRadius:'50%',animation:'spinSlow 0.8s linear infinite'}} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div className="container" suppressHydrationWarning>
        {/* Header */}
        <div style={styles.header} className="animate-fade-in">
          <span className="section-tag">🏢 SOCIETY MANAGEMENT</span>
          <h1 style={{fontFamily:'var(--font-heading)',fontSize:'2.5rem',marginBottom:'0.5rem'}}>
            <span className="gradient-text">Society Management Platform</span>
          </h1>
          <p className="text-muted" style={{maxWidth:'600px',margin:'0 auto'}}>
            Complete society management — visitors, bills, complaints, amenities, and more
          </p>
        </div>

        {/* Flash Message */}
        {msg && (
          <div style={{position:'fixed',top:'100px',left:'50%',transform:'translateX(-50%)',zIndex:9999,padding:'0.75rem 2rem',borderRadius:'var(--radius-sm)',background:'var(--primary)',color:'#fff',fontWeight:700,boxShadow:'0 8px 32px rgba(99,102,241,0.4)',animation:'fadeInDown 0.3s',fontFamily:'var(--font-heading)'}}>
            {msg}
          </div>
        )}

        {/* Role Selector */}
        <div style={styles.roleBar} suppressHydrationWarning>
          {[{id:'admin',icon:'👑',label:'Society Admin'},{id:'guard',icon:'🛡️',label:'Security Guard'},{id:'resident',icon:'🏠',label:'Resident'}].map(r=>(
            <button key={r.id} suppressHydrationWarning style={styles.roleBtn(societyRole===r.id)} onClick={()=>setSocietyRole(r.id)}>
              {r.icon} {r.label}
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabs} suppressHydrationWarning>
          {(tabsByRole[societyRole]||[]).map(t=>(
            <button key={t.id} suppressHydrationWarning style={styles.tab(activeTab===t.id)} onClick={()=>setActiveTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div style={{textAlign:'center',padding:'2rem'}}>
            <div style={{display:'inline-block',width:'32px',height:'32px',border:'3px solid var(--border)',borderTopColor:'var(--primary)',borderRadius:'50%',animation:'spinSlow 0.8s linear infinite'}} />
          </div>
        )}

        {/* Tab Content */}
        <div className="animate-fade-in" key={`${societyRole}-${activeTab}`}>
          {renderTabContent()}
        </div>
      </div>

      {/* Modals */}
      <DoorbellModal />
      <EmergencyModal />
      <ReminderModal />
    </div>
  );
}
