import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../../src/context/AuthContext';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  
  // State for Role Simulator
  const [activeRole, setActiveRole] = useState('user'); // 'user', 'merchant', 'admin'
  const [isOnline, setIsOnline] = useState(true);

  // Form State
  const [form, setForm] = useState({
    name: user?.name || 'Resident Name',
    phone: user?.phone_number || '+91 9876543210',
    society: user?.society_name || 'Pride Aashiyana',
    flatNo: user?.flat_no || 'B-404',
    email: user?.email || 'resident@example.com'
  });

  const handleRoleChange = (role) => {
    setActiveRole(role);
  };

  const handlePartnerSignup = () => {
    Alert.alert('Become a Partner', 'Redirecting to Franchise / Partner application flow...');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Avatar & Info */}
        <View style={styles.profileHero}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{form.name.charAt(0)}</Text>
            <TouchableOpacity style={styles.editPhotoBtn}>
              <Text style={{fontSize: 12}}>📷</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{form.name}</Text>
          <Text style={styles.profilePhone}>{form.phone}</Text>
        </View>

        {/* Development Role Selector (As per requirements) */}
        <View style={styles.roleSelectorBox}>
          <Text style={styles.roleTitle}>App Mode (Dev Selector)</Text>
          <View style={styles.roleRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
              {['user', 'merchant', 'delivery_agent', 'admin', 'resident', 'guard', 'society_admin', 'housekeeping'].map(role => (
                <TouchableOpacity 
                  key={role} 
                  style={[styles.roleBtn, activeRole === role && styles.roleBtnActive]}
                  onPress={() => handleRoleChange(role)}
                >
                  <Text style={[styles.roleBtnText, activeRole === role && styles.roleBtnTextActive]}>
                    {role.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Dynamic Fields based on Role */}
        {activeRole === 'merchant' && (
          <View style={{ gap: 16, marginBottom: 24 }}>
            <View style={styles.statusSection}>
              <View>
                <Text style={styles.statusTitle}>Accepting Orders</Text>
                <Text style={styles.statusSubtitle}>{isOnline ? 'Shop is open' : 'Shop is closed temporarily'}</Text>
              </View>
              <Switch 
                value={isOnline} 
                onValueChange={setIsOnline}
                trackColor={{ false: '#e2e8f0', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>
            <TouchableOpacity style={styles.adminPanelBtn} onPress={() => router.push('/modules/merchant/ShopDashboard')} style={[styles.adminPanelBtn, { marginBottom: 0 }]}>
              <Text style={{fontSize: 24, marginRight: 12}}>🏪</Text>
              <View style={{flex: 1}}>
                <Text style={styles.adminTitle}>Merchant Dashboard</Text>
                <Text style={styles.adminSub}>Manage orders, catalog, and store analytics</Text>
              </View>
              <Text style={{color: '#64748b', fontSize: 18}}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeRole === 'delivery_agent' && (
          <TouchableOpacity style={styles.adminPanelBtn} onPress={() => router.push('/modules/delivery/RunnerDashboard')}>
            <Text style={{fontSize: 24, marginRight: 12}}>🛵</Text>
            <View style={{flex: 1}}>
              <Text style={styles.adminTitle}>Runner Dashboard</Text>
              <Text style={styles.adminSub}>Live dispatch radar and earnings tracker</Text>
            </View>
            <Text style={{color: '#64748b', fontSize: 18}}>›</Text>
          </TouchableOpacity>
        )}

        {activeRole === 'admin' && (
          <TouchableOpacity style={styles.adminPanelBtn} onPress={() => router.push('/modules/admin-dashboard')}>
            <Text style={{fontSize: 24, marginRight: 12}}>🛡️</Text>
            <View style={{flex: 1}}>
              <Text style={styles.adminTitle}>Admin Dashboard</Text>
              <Text style={styles.adminSub}>Manage franchise, users, and app settings</Text>
            </View>
            <Text style={{color: '#64748b', fontSize: 18}}>›</Text>
          </TouchableOpacity>
        )}

        {/* SOCIETY MODULE SHORTCUTS */}
        {activeRole === 'resident' && (
          <TouchableOpacity style={styles.adminPanelBtn} onPress={() => router.push('/modules/society/ResidentDashboard')}>
            <Text style={{fontSize: 24, marginRight: 12}}>🏢</Text>
            <View style={{flex: 1}}>
              <Text style={styles.adminTitle}>My Society Dashboard</Text>
              <Text style={styles.adminSub}>Access gate approvals, smart intercom, and 30+ features</Text>
            </View>
            <Text style={{color: '#64748b', fontSize: 18}}>›</Text>
          </TouchableOpacity>
        )}

        {activeRole === 'guard' && (
          <TouchableOpacity style={styles.adminPanelBtn} onPress={() => router.push('/modules/society/GuardDashboard')}>
            <Text style={{fontSize: 24, marginRight: 12}}>👮‍♂️</Text>
            <View style={{flex: 1}}>
              <Text style={styles.adminTitle}>Security Guard Terminal</Text>
              <Text style={styles.adminSub}>Manage visitors, parcel desk, and CCTV alerts</Text>
            </View>
            <Text style={{color: '#64748b', fontSize: 18}}>›</Text>
          </TouchableOpacity>
        )}

        {activeRole === 'society_admin' && (
          <TouchableOpacity style={styles.adminPanelBtn} onPress={() => router.push('/modules/society/AdminDashboard')}>
            <Text style={{fontSize: 24, marginRight: 12}}>💼</Text>
            <View style={{flex: 1}}>
              <Text style={styles.adminTitle}>Society Admin Panel</Text>
              <Text style={styles.adminSub}>Manage billing, members, and group buys</Text>
            </View>
            <Text style={{color: '#64748b', fontSize: 18}}>›</Text>
          </TouchableOpacity>
        )}

        {activeRole === 'housekeeping' && (
          <TouchableOpacity style={styles.adminPanelBtn} onPress={() => router.push('/modules/society/HousekeepingDashboard')}>
            <Text style={{fontSize: 24, marginRight: 12}}>🧹</Text>
            <View style={{flex: 1}}>
              <Text style={styles.adminTitle}>Housekeeping Dashboard</Text>
              <Text style={styles.adminSub}>View smart IoT waste bins and cleaning tasks</Text>
            </View>
            <Text style={{color: '#64748b', fontSize: 18}}>›</Text>
          </TouchableOpacity>
        )}

        {/* Engagement & Rewards Section */}
        {activeRole === 'user' && (
          <View style={styles.engagementSection}>
            <Text style={styles.sectionHeader}>Engagement & Rewards</Text>
            
            <View style={styles.engagementGrid}>
              <TouchableOpacity style={styles.engagementCard}>
                <Text style={styles.engagementIcon}>🪙</Text>
                <Text style={styles.engagementTitle}>Reward Coins</Text>
                <Text style={styles.engagementValue}>1,200</Text>
                <Text style={styles.engagementSub}>= ₹120.00</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.engagementCard}>
                <Text style={styles.engagementIcon}>🎁</Text>
                <Text style={styles.engagementTitle}>Refer & Earn</Text>
                <Text style={styles.engagementValue}>Code</Text>
                <Text style={styles.engagementSub}>LS7X9A</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.engagementCard}>
                <Text style={styles.engagementIcon}>⭐</Text>
                <Text style={styles.engagementTitle}>My Reviews</Text>
                <Text style={styles.engagementValue}>14</Text>
                <Text style={styles.engagementSub}>Submitted</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.sectionHeader}>Personal Information</Text>
          
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={styles.input} 
            value={form.name}
            onChangeText={t => setForm({...form, name: t})}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput 
            style={styles.input} 
            value={form.phone}
            onChangeText={t => setForm({...form, phone: t})}
            keyboardType="phone-pad"
          />
          
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            value={form.email}
            onChangeText={t => setForm({...form, email: t})}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionHeader}>Address Details</Text>
          
          <Text style={styles.label}>Society / Building Name</Text>
          <TextInput 
            style={styles.input} 
            value={form.society}
            onChangeText={t => setForm({...form, society: t})}
          />

          <Text style={styles.label}>Flat / House Number</Text>
          <TextInput 
            style={styles.input} 
            value={form.flatNo}
            onChangeText={t => setForm({...form, flatNo: t})}
          />
        </View>

        {/* Partner CTA */}
        {activeRole === 'user' && (
          <TouchableOpacity style={styles.partnerCta} onPress={handlePartnerSignup}>
            <View style={styles.partnerIconBg}><Text style={{fontSize: 24}}>🤝</Text></View>
            <View style={{flex: 1}}>
              <Text style={styles.partnerTitle}>Become a Partner</Text>
              <Text style={styles.partnerSub}>Start earning by becoming a delivery runner or franchise owner today.</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
          <Text style={styles.signOutBtnText}>🚪 Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  saveBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  
  content: { paddingBottom: 40 },
  
  profileHero: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, position: 'relative' },
  avatarText: { color: '#3b82f6', fontSize: 40, fontWeight: '900' },
  editPhotoBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  profileName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  profilePhone: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  
  roleSelectorBox: { marginHorizontal: 16, marginBottom: 24, padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  roleTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#1e1b4b' },
  roleBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  roleBtnTextActive: { color: '#fff' },
  
  statusSection: { marginHorizontal: 16, marginBottom: 24, backgroundColor: '#fff', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  statusTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  statusSubtitle: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  
  adminPanelBtn: { marginHorizontal: 16, marginBottom: 24, backgroundColor: '#fff', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  adminTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  adminSub: { color: '#64748b', fontSize: 12, fontWeight: '500' },

  formSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: { color: '#0f172a', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  
  label: { color: '#475569', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, color: '#0f172a', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 20, fontWeight: '500' },
  
  partnerCta: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#eff6ff', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
  partnerIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  partnerTitle: { color: '#1e3a8a', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  partnerSub: { color: '#3b82f6', fontSize: 12, lineHeight: 18, fontWeight: '500' },

  signOutBtn: { backgroundColor: '#fee2e2', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 32, marginHorizontal: 16 },
  signOutBtnText: { color: '#ef4444', fontWeight: '800', fontSize: 16 },

  engagementSection: { paddingHorizontal: 16, marginBottom: 24 },
  engagementGrid: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  engagementCard: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  engagementIcon: { fontSize: 24, marginBottom: 8 },
  engagementTitle: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' },
  engagementValue: { color: '#0f172a', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  engagementSub: { color: '#10b981', fontSize: 11, fontWeight: '700' }
});
