'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import JobsTab from '../components/tabs/JobsTab';
import DeliveryTab from '../components/tabs/DeliveryTab';
import WalletTab from '../components/tabs/WalletTab';
import CommunityTab from '../components/tabs/CommunityTab';
import SocietyTab from '../components/tabs/SocietyTab';
import EventsTab from '../components/tabs/EventsTab';
import MarketplaceTab from '../components/tabs/MarketplaceTab';
import MedicalTab from '../components/tabs/MedicalTab';
import SubscriptionsTab from '../components/tabs/SubscriptionsTab';
import PremiumTab from '../components/tabs/PremiumTab';
import SOSTab from '../components/tabs/SOSTab';
import CRMTab from '../components/tabs/CRMTab';
import { API_BASE, getAuthHeaders } from '../lib/api';
import DashboardTab from '../components/tabs/DashboardTab';
import UsersTab from '../components/tabs/UsersTab';
import ShopsTab from '../components/tabs/ShopsTab';
import FranchiseTab from '../components/tabs/FranchiseTab';
import TerritoryTab from '../components/tabs/TerritoryTab';
import RevenueTab from '../components/tabs/RevenueTab';
import PropertiesTab from '../components/tabs/PropertiesTab';
import SettingsTab from '../components/tabs/SettingsTab';
import RBACTab from '../components/tabs/RBACTab';
import AuditTab from '../components/tabs/AuditTab';
import ShopCategoriesTab from '../components/tabs/ShopCategoriesTab';
import ChefTab from '../components/tabs/ChefTab';
import BillsTab from '../components/tabs/BillsTab';
import AdCampaignsTab from '../components/tabs/AdCampaignsTab';



const authHeaders = getAuthHeaders;

// ─── Data is now fetched from real backend API ───────────────────────────────

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    'Active': { bg: '#052e16', color: '#4ade80' },
    'Pending': { bg: '#431407', color: '#fb923c' },
    'Onboarding': { bg: '#1e1b4b', color: '#a5b4fc' },
    'Suspended': { bg: '#450a0a', color: '#f87171' },
    'Open': { bg: '#042f2e', color: '#5eead4' },
    'Active (Pilot)': { bg: '#052e16', color: '#4ade80' },
    'Franchise Assigned': { bg: '#1e1b4b', color: '#a5b4fc' },
    'Audit Pending': { bg: '#431407', color: '#fb923c' },
    'Accepting Leads': { bg: '#042f2e', color: '#5eead4' },
  };
  const style = map[status] || { bg: '#1e293b', color: '#94a3b8' };
  
  return (
    <span style={{ background: style.bg, color: style.color, padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
};

const Stat = ({ label, value, diff, icon, color }) => (
  <div style={{ background: '#1e293b', padding: '1.75rem', borderRadius: '1rem', border: '1px solid #334155', borderLeft: `5px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '2.5rem', opacity: 0.1 }}>{icon}</div>
    <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{label}</p>
    <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', margin: '0 0 0.3rem' }}>{value}</h2>
    <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 700 }}>{diff}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [platformShare, setPlatformShare] = useState(50);
  const [franchiseShare, setFranchiseShare] = useState(25);
  const [agentShare, setAgentShare] = useState(15);
  const [miscShare, setMiscShare] = useState(10);
  const [pendingShops, setPendingShops] = useState([]);
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [properties, setProperties] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [territories, setTerritories] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newZone, setNewZone] = useState({ zone: '', pincode: '', district: '', state: 'Maharashtra', partner: '' });
  const [zoneAdded, setZoneAdded] = useState(false);
  const [franchisePartners, setFranchisePartners] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [territorySearch, setTerritorySearch] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('all');
  const [editTerritory, setEditTerritory] = useState(null);
  const [assignFranchiseModal, setAssignFranchiseModal] = useState(null);
  const [selectedBulk, setSelectedBulk] = useState([]);
  const [territoryTogglingId, setTerritoryTogglingId] = useState(null);
  const [userFilterZone, setUserFilterZone] = useState('All');

  const totalShare = +platformShare + +franchiseShare + +agentShare + +miscShare;

  // Fetch territories from API
  const fetchTerritories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/regions`, { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTerritories((Array.isArray(data) ? data : []).map(d => ({
          id: d.id, zone: d.name, pincode: d.pincode || '', district: d.district || '',
          state: d.state || '', is_active: d.is_active, status: d.is_active ? 'Active' : 'Inactive',
          partner: '—', shops: d.shops_count || 0, users: d.users_count || 0, latitude: d.latitude, longitude: d.longitude,
          radius_km: d.radius_km, city: d.city, features: d.features_json ? JSON.parse(d.features_json) : { delivery: true, jobs: true, rentals: true, events: true, services: true }
        })));
      }
    } catch(e) { console.error(e); }
  }, []);

  // Fetch franchise partners
  const fetchFranchisePartners = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/franchises`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setFranchisePartners(data.data);
      else if (Array.isArray(data)) setFranchisePartners(data);
    } catch(e) { console.error(e); }
  }, []);

  // Fetch summary stats
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSummaryStats(data.data);
    } catch(e) { console.error(e); }
  }, []);

  const [revenueChart, setRevenueChart] = useState([]);
  
  const fetchRevenueChart = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/revenue/chart`, { headers: authHeaders() });
      const data = await res.json();
      if (data) setRevenueChart(data);
    } catch(e) { console.error(e); }
  }, []);

  // Fetch real users from backend
  const fetchUsers = useCallback(async (page = 1, search = '') => {
    try {
      const res = await fetch(`${API_BASE}/admin/users?page=${page}&limit=50&search=${encodeURIComponent(search)}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.users) {
        setUsers((Array.isArray(data.users) ? data.users : []).map(u => ({
          ...u,
          name: u.full_name || u.name || 'Unknown',
          phone: u.phone_number || u.phone || '',
          status: u.is_banned ? 'Suspended' : (u.is_active ? 'Active' : 'Inactive'),
          zone: u.region_id || '—',
          wallet: '—',
          joined: u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
        })));
        setUsersTotal(data.total || 0);
      } else if (Array.isArray(data)) {
        setUsers((Array.isArray(data) ? data : []).map(u => ({
          ...u,
          name: u.full_name || u.name || 'Unknown',
          phone: u.phone_number || u.phone || '',
          status: u.is_banned ? 'Suspended' : (u.is_active ? 'Active' : 'Inactive'),
          zone: u.region_id || '—',
          wallet: '—',
          joined: u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
        })));
      }
    } catch(e) { console.error('Failed to fetch users:', e); }
  }, []);

  // Fetch real shops from backend
  const fetchShops = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/shops?limit=100`, { headers: authHeaders() });
      const data = await res.json();
      const shopList = data.data || data.shops || (Array.isArray(data) ? data : []);
      const mapped = (Array.isArray(shopList) ? shopList : []).map(s => ({
        ...s,
        name: s.shop_name || s.name || 'Unknown Shop',
        owner: s.owner_name || '—',
        category: s.category_name || s.category || '—',
        pincode: s.pincode || '—',
        zone: s.region_name || '—',
        status: s.approval_status === 'approved' ? 'Active' : s.approval_status === 'pending' ? 'Pending' : s.approval_status || 'Unknown',
        orders: s.total_orders || 0,
        revenue: s.total_revenue ? `₹${Number(s.total_revenue).toLocaleString()}` : '₹0'
      }));
      setShops(mapped);
      setPendingShops(mapped.filter(s => s.status === 'Pending' || s.approval_status === 'pending'));
    } catch(e) { console.error('Failed to fetch shops:', e); }
  }, []);

  // Fetch real properties from backend
  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/properties?limit=100`, { headers: authHeaders() });
      const data = await res.json();
      const propList = data.data || data.properties || (Array.isArray(data) ? data : []);
      setProperties((Array.isArray(propList) ? propList : []).map(p => ({
        ...p,
        title: p.title || p.name || 'Property',
        landlord: p.owner_name || p.landlord || '—',
        rent: p.price ? `₹${Number(p.price).toLocaleString()}` : '—',
        type: p.listing_type || p.type || '—',
        zone: p.region_name || p.zone || '—',
        status: p.is_active ? 'Active' : 'Audit Pending'
      })));
    } catch(e) { console.error('Failed to fetch properties:', e); }
  }, []);

  useEffect(() => {
    fetchTerritories();
    fetchFranchisePartners();
    fetchSummary();
    fetchRevenueChart();
    fetchUsers(1);
    fetchShops();
    fetchProperties();
  }, [fetchTerritories, fetchFranchisePartners, fetchSummary, fetchRevenueChart, fetchUsers, fetchShops]);


  // Toggle territory ON/OFF
  const toggleTerritory = async (id) => {
    setTerritoryTogglingId(id);
    try {
      const res = await fetch(`${API_BASE}/admin/regions/${id}/toggle`, { method: 'PUT', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setTerritories(prev => prev.map(t => t.id === id ? { ...t, is_active: data.is_active, status: data.is_active ? 'Active' : 'Inactive' } : t));
        fetchSummary();
      }
    } catch(e) { console.error(e); }
    setTerritoryTogglingId(null);
  };

  // Save territory edit
  const saveTerritory = async () => {
    if (!editTerritory) return;
    try {
      const res = await fetch(`${API_BASE}/admin/regions/${editTerritory.id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ name: editTerritory.zone, pincode: editTerritory.pincode, district: editTerritory.district, state: editTerritory.state, is_active: editTerritory.is_active })
      });
      const data = await res.json();
      
      if (editTerritory.features) {
        await fetch(`${API_BASE}/admin/regions/${editTerritory.id}/features`, {
          method: 'PUT', headers: authHeaders(),
          body: JSON.stringify({ features: editTerritory.features })
        });
      }
      
      if (data.success) { fetchTerritories(); setEditTerritory(null); }
    } catch(e) { console.error(e); }
  };

  // Assign franchise to territory
  const assignFranchise = async (territoryId, franchiseId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/regions/${territoryId}/assign-franchise`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ franchise_id: franchiseId })
      });
      const data = await res.json();
      if (data.success) { fetchTerritories(); fetchFranchisePartners(); setAssignFranchiseModal(null); alert('Franchise assigned successfully!'); }
    } catch(e) { console.error(e); }
  };

  // Bulk toggle
  const bulkToggle = async (activate) => {
    for (const id of selectedBulk) {
      const t = territories.find(x => x.id === id);
      if (t && ((activate && !t.is_active) || (!activate && t.is_active))) {
        await fetch(`${API_BASE}/admin/regions/${id}/toggle`, { method: 'PUT', headers: authHeaders() });
      }
    }
    fetchTerritories(); setSelectedBulk([]); fetchSummary();
  };

  const approveShop = async (id) => {
    try {
      await fetch(`${API_BASE}/admin/approvals/shop/${id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ status: 'approved' })
      });
      fetchShops();
      fetchSummary();
    } catch(e) { console.error(e); }
  };

  const rejectShop = async (id) => {
    try {
      await fetch(`${API_BASE}/admin/approvals/shop/${id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ status: 'rejected' })
      });
      fetchShops();
    } catch(e) { console.error(e); }
  };

  const toggleUserStatus = async (id) => {
    const user = users.find(u => u.id === id);
    const isBanned = user?.status === 'Active' ? true : false;
    try {
      await fetch(`${API_BASE}/admin/users/${id}/ban`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ is_banned: isBanned })
      });
      fetchUsers(usersPage, userSearch);
    } catch(e) { console.error(e); }
  };

  const changeUserRole = async (id, role) => {
    try {
      await fetch(`${API_BASE}/admin/users/${id}/role`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ role })
      });
      fetchUsers(usersPage, userSearch);
    } catch(e) { console.error(e); }
  };

  const addTerritory = (e) => {
    e.preventDefault();
    fetch(`${API_BASE}/admin/regions`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ name: newZone.zone, pincode: newZone.pincode, district: newZone.district, state: newZone.state || 'Maharashtra', radiusKm: 5.0, is_active: newZone.is_active ? 1 : 0 })
    })
    .then(res => res.json())
    .then(data => {
      if(data && !data.error) {
        fetchTerritories(); fetchSummary();
        setNewZone({ zone: '', pincode: '', district: '', state: 'Maharashtra', partner: '', is_active: true });
        setZoneAdded(true);
        setTimeout(() => setZoneAdded(false), 3000);
      } else { alert(data.error || 'Failed to add zone'); }
    })
    .catch(console.error);
  };

  const approveProperty = async (id) => {
    try {
      await fetch(`${API_BASE}/admin/approvals/property/${id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ status: 'approved' })
      });
      setProperties(properties.map(p => p.id === id ? { ...p, status: 'Active' } : p));
    } catch(e) { console.error(e); }
  };

  // --- State for new admin tabs ---
  const [adminJobs, setAdminJobs] = useState([]);
  const [adminDelivery, setAdminDelivery] = useState({});
  const [adminWalletStats, setAdminWalletStats] = useState(null);
  const [adminAuditLogs, setAdminAuditLogs] = useState([]);
  const [adminSkilledBookings, setAdminSkilledBookings] = useState([]);

  useEffect(() => {
    if (activeTab === 'audit' && adminAuditLogs.length === 0) {
      fetch(`${API_BASE}/admin/audit`, { headers: authHeaders() })
        .then(r => r.json())
        .then(data => setAdminAuditLogs(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])))
        .catch(console.error);
    }
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: '📊' },
    { id: 'users', label: 'Users Management', icon: '👤' },
    { id: 'shops', label: 'Shop Approvals', icon: '🏪' },
    { id: 'franchise', label: 'Franchise Partners', icon: '🤝' },
    { id: 'territory', label: 'Territory Control', icon: '🗺️' },
    { id: 'revenue', label: 'Revenue & Commission', icon: '💰' },
    { id: 'jobs', label: 'Jobs & Services', icon: '💼' },
    { id: 'delivery', label: 'Delivery Fleet', icon: '🚴' },
    { id: 'wallet', label: 'Wallet & Transactions', icon: '💳' },
    { id: 'community', label: 'Community Moderation', icon: '📢' },
    { id: 'society', label: 'Society Management', icon: '🏘️' },
    { id: 'events', label: 'Event Management', icon: '🎉' },
    { id: 'marketplace', label: 'Marketplace Audit', icon: '🛒' },
    { id: 'medical', label: 'Medical & Health', icon: '🏥' },
    { id: 'subscriptions', label: 'Subscription Plans', icon: '📦' },
    { id: 'premium', label: 'Premium Members', icon: '👑' },
    { id: 'sos', label: 'SOS & Emergency', icon: '🚨' },
    { id: 'properties', label: 'House Rental Audit', icon: '🏢' },
    { id: 'rbac', label: 'RBAC & Roles', icon: '🔐' },
    { id: 'audit', label: 'Audit Logs', icon: '📋' },
    { id: 'crm', label: 'CRM & Engagement', icon: '📈' },
    { id: 'settings', label: 'Platform Settings', icon: '⚙️' },
  
    { id: 'shop-categories', label: 'Shop Categories', icon: '🏪' },
    { id: 'chef', label: 'Home Chef & Tiffin', icon: '👨‍🍳' },
    { id: 'bills', label: 'Utility Bills', icon: '🧾' },
    { id: 'ads', label: 'Ad Campaigns', icon: '📢' },];

  const tabStyle = (id) => ({
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.8rem 1rem', borderRadius: '0.5rem',
    background: activeTab === id ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
    color: activeTab === id ? '#ffffff' : '#94a3b8',
    border: 'none', textAlign: 'left', cursor: 'pointer',
    fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
    width: '100%',
  });

  const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
  const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '0.95rem' };
  const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
  const btnSuccess = { ...btnPrimary, background: '#10b981' };
  const btnDanger = { ...btnPrimary, background: '#ef4444' };
  const btnWarning = { ...btnPrimary, background: '#f97316' };

  const { admin, loading } = useAdminAuth();

  React.useEffect(() => {
    if (!loading && !admin) {
      window.location.href = '/login';
    }
  }, [admin, loading]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <p style={{ color: '#94a3b8' }}>Loading Admin Console...</p>
      </div>
    );
  }

  if (!admin) return null;

  const props = {
    summaryStats, pendingShops, shops, platformShare, franchiseShare, agentShare, miscShare,
    franchisePartners, usersTotal, userSearch, users, usersPage, territorySearch, territoryFilter,
    selectedBulk, territories, properties, revenueChart, newZone, editTerritory,
    approveShop, rejectShop, fetchUsers, setUserSearch, changeUserRole, toggleUserStatus,
    setUsersPage, bulkToggle, setSelectedBulk,
    adminJobs, adminDelivery, adminWalletStats, adminAuditLogs, adminSkilledBookings,
    activeTab, setActiveTab,
    setTerritorySearch, setTerritoryFilter, toggleTerritory, territoryTogglingId,
    saveTerritory, assignFranchiseModal, setAssignFranchiseModal, assignFranchise,
    zoneAdded, addTerritory, setNewZone, API_BASE, authHeaders, fetchFranchisePartners,
    fetchTerritories, fetchSummary, setUserFilterZone, approveProperty
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc', background: '#0f172a', minHeight: '100vh', display: 'flex' }}>

      {/* Sidebar */}
      <aside style={{ width: '290px', background: '#0b1120', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', padding: '2rem 1.25rem', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', padding: '0 0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #4f46e5, #f97316)', padding: '0.5rem 0.7rem', borderRadius: '0.75rem', fontSize: '1.25rem' }}>🏘️</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>LocalSampark</p>
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>God-Mode Admin Panel</p>
          </div>
        </div>

        {/* Zone Info — Dynamic */}
        <div style={{ background: '#1e293b', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
          <p style={{ color: '#94a3b8', margin: '0 0 0.3rem' }}>Platform Overview</p>
          <p style={{ fontWeight: 700, color: '#f8fafc', margin: 0 }}>📍 {summaryStats ? `${summaryStats.activeRegions} Active / ${summaryStats.totalRegions} Total Zones` : 'Loading...'}</p>
          <p style={{ color: '#4ade80', margin: '0.2rem 0 0', fontWeight: 600 }}>● {summaryStats ? `${summaryStats.totalUsers.toLocaleString()} Users — ${summaryStats.totalShops} Shops` : '...'}</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, overflowY: 'auto' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => { if (item.isExternal) window.open(item.href, '_blank'); else setActiveTab(item.id); }} style={tabStyle(item.id)}>
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Admin badge */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#1e293b', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>A</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Super Admin</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Full Access</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', maxHeight: '100vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #1e293b' }}>
          <div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0, textTransform: 'capitalize' }}>
              {navItems.find(n => n.id === activeTab)?.icon} {navItems.find(n => n.id === activeTab)?.label}
            </h1>
            <p style={{ color: '#64748b', margin: '0.3rem 0 0', fontSize: '0.9rem' }}>LocalSampark Platform Control — Pune Pilot v2.0</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ background: '#10b981', color: '#fff', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 700 }}>● System Online</span>
            <span style={{ background: '#1e293b', color: '#94a3b8', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.8rem' }}>v2.0.1</span>
          </div>
        </div>

        {/* ─── DASHBOARD TAB ──────────────────────────────── */}
        {activeTab === 'dashboard' && <DashboardTab {...props} />}
        {/* ─── USERS TAB ──────────────────────────────── */}
        {activeTab === 'users' && <UsersTab {...props} />}
        {/* ─── SHOPS TAB ──────────────────────────────── */}
        {activeTab === 'shops' && <ShopsTab {...props} />}
        {/* ─── FRANCHISE TAB ──────────────────────────────── */}
        {activeTab === 'franchise' && <FranchiseTab {...props} />}
        {/* ─── TERRITORY TAB ──────────────────────────────── */}
        {activeTab === 'territory' && <TerritoryTab {...props} />}
        {/* ─── REVENUE TAB ──────────────────────────────────── */}
        {activeTab === 'revenue' && (
           <RevenueTab 
             API_BASE={API_BASE} authHeaders={authHeaders} 
             platformShare={platformShare} setPlatformShare={setPlatformShare}
             franchiseShare={franchiseShare} setFranchiseShare={setFranchiseShare}
             agentShare={agentShare} setAgentShare={setAgentShare}
             miscShare={miscShare} setMiscShare={setMiscShare}
             revenueChart={revenueChart} setRevenueChart={setRevenueChart}
           />
        )}

        {/* ─── PROPERTIES TAB ───────────────────────────────── */}
        {activeTab === 'properties' && <PropertiesTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── SETTINGS TAB ─────────────────────────────────── */}
        {activeTab === 'settings' && <SettingsTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── JOBS & SERVICES TAB ────────────────────────────── */}
        {activeTab === 'jobs' && <JobsTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── DELIVERY FLEET TAB ─────────────────────────────── */}
        {activeTab === 'delivery' && <DeliveryTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── WALLET & TRANSACTIONS TAB ──────────────────────── */}
        {activeTab === 'wallet' && <WalletTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── COMMUNITY MODERATION TAB ───────────────────────── */}
        {activeTab === 'community' && <CommunityTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── SOCIETY MANAGEMENT TAB ─────────────────────────── */}
        {activeTab === 'society' && <SocietyTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── EVENT MANAGEMENT TAB ───────────────────────────── */}
        {activeTab === 'events' && <EventsTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── MARKETPLACE AUDIT TAB ──────────────────────────── */}
        {activeTab === 'marketplace' && <MarketplaceTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── MEDICAL & HEALTH TAB ──────────────────────────── */}
        {activeTab === 'medical' && <MedicalTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── SUBSCRIPTION PLANS TAB ─────────────────────────── */}
        {activeTab === 'subscriptions' && <SubscriptionsTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── PREMIUM MEMBERS TAB ────────────────────────────── */}
        {activeTab === 'premium' && <PremiumTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── SOS & EMERGENCY TAB ────────────────────────────── */}
        {activeTab === 'sos' && <SOSTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── RBAC & ROLES TAB ──────────────────────────────── */}
        {activeTab === 'rbac' && <RBACTab franchisePartners={franchisePartners} />}

        {/* ─── AUDIT LOGS TAB ─────────────────────────────────── */}
        {activeTab === 'audit' && <AuditTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── CRM & ENGAGEMENT TAB ───────────────────────────── */}
        {activeTab === 'crm' && <CRMTab API_BASE={API_BASE} authHeaders={authHeaders} />}

        {/* ─── NEW CATEGORIES TABS ──────────────────────────── */}
        {activeTab === 'shop-categories' && <ShopCategoriesTab API_BASE={API_BASE} authHeaders={authHeaders} />}
        {activeTab === 'chef' && <ChefTab API_BASE={API_BASE} authHeaders={authHeaders} />}
        {activeTab === 'bills' && <BillsTab API_BASE={API_BASE} authHeaders={authHeaders} />}
        {activeTab === 'ads' && <AdCampaignsTab API_BASE={API_BASE} authHeaders={authHeaders} />}

      </main>
    </div>
  );
}
