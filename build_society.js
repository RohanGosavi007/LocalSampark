const fs = require('fs');
const path = require('path');

const content = `import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, TextInput, Platform, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { io } from 'socket.io-client';
import { useAuth } from '../../../src/context/AuthContext';

const DEV_TEST_ROLE = 'admin'; 

export default function SocietyModule() {
  const { user, authToken } = useAuth();
  const [societyRole, setSocietyRole] = useState(DEV_TEST_ROLE);
  const [activeTab, setActiveTab] = useState('visitors');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  const [visitorForm, setVisitorForm] = useState({ visitorName: '', flatNumber: '' });
  const [visitorPhoto, setVisitorPhoto] = useState(null);
  const [idCardPhoto, setIdCardPhoto] = useState(null);
  
  const [visitors, setVisitors] = useState([]);
  const [members, setMembers] = useState([]);
  const [guardMessages, setGuardMessages] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [bills, setBills] = useState([]);
  const [parkingSlots, setParkingSlots] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [packages, setPackages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState('visitor'); 
  const [doorbellData, setDoorbellData] = useState(null);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();

  const API = \`http://10.0.2.2:5000/api/v1/society-management\`;

  useEffect(() => {
    if (!user) return;
    const s = io('http://10.0.2.2:5000', { auth: { token: authToken } });
    s.on('connect', () => s.emit('society:join', { societyId: 'SOC-001' }));
    s.on('society:doorbell', (data) => setDoorbellData(data));
    s.on('society:emergency', (data) => { setEmergencyAlert(data); load('emergency'); });
    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  const tabsByRole = {
    admin: [ { id: 'visitors', label: '👥 Visitors' }, { id: 'members', label: '🏠 Members' }, { id: 'staff', label: '🧹 Staff' }, { id: 'bills', label: '💰 Bills' }, { id: 'parking', label: '🅿️ Parking' }, { id: 'amenities', label: '🏊 Amenities' }, { id: 'complaints', label: '📋 Complaints' }, { id: 'packages', label: '📦 Packages' }, { id: 'polls', label: '🗳️ Polls' }, { id: 'emergency', label: '🚨 Emergency' }, { id: 'directory', label: '📞 Directory' }, { id: 'events', label: '📅 Events' }, { id: 'notices', label: '📝 Notices' } ],
    guard: [ { id: 'visitors', label: '👥 Visitors' }, { id: 'staff', label: '🧹 Staff' }, { id: 'packages', label: '📦 Packages' }, { id: 'parking', label: '🅿️ Parking' }, { id: 'messages', label: '💬 Messages' }, { id: 'reminders', label: '⏰ Reminders' }, { id: 'emergency', label: '🚨 Emergency' }, { id: 'directory', label: '📞 Directory' }, { id: 'notices', label: '📝 Notices' } ],
    resident: [ { id: 'visitors', label: '🔔 My Visitors' }, { id: 'bills', label: '💰 Bills' }, { id: 'complaints', label: '📋 Complaints' }, { id: 'amenities', label: '🏊 Amenities' }, { id: 'packages', label: '📦 Packages' }, { id: 'parking', label: '🅿️ Parking' }, { id: 'polls', label: '🗳️ Polls' }, { id: 'staff', label: '🧹 Staff' }, { id: 'messages', label: '💬 Guard Msg' }, { id: 'reminders', label: '⏰ Reminders' }, { id: 'emergency', label: '🚨 Emergency' }, { id: 'directory', label: '📞 Directory' }, { id: 'events', label: '📅 Events' }, { id: 'notices', label: '📝 Notices' } ]
  };

  const load = useCallback(async (tab) => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: \`Bearer \${authToken}\` };
      const apiGet = async (path) => {
        const res = await fetch(\`\${API}\${path}\`, { headers });
        const json = await res.json();
        return json.data || [];
      };

      if (tab === 'visitors') setVisitors(await apiGet('/visitors/today'));
      else if (tab === 'members') setMembers(await apiGet('/members'));
      else if (tab === 'messages') setGuardMessages(await apiGet('/guard-messages'));
      else if (tab === 'reminders') setReminders(await apiGet('/guard-reminders'));
      else if (tab === 'staff') setStaff(await apiGet('/staff'));
      else if (tab === 'bills') setBills(await apiGet(societyRole === 'admin' ? '/bills' : '/my-bills'));
      else if (tab === 'parking') setParkingSlots(await apiGet(societyRole === 'resident' ? '/my-parking' : '/parking'));
      else if (tab === 'amenities') setAmenities(await apiGet('/amenities'));
      else if (tab === 'complaints') setComplaints(await apiGet(societyRole === 'admin' ? '/complaints/all' : '/my-complaints'));
      else if (tab === 'packages') setPackages(await apiGet(societyRole === 'resident' ? '/my-packages' : '/packages/pending'));
      else if (tab === 'polls') setPolls(await apiGet('/polls'));
      else if (tab === 'emergency') setEmergencies(await apiGet('/emergency/active'));
      else if (tab === 'directory') setDirectory(await apiGet('/directory'));
      else if (tab === 'events') setEvents(await apiGet('/events'));
      else if (tab === 'notices') setNotices(await apiGet('/notices'));
    } catch (e) {
      console.log('Load error:', e.message);
    }
    setLoading(false);
  }, [societyRole, authToken]);

  useEffect(() => { load(activeTab); }, [activeTab, load]);

  const apiPost = async (path, body, method = 'POST') => {
    try {
      const res = await fetch(\`\${API}\${path}\`, {
        method, headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${authToken}\` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) { Alert.alert('Success', data.message || 'Action completed'); load(activeTab); }
      else Alert.alert('Error', data.error || 'Failed');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const renderContent = () => {
    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;

    if (activeTab === 'visitors') {
      return (
        <View>
          <Text style={styles.sectionTitle}>📋 Visitors List</Text>
          {visitors.map(v => (
            <View key={v.id} style={styles.listCard}>
              <Text style={styles.cardTitle}>{v.visitor_name}</Text>
              <Text style={styles.cardMeta}>Flat {v.flat_number} • {v.status}</Text>
            </View>
          ))}
        </View>
      );
    }
    
    if (activeTab === 'members') return (
      <View>
        <Text style={styles.sectionTitle}>🏠 Residents & Members</Text>
        {members.map(m => (
          <View key={m.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{m.full_name}</Text>
            <Text style={styles.cardMeta}>Flat {m.flat_number} • {m.role}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'staff') return (
      <View>
        <Text style={styles.sectionTitle}>🧹 Society Staff</Text>
        {staff.map(s => (
          <View key={s.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{s.staff_name}</Text>
            <Text style={styles.cardMeta}>{s.role} • {s.status}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'bills') return (
      <View>
        <Text style={styles.sectionTitle}>💰 Maintenance Bills</Text>
        {bills.map(b => (
          <View key={b.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>Bill #{b.id}</Text>
            <Text style={styles.cardMeta}>Amount: ₹{b.amount} • Status: {b.status}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'parking') return (
      <View>
        <Text style={styles.sectionTitle}>🅿️ Parking Directory</Text>
        {parkingSlots.map(p => (
          <View key={p.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>Slot {p.slot_number}</Text>
            <Text style={styles.cardMeta}>Flat {p.flat_number} • {p.vehicle_type}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'amenities') return (
      <View>
        <Text style={styles.sectionTitle}>🏊 Amenities Booking</Text>
        {amenities.map(a => (
          <View key={a.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{a.name}</Text>
            <Text style={styles.cardMeta}>Status: {a.status}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'complaints') return (
      <View>
        <Text style={styles.sectionTitle}>📋 Complaints Board</Text>
        {complaints.map(c => (
          <View key={c.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.cardMeta}>Status: {c.status}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'packages') return (
      <View>
        <Text style={styles.sectionTitle}>📦 Packages Received</Text>
        {packages.map(p => (
          <View key={p.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{p.delivery_company}</Text>
            <Text style={styles.cardMeta}>Flat {p.flat_number} • Status: {p.status}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'polls') return (
      <View>
        <Text style={styles.sectionTitle}>🗳️ Active Polls</Text>
        {polls.map(p => (
          <View key={p.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{p.question}</Text>
            <Text style={styles.cardMeta}>Status: {p.status}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'directory') return (
      <View>
        <Text style={styles.sectionTitle}>📞 Emergency Directory</Text>
        {directory.map(d => (
          <View key={d.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{d.contact_name}</Text>
            <Text style={styles.cardMeta}>{d.category} • {d.phone_number}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'events') return (
      <View>
        <Text style={styles.sectionTitle}>📅 Community Events</Text>
        {events.map(e => (
          <View key={e.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{e.title}</Text>
            <Text style={styles.cardMeta}>{e.event_date} • {e.location}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'notices') return (
      <View>
        <Text style={styles.sectionTitle}>📝 Notice Board</Text>
        {notices.map(n => (
          <View key={n.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{n.title}</Text>
            <Text style={styles.cardMeta}>Date: {n.created_at}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'messages') return (
      <View>
        <Text style={styles.sectionTitle}>💬 Guard Messages</Text>
        {guardMessages.map(m => (
          <View key={m.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{m.message}</Text>
            <Text style={styles.cardMeta}>To: Flat {m.flat_number}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'reminders') return (
      <View>
        <Text style={styles.sectionTitle}>⏰ Guard Reminders</Text>
        {reminders.map(r => (
          <View key={r.id} style={styles.listCard}>
            <Text style={styles.cardTitle}>{r.title}</Text>
            <Text style={styles.cardMeta}>Time: {r.reminder_time}</Text>
          </View>
        ))}
      </View>
    );

    if (activeTab === 'emergency') {
      return (
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, {color: '#ef4444'}]}>🚨 Trigger Emergency Alert</Text>
          <TouchableOpacity style={[styles.primaryBtn, {backgroundColor: '#dc2626', paddingVertical: 20}]} onPress={() => apiPost('/emergency', {alertType: 'fire'})}>
            <Text style={[styles.primaryBtnText, {fontSize: 18}]}>🚨 SOUND THE ALARM</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, {marginTop: 30, color: '#ef4444'}]}>Active Emergencies</Text>
          {emergencies.map(e => (
            <View key={e.id} style={{padding:15, backgroundColor:'rgba(239,68,68,0.1)', borderRadius:8, borderWidth:1, borderColor:'#ef4444', marginBottom:10}}>
              <Text style={{color:'#ef4444', fontWeight:'bold', fontSize:16}}>{e.alert_type} • Flat {e.flat_number}</Text>
            </View>
          ))}
        </View>
      );
    }
    
    return <Text style={{color: '#94a3b8'}}>This feature is mapped but waiting for data.</Text>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>🏢 Society Manager</Text>
      </View>

      <View style={{flexDirection:'row', justifyContent:'center', padding:10, gap:10}}>
        {['admin', 'guard', 'resident'].map(r => (
          <TouchableOpacity key={r} onPress={()=>setSocietyRole(r)} style={{padding:8, borderRadius:20, backgroundColor: societyRole===r?'#6366f1':'#1e293b'}}>
            <Text style={{color:societyRole===r?'#fff':'#94a3b8', fontSize:12, fontWeight:'bold', textTransform:'capitalize'}}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{padding: 10, gap: 10}}>
          {(tabsByRole[societyRole]||[]).map(t => (
            <TouchableOpacity key={t.id} onPress={()=>setActiveTab(t.id)} style={{paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: activeTab===t.id?'#6366f1':'transparent', borderWidth: 1, borderColor: activeTab===t.id?'#6366f1':'#334155'}}>
              <Text style={{color: activeTab===t.id?'#fff':'#cbd5e1', fontWeight:'bold'}}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  header: { padding: 16, backgroundColor: '#0d1526', borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#6366f1', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  card: { backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
  listCard: { backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 10 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardMeta: { color: '#94a3b8', fontSize: 13 },
  primaryBtn: { backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});
`;

const targetPath = path.join(__dirname, 'apps', 'mobile', 'app', 'modules', 'society', 'index.js');
fs.writeFileSync(targetPath, content);
console.log('Successfully expanded society module to cover all 14 tabs!');
