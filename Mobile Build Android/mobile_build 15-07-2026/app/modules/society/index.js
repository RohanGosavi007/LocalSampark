import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { withRoleGuard } from '../../../src/utils/permissions';
import { LinearGradient } from 'expo-linear-gradient';

// Import all 16 Tab Components
import VisitorsTab from './tabs/VisitorsTab';
import MembersTab from './tabs/MembersTab';
import StaffTab from './tabs/StaffTab';
import BillsTab from './tabs/BillsTab';
import ParkingTab from './tabs/ParkingTab';
import AmenitiesTab from './tabs/AmenitiesTab';
import ComplaintsTab from './tabs/ComplaintsTab';
import PackagesTab from './tabs/PackagesTab';
import PollsTab from './tabs/PollsTab';
import EmergencyTab from './tabs/EmergencyTab';
import DirectoryTab from './tabs/DirectoryTab';
import EventsTab from './tabs/EventsTab';
import NoticesTab from './tabs/NoticesTab';
import SettingsTab from './tabs/SettingsTab';
import MessagesTab from './tabs/MessagesTab';
import RemindersTab from './tabs/RemindersTab';

// Role Definitions for this module
const ROLES_MAP = {
  society_admin: 'admin',
  security_guard: 'guard',
  resident_member: 'resident',
  user: 'resident' // Fallback
};

const tabsByRole = {
  admin: [
    { id: 'visitors', icon: '👤', label: 'Visitors', Component: VisitorsTab },
    { id: 'members', icon: '🏠', label: 'Members', Component: MembersTab },
    { id: 'staff', icon: '🧹', label: 'Staff', Component: StaffTab },
    { id: 'bills', icon: '🧾', label: 'Bills', Component: BillsTab },
    { id: 'parking', icon: '🚗', label: 'Parking', Component: ParkingTab },
    { id: 'amenities', icon: '🏊‍♂️', label: 'Amenities', Component: AmenitiesTab },
    { id: 'complaints', icon: '🛠️', label: 'Complaints', Component: ComplaintsTab },
    { id: 'packages', icon: '📦', label: 'Packages', Component: PackagesTab },
    { id: 'polls', icon: '📊', label: 'Polls', Component: PollsTab },
    { id: 'emergency', icon: '🚨', label: 'Emergency', Component: EmergencyTab },
    { id: 'directory', icon: '📞', label: 'Directory', Component: DirectoryTab },
    { id: 'events', icon: '🎉', label: 'Events', Component: EventsTab },
    { id: 'notices', icon: '📋', label: 'Notices', Component: NoticesTab },
    { id: 'settings', icon: '⚙️', label: 'Settings', Component: SettingsTab }
  ],
  guard: [
    { id: 'visitors', icon: '👤', label: 'Visitors', Component: VisitorsTab },
    { id: 'staff', icon: '🧹', label: 'Staff', Component: StaffTab },
    { id: 'packages', icon: '📦', label: 'Packages', Component: PackagesTab },
    { id: 'parking', icon: '🚗', label: 'Parking', Component: ParkingTab },
    { id: 'messages', icon: '💬', label: 'Messages', Component: MessagesTab },
    { id: 'reminders', icon: '⏰', label: 'Reminders', Component: RemindersTab },
    { id: 'emergency', icon: '🚨', label: 'Emergency', Component: EmergencyTab },
    { id: 'directory', icon: '📞', label: 'Directory', Component: DirectoryTab },
    { id: 'notices', icon: '📋', label: 'Notices', Component: NoticesTab }
  ],
  resident: [
    { id: 'visitors', icon: '👤', label: 'My Visitors', Component: VisitorsTab },
    { id: 'bills', icon: '🧾', label: 'Bills', Component: BillsTab },
    { id: 'complaints', icon: '🛠️', label: 'Complaints', Component: ComplaintsTab },
    { id: 'amenities', icon: '🏊‍♂️', label: 'Amenities', Component: AmenitiesTab },
    { id: 'packages', icon: '📦', label: 'Packages', Component: PackagesTab },
    { id: 'parking', icon: '🚗', label: 'Parking', Component: ParkingTab },
    { id: 'polls', icon: '📊', label: 'Polls', Component: PollsTab },
    { id: 'emergency', icon: '🚨', label: 'Emergency', Component: EmergencyTab },
    { id: 'directory', icon: '📞', label: 'Directory', Component: DirectoryTab },
    { id: 'events', icon: '🎉', label: 'Events', Component: EventsTab },
    { id: 'notices', icon: '📋', label: 'Notices', Component: NoticesTab },
    { id: 'settings', icon: '⚙️', label: 'Settings', Component: SettingsTab }
  ]
};

function SocietyModule() {
  const { user } = useAuth();
  const internalRole = ROLES_MAP[user?.role] || 'resident';
  
  const [activeTab, setActiveTab] = useState('visitors');
  const availableTabs = tabsByRole[internalRole] || tabsByRole['resident'];

  // Ensure active tab is always valid for the current role
  useEffect(() => {
    if (!availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [internalRole, availableTabs]);

  const renderActiveTab = () => {
    const tabConfig = availableTabs.find(t => t.id === activeTab);
    if (!tabConfig) return null;
    const TabComponent = tabConfig.Component;
    return <TabComponent user={user} role={internalRole} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏢 Society Management</Text>
      </View>

      {/* Role specific header based on Web design */}
      <LinearGradient colors={['#e0e7ff', '#ffffff']} style={styles.hero}>
        <Text style={styles.heroTitle}>Society Management Platform</Text>
        <Text style={styles.heroSub}>
          Complete society management - visitors, bills, complaints, amenities, and more
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Viewing as: {internalRole.toUpperCase()}</Text>
        </View>
      </LinearGradient>

      {/* Scrollable Tab Bar */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {availableTabs.map((tab) => (
            <TouchableOpacity 
              key={tab.id} 
              style={[styles.tabButton, activeTab === tab.id && styles.activeTabButton]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabIcon, activeTab === tab.id && styles.activeTabIcon]}>{tab.icon}</Text>
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {renderActiveTab()}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, 
  backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  hero: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center'
  },
  heroSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12
  },
  roleBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },

  tabContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f1f5f9',
  },
  activeTabButton: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  activeTabIcon: {
    opacity: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#ffffff',
  },

  content: {
    padding: 16,
  }
});

// Since society index can be accessed by admin, guard, resident, and user
export default withRoleGuard(SocietyModule, 'society');
