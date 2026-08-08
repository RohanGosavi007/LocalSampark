'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import Webcam from 'react-webcam';
import Link from 'next/link';
import { ShieldAlert, Users, Car, CheckCircle, Video, PhoneCall, LogOut, Search, Clock, Box, Shield, X, Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';
import WebRTCIntercom from '../components/WebRTCIntercom';

export default function SecurityDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('visitors');
  
  // Modal states
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isIntercomModalOpen, setIsIntercomModalOpen] = useState(false);
  const [intercomTargetFlat, setIntercomTargetFlat] = useState('');
  
  // Data States
  const [visitors, setVisitors] = useState([]);
  const [packages, setPackages] = useState([]);
  const [vehicleLogs, setVehicleLogs] = useState([]);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [staffLogs, setStaffLogs] = useState([]);
  
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [vehicleResult, setVehicleResult] = useState(null);
  
  // Form States
  const [visitorForm, setVisitorForm] = useState({ name: '', phone: '', flat: '', purpose: 'Guest/Relative' });
  const [deliveryForm, setDeliveryForm] = useState({ company: 'Swiggy', vehicleNumber: '', flat: '' });
  const [packageForm, setPackageForm] = useState({ courierName: 'Amazon', flatNumber: '' });
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

  // Webcam & Intercom refs
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const intercomRef = useRef(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef]);

  // Initial Fetch
  useEffect(() => {
    if (!token) return;
    
    const fetchDashboardData = async () => {
      try {
        // Fetch Today's Visitors
        const visRes = await fetch(`${API_URL}/api/v1/society-management/visitors/today`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (visRes.ok) {
          const visData = await visRes.json();
          setVisitors(visData.data || []);
        }

        // Fetch Pending Packages
        const pkgRes = await fetch(`${API_URL}/api/v1/society-management/packages/pending`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (pkgRes.ok) {
          const pkgData = await pkgRes.json();
          setPackages(pkgData.data || []);
        }

        // Fetch Vehicle Logs
        const vehLogRes = await fetch(`${API_URL}/api/v1/society-guard/gate/vehicle-log?societyId=1`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (vehLogRes.ok) {
          const vData = await vehLogRes.json();
          setVehicleLogs(vData.data || []);
        }

        // Fetch Delivery Logs
        const delLogRes = await fetch(`${API_URL}/api/v1/society-guard/gate/utility-history?societyId=1`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (delLogRes.ok) {
          const dData = await delLogRes.json();
          setDeliveryLogs(dData.data || []);
        }
        
        // Fetch Staff Attendance
        const staffRes = await fetch(`${API_URL}/api/v1/society-management/staff/attendance/today`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (staffRes.ok) {
          const sData = await staffRes.json();
          setStaffLogs(sData.data || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    
    fetchDashboardData();
  }, [token, activeTab]);

  const handleLookupVehicle = async () => {
    if (!vehicleQuery) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/society-guard/gate/lookup-vehicle?vehicleNumber=${vehicleQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVehicleResult(data.data || { notFound: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleVisitorSubmit = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/society-management/visitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...visitorForm, photo: imgSrc })
      });
      if (res.ok) {
        setIsVisitorModalOpen(false);
        // Refresh visitors
        const visRes = await fetch(`${API_URL}/api/v1/society-management/visitors/today`, { headers: { Authorization: `Bearer ${token}` } });
        const visData = await visRes.json();
        setVisitors(visData.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeliverySubmit = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/society-guard/utility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(deliveryForm)
      });
      if (res.ok) {
        setIsDeliveryModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckOutVisitor = async (id) => {
    try {
      await fetch(`${API_URL}/api/v1/society-management/visitors/${id}/check-out`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh
      const visRes = await fetch(`${API_URL}/api/v1/society-management/visitors/today`, { headers: { Authorization: `Bearer ${token}` } });
      const visData = await visRes.json();
      setVisitors(visData.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePackageSubmit = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/society-management/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          flatNumber: packageForm.flatNumber,
          courierName: packageForm.courierName
        })
      });
      if (res.ok) {
        setIsPackageModalOpen(false);
        const pkgRes = await fetch(`${API_URL}/api/v1/society-management/packages/pending`, { headers: { Authorization: `Bearer ${token}` } });
        const pkgData = await pkgRes.json();
        setPackages(pkgData.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSOS = async (type) => {
    try {
      await fetch(`${API_URL}/api/v1/society-management/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type })
      });
      setIsSOSModalOpen(false);
      alert(`Emergency (${type}) Triggered! Residents have been notified.`);
    } catch (err) {
      console.error(err);
    }
  };

  const startIntercomCall = () => {
    if (!intercomTargetFlat) return alert('Enter a flat number');
    setIsIntercomModalOpen(false);
    intercomRef.current?.initiateCall(intercomTargetFlat);
  };

  // Tab definitions
  const tabs = [
    { id: 'visitors', label: 'Live Gate Activity' },
    { id: 'vehicles', label: 'Vehicle Lookup' },
    { id: 'packages', label: 'Pending Packages' },
    { id: 'staff', label: 'Staff Attendance' },
    { id: 'patrols', label: 'Patrol Management' },
    { id: 'history_vehicle', label: 'Vehicle Logs' },
    { id: 'history_delivery', label: 'Delivery Logs' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem 1rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* Global Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '1rem', background: 'var(--error-light)', borderRadius: '1rem', color: 'var(--error)' }}>
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Security Station Dashboard</h1>
            <p style={{ color: 'var(--text-muted)' }}>Logged in as Guard: {user?.name || 'Security'}</p>
          </div>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Badge variant="warning" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
              <Clock size={16} style={{ marginRight: '0.5rem' }} /> Shift: Active
            </Badge>
            <Button 
              variant="danger" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--error)', color: 'white', padding: '0.75rem 1.5rem', fontSize: '1.1rem', animation: 'pulse 2s infinite' }}
              onClick={() => setIsSOSModalOpen(true)}
            >
              <ShieldAlert size={24} /> TRIGGER SOS
            </Button>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          
          {/* New Visitor (Modal) */}
          <Card 
            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-5px)' } }}
            onClick={() => setIsVisitorModalOpen(true)}
          >
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '1rem', borderRadius: '50%' }}>
              <Users size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Quick Visitor Entry</h3>
          </Card>
          
          {/* Delivery/Cab Modal */}
          <Card 
            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => setIsDeliveryModalOpen(true)}
          >
            <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '1rem', borderRadius: '50%' }}>
              <Car size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Delivery / Cab Entry</h3>
          </Card>

          {/* Intercom */}
          <Card 
            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-5px)' } }}
            onClick={() => setIsIntercomModalOpen(true)}
          >
            <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '1rem', borderRadius: '50%' }}>
              <PhoneCall size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Intercom Call</h3>
          </Card>

          {/* Full Page Visitor Form */}
          <Link href="/security-dashboard/new-visitor" style={{ textDecoration: 'none' }}>
            <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', height: '100%' }}>
              <div style={{ background: 'var(--surface-active)', color: 'var(--text)', padding: '1rem', borderRadius: '50%' }}>
                <Users size={32} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Full Visitor Form</h3>
            </Card>
          </Link>
        </div>

        {/* Main Data Area (Tabbed) */}
        <div className="glass-card" style={{ padding: '2rem', borderRadius: '1rem', minHeight: '400px' }}>
          
          {/* Tabs Header */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem', overflowX: 'auto' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  fontSize: '1rem',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {activeTab === 'visitors' && (
              <>
                {visitors.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No visitors today.</p> : null}
                {visitors.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--primary)', background: `var(--primary-light)`, padding: '0.5rem', borderRadius: '0.5rem' }}><Users size={24} /></div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>{item.visitor_name} (Flat {item.flat_number})</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.purpose} • {new Date(item.entry_time).toLocaleTimeString()}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleCheckOutVisitor(item.id)} style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
                      Check-Out
                    </Button>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'vehicles' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '2rem 0' }}>
                <Search size={48} color="var(--text-muted)" />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Verify Resident Vehicle</h3>
                <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '500px' }}>
                  <input type="text" value={vehicleQuery} onChange={e => setVehicleQuery(e.target.value)} placeholder="Enter Vehicle Number (e.g. MH15AB1234)" style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '1rem' }} />
                  <Button variant="primary" style={{ padding: '0 2rem' }} onClick={handleLookupVehicle}>Lookup</Button>
                </div>
                {vehicleResult && !vehicleResult.notFound && (
                   <Card style={{ padding: '1rem', width: '100%', maxWidth: '500px', background: 'var(--success-light)', color: 'var(--success)' }}>
                     <h4 style={{ fontWeight: 700 }}>✅ Vehicle Verified</h4>
                     <p>Owner: {vehicleResult.owner?.tenant_name || 'Resident'}</p>
                     <p>Flat: {vehicleResult.owner?.flat_number}</p>
                   </Card>
                )}
                {vehicleResult?.notFound && (
                   <Card style={{ padding: '1rem', width: '100%', maxWidth: '500px', background: 'var(--error-light)', color: 'var(--error)' }}>
                     <h4 style={{ fontWeight: 700 }}>❌ Vehicle Not Found in Database</h4>
                   </Card>
                )}
              </div>
            )}

            {activeTab === 'packages' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Button variant="primary" onClick={() => setIsPackageModalOpen(true)} style={{ alignSelf: 'flex-start', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <Box size={18} /> Log New Package at Gate
                </Button>
                {packages.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No pending packages.</p> : null}
                {packages.map((pkg, i) => (
                   <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                     <Box size={24} color="var(--primary)" />
                     <div style={{ flex: 1 }}>
                       <h4 style={{ fontWeight: 600 }}>Flat {pkg.flat_number} - {pkg.courier_name}</h4>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(pkg.received_time).toLocaleString()}</span>
                     </div>
                     <Badge variant="warning">{pkg.status}</Badge>
                   </div>
                ))}
              </div>
            )}

            {activeTab === 'staff' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {staffLogs.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No staff checked in yet today.</p> : null}
                {staffLogs.map((staff, i) => (
                   <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                     <Users size={24} color="var(--primary)" />
                     <div style={{ flex: 1 }}>
                       <h4 style={{ fontWeight: 600 }}>{staff.name} - {staff.role}</h4>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Check-in: {new Date(staff.check_in_time).toLocaleString()}</span>
                     </div>
                   </div>
                ))}
              </div>
            )}

            {activeTab === 'patrols' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '2rem 0' }}>
                <Shield size={48} color="var(--primary)" />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Night Patrol Routes</h3>
                <Button variant="primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>Start New Patrol</Button>
                <p style={{ color: 'var(--text-muted)' }}>Last patrol completed 4 hours ago.</p>
              </div>
            )}
            
            {activeTab === 'history_vehicle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recent Vehicle Entries</h3>
                 {vehicleLogs.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No vehicle logs found.</p> : null}
                 {vehicleLogs.map((log, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                     <Car size={24} color="var(--primary)" />
                     <div style={{ flex: 1 }}>
                       <h4 style={{ fontWeight: 600 }}>{log.vehicle_number}</h4>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</span>
                     </div>
                   </div>
                 ))}
              </div>
            )}

            {activeTab === 'history_delivery' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recent Deliveries/Cabs</h3>
                 {deliveryLogs.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No delivery logs found.</p> : null}
                 {deliveryLogs.map((log, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                     <Box size={24} color="var(--primary)" />
                     <div style={{ flex: 1 }}>
                       <h4 style={{ fontWeight: 600 }}>{log.provider_name} ({log.service_type})</h4>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Flat {log.destination_flat} • {new Date(log.created_at).toLocaleString()}</span>
                     </div>
                   </div>
                 ))}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* --- Modals --- */}
      
      {/* 1. Quick Visitor Modal with Webcam */}
      {isVisitorModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--background)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Quick Visitor Entry</h2>
              <button onClick={() => setIsVisitorModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Visitor Photo</label>
                {!imgSrc ? (
                  <div style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      width="100%"
                      videoConstraints={{ facingMode: "user" }}
                    />
                    <Button variant="primary" onClick={capture} style={{ position: 'absolute', bottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <Camera size={18} /> Capture Photo
                    </Button>
                  </div>
                ) : (
                  <div style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <img src={imgSrc} alt="Visitor Capture" style={{ width: '100%', display: 'block' }} />
                    <Button variant="outline" onClick={() => setImgSrc(null)} style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', background: 'white' }}>
                      Retake
                    </Button>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Visitor Name</label>
                  <input type="text" value={visitorForm.name} onChange={e => setVisitorForm({...visitorForm, name: e.target.value})} placeholder="Full Name" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Phone Number</label>
                  <input type="tel" value={visitorForm.phone} onChange={e => setVisitorForm({...visitorForm, phone: e.target.value})} placeholder="+91" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Visiting Flat</label>
                  <input type="text" value={visitorForm.flat} onChange={e => setVisitorForm({...visitorForm, flat: e.target.value})} placeholder="e.g. A-101" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Purpose</label>
                  <select value={visitorForm.purpose} onChange={e => setVisitorForm({...visitorForm, purpose: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                    <option>Guest/Relative</option>
                    <option>Service/Repair</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Button variant="primary" style={{ flex: 1 }} onClick={handleVisitorSubmit}>Send Approval to Resident</Button>
                <Button variant="outline" onClick={() => setIsVisitorModalOpen(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SOS Modal */}
      {isSOSModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)' }}>
          <div style={{ background: 'var(--background)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px', textAlign: 'center', border: '2px solid var(--error)' }}>
            <ShieldAlert size={64} color="var(--error)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--error)', marginBottom: '0.5rem' }}>TRIGGER EMERGENCY</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>This will immediately alert all residents, admins, and local authorities (if configured).</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Button variant="danger" onClick={() => handleSOS('Medical')} style={{ background: 'var(--error)', color: 'white', padding: '1rem', fontSize: '1.1rem' }}>Yes, Trigger Medical SOS</Button>
              <Button variant="danger" onClick={() => handleSOS('Police')} style={{ background: '#000', color: 'white', padding: '1rem', fontSize: '1.1rem' }}>Yes, Trigger Police/Security SOS</Button>
              <Button variant="outline" onClick={() => setIsSOSModalOpen(false)} style={{ marginTop: '1rem' }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delivery/Cab Modal */}
      {isDeliveryModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--background)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '500px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Log Cab or Delivery</h2>
              <button onClick={() => setIsDeliveryModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Company</label>
                <select value={deliveryForm.company} onChange={e => setDeliveryForm({...deliveryForm, company: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <option>Swiggy</option>
                  <option>Zomato</option>
                  <option>Amazon</option>
                  <option>Uber</option>
                  <option>Ola</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Vehicle Number</label>
                  <input type="text" value={deliveryForm.vehicleNumber} onChange={e => setDeliveryForm({...deliveryForm, vehicleNumber: e.target.value})} placeholder="e.g. MH15AB1234" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }} />
              </div>
              <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Delivery Flat</label>
                  <input type="text" value={deliveryForm.flat} onChange={e => setDeliveryForm({...deliveryForm, flat: e.target.value})} placeholder="e.g. B-304" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }} />
              </div>
              <Button variant="primary" style={{ marginTop: '1rem' }} onClick={handleDeliverySubmit}>Log Entry & Notify</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* 4. Package Modal */}
      {isPackageModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--background)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Log Package at Gate</h2>
              <button onClick={() => setIsPackageModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Courier Company</label>
                <select value={packageForm.courierName} onChange={e => setPackageForm({...packageForm, courierName: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <option>Amazon</option>
                  <option>Flipkart</option>
                  <option>BlueDart</option>
                  <option>Delhivery</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Destination Flat</label>
                <input type="text" value={packageForm.flatNumber} onChange={e => setPackageForm({...packageForm, flatNumber: e.target.value})} placeholder="e.g. A-101" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }} />
              </div>
              <Button variant="primary" style={{ marginTop: '1rem' }} onClick={handlePackageSubmit}>Log Package & Notify Resident</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* 5. Intercom Modal */}
      {isIntercomModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--background)', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Initiate Intercom Call</h2>
              <button onClick={() => setIsIntercomModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Flat Number</label>
                <input type="text" value={intercomTargetFlat} onChange={e => setIntercomTargetFlat(e.target.value)} placeholder="e.g. A-101" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }} />
              </div>
              <Button variant="primary" style={{ marginTop: '1rem' }} onClick={startIntercomCall}>Call Flat</Button>
            </div>
          </div>
        </div>
      )}
      
      <WebRTCIntercom ref={intercomRef} />
      <Footer />
    </div>
  );
}
