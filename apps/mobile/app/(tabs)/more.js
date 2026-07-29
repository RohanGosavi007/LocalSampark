import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Wallet, Briefcase, Building2, Store, Truck, Car, Home, IndianRupee, Heart, Cross, Stethoscope, Ticket, User, Settings, LogOut, ShieldCheck, Globe } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';

const { width } = Dimensions.get('window');
const colWidth = (width - 48) / 3; // 3 columns with padding

export default function MoreScreen() {
  const { user, activeRole } = useAuth();

  const MODULES = [
    { title: 'Wallet & Pay', icon: Wallet, route: '/modules/wallet', bg: '#e0e7ff', color: '#4f46e5' },
    { title: 'Local Jobs', icon: Briefcase, route: '/modules/jobs', bg: '#fef3c7', color: '#d97706' },
    { title: 'Real Estate', icon: Building2, route: '/modules/properties', bg: '#f3e8ff', color: '#7e22ce' },
    { title: 'Home Services', icon: Store, route: '/(tabs)/services', bg: '#dcfce7', color: '#15803d' },
    { title: 'Medical', icon: Stethoscope, route: '/modules/medical', bg: '#ffe4e6', color: '#be123c' },
    { title: 'Events', icon: Ticket, route: '/modules/events', bg: '#fae8ff', color: '#c026d3' },
    { title: 'Carpool', icon: Car, route: '/modules/carpool', bg: '#e0f2fe', color: '#0369a1' },
    { title: 'Society', icon: Home, route: '/modules/society', bg: '#ccfbf1', color: '#0f766e' },
    { title: 'Earn Money', icon: IndianRupee, route: '/modules/earn', bg: '#fef9c3', color: '#a16207' },
  ];

  const ACCOUNT_ACTIONS = [
    { title: 'My Profile', icon: User, route: '/(tabs)/profile' },
    { title: 'Regional Languages', icon: Globe, route: '/modules/languages' },
    { title: 'Settings', icon: Settings, route: '/modules/settings' },
    { title: 'Help & Support', icon: ShieldCheck, route: '/modules/support' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>All Services</Text>
          <Text style={styles.headerSubtitle}>Discover everything LocalSampark has to offer</Text>
        </View>

        {/* Super-App Grid */}
        <View style={styles.gridContainer}>
          {MODULES.map((mod, index) => {
            const IconComponent = mod.icon;
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.gridItem, { width: colWidth }]}
                onPress={() => router.push(mod.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: mod.bg }]}>
                  <IconComponent size={28} color={mod.color} strokeWidth={2.5} />
                </View>
                <Text style={styles.itemTitle}>{mod.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Account Settings List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.listContainer}>
            {ACCOUNT_ACTIONS.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.listItem, index !== ACCOUNT_ACTIONS.length - 1 && styles.borderBottom]}
                  onPress={() => router.push(action.route)}
                >
                  <View style={styles.listIconBox}>
                    <ActionIcon size={20} color="#64748b" />
                  </View>
                  <Text style={styles.listText}>{action.title}</Text>
                </TouchableOpacity>
              );
            })}
            
            {/* Logout */}
            <TouchableOpacity style={styles.listItem} onPress={() => { /* Implement Logout */ }}>
              <View style={[styles.listIconBox, { backgroundColor: '#fee2e2' }]}>
                <LogOut size={20} color="#ef4444" />
              </View>
              <Text style={[styles.listText, { color: '#ef4444' }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  gridItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    marginLeft: 4,
  },
  listContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
});
