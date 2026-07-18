import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { withRoleGuard } from '../../../src/utils/permissions';

function CRMScreen() {
  const [activeTab, setActiveTab] = useState('pipeline'); // pipeline, leads, campaigns, revenue, support

  // Pipeline Board State
  const [pipelineLeads, setPipelineLeads] = useState([
    { id: 1, name: 'Sharma Dairy Grocery', stage: 'Onboarding', value: '₹1,200/mo', type: 'Merchant' },
    { id: 2, name: 'Sunil Deshmukh', stage: 'Inquiry', value: '₹25,000', type: 'Franchise Partner' },
    { id: 3, name: 'Prajapati Electricals', stage: 'Verified', value: '₹499/mo', type: 'Merchant' }
  ]);

  // Leads Directory State
  const [leads, setLeads] = useState([
    { id: 1, name: 'Sharma Dairy & Grocery', source: 'Website Registration', email: 'sharma@gmail.com', phone: '+91 9999988888', status: 'New' },
    { id: 2, name: 'Sanjay Kumar (Plumbing)', source: 'Franchise Reference', email: 'sanjay@gmail.com', phone: '+91 9888877777', status: 'Contacted' },
    { id: 3, name: 'Ganga Aria Gate Security', source: 'Admin Onboarding', email: 'ganga_aria@gmail.com', phone: '+91 9777766666', status: 'Onboarded' }
  ]);

  // Campaigns State
  const [campaigns, setCampaigns] = useState([
    { id: 1, name: 'Dhanori Monsoon Offer', channel: 'SMS', sent: 1200, clicks: 450, status: 'Completed' },
    { id: 2, name: 'Society Safety Announcement', channel: 'Push Notification', sent: 2500, clicks: 1800, status: 'Active' }
  ]);
  const [campName, setCampName] = useState('');
  const [campChannel, setCampChannel] = useState('SMS');

  // Revenue Split State
  const [platformShare, setPlatformShare] = useState('40');
  const [franchiseShare, setFranchiseShare] = useState('30');
  const mockTransactions = [
    { id: 1, type: 'Shop Listing (Sharma Dairy)', gross: 999.00, dev: '₹399.60', partner: '₹299.70', status: 'Completed' },
    { id: 2, type: 'Delivery Fee (Run #420)', gross: 40.00, dev: '₹16.00', partner: '₹12.00', status: 'Completed' }
  ];

  // Support Tickets State
  const [tickets, setTickets] = useState([
    { id: 1, title: 'Delivery delay at Sharma Grocery', user: 'Rohan Patil', priority: 'High', status: 'Open' },
    { id: 2, title: 'UPI Load money failed transaction', user: 'Sunita Joshi', priority: 'Medium', status: 'Resolved' }
  ]);

  // Operations CRM Handlers
  const handleMoveStage = (id, currentStage, direction) => {
    const stages = ['Inquiry', 'Onboarding', 'Verified'];
    const currentIndex = stages.indexOf(currentStage);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < stages.length) {
      setPipelineLeads(prev => prev.map(l => l.id === id ? { ...l, stage: stages[newIndex] } : l));
    }
  };

  const handleUpdateLeadStatus = (id, status) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    Alert.alert('Status Updated', `Lead status changed to ${status}`);
  };

  const handleLaunchCampaign = () => {
    if (!campName) return Alert.alert('Error', 'Please enter a campaign name');
    const newCamp = {
      id: Date.now(),
      name: campName,
      channel: campChannel,
      sent: 0,
      clicks: 0,
      status: 'Pending Start'
    };
    setCampaigns([newCamp, ...campaigns]);
    setCampName('');
    Alert.alert('Campaign Scheduled', `"${campName}" scheduled for broadcast!`);
  };

  const handleUpdatePolicy = () => {
    Alert.alert('Policy Updated', `Commission splits saved:\nPlatform Dev: ${platformShare}%\nFranchise: ${franchiseShare}%`);
  };

  const handleResolveTicket = (id) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'Resolved' } : t));
    Alert.alert('Success', 'Ticket resolved.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📊 Operations CRM</Text>
      </View>

      {/* Tabs Selector */}
      <View style={{ height: 52 }}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {[
            { key: 'pipeline', label: 'Pipeline Board' },
            { key: 'leads', label: 'Leads Directory' },
            { key: 'campaigns', label: 'Campaigns' },
            { key: 'revenue', label: 'Revenue Split' },
            { key: 'support', label: 'Support Tickets' }
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabButton, activeTab === t.key && styles.tabButtonActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. PIPELINE BOARD VIEW */}
        {activeTab === 'pipeline' && (
          <View>
            <Text style={styles.sectionHeader}>Lead Pipeline Kanban</Text>
            {['Inquiry', 'Onboarding', 'Verified'].map(stage => {
              const leadsInStage = pipelineLeads.filter(l => l.stage === stage);
              return (
                <View key={stage} style={styles.stageCard}>
                  <View style={styles.stageHeader}>
                    <Text style={styles.stageTitle}>{stage}</Text>
                    <Text style={styles.stageCount}>{leadsInStage.length}</Text>
                  </View>
                  
                  {leadsInStage.map(l => (
                    <View key={l.id} style={styles.leadCard}>
                      <View style={styles.leadTypeBadge}>
                        <Text style={styles.leadTypeText}>{l.type}</Text>
                      </View>
                      <Text style={styles.leadName}>{l.name}</Text>
                      <Text style={styles.leadValue}>Est. {l.value}</Text>
                      
                      <View style={styles.kanbanControls}>
                        {stage !== 'Inquiry' && (
                          <TouchableOpacity onPress={() => handleMoveStage(l.id, stage, -1)} style={styles.kanbanBtn}>
                            <Text style={styles.kanbanBtnText}>◀ Move Back</Text>
                          </TouchableOpacity>
                        )}
                        {stage !== 'Verified' && (
                          <TouchableOpacity onPress={() => handleMoveStage(l.id, stage, 1)} style={[styles.kanbanBtn, { marginLeft: 'auto' }]}>
                            <Text style={[styles.kanbanBtnText, { color: '#60a5fa' }]}>Move Next ▶</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                  {leadsInStage.length === 0 && <Text style={styles.emptyText}>No leads in this stage.</Text>}
                </View>
              );
            })}
          </View>
        )}

        {/* 2. LEADS DIRECTORY VIEW */}
        {activeTab === 'leads' && (
          <View>
            <Text style={styles.sectionHeader}>Leads Registry</Text>
            {leads.map(l => (
              <View key={l.id} style={styles.itemCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.itemName}>{l.name}</Text>
                  <View style={[styles.badge, l.status === 'Onboarded' ? styles.badgeSuccess : styles.badgePrimary]}>
                    <Text style={styles.badgeText}>{l.status}</Text>
                  </View>
                </View>
                <Text style={styles.metaLabel}>Source: {l.source}</Text>
                <Text style={styles.metaLabel}>Email: {l.email}</Text>
                <Text style={styles.metaLabel}>Phone: {l.phone}</Text>
                
                <View style={styles.actionRow}>
                  <TouchableOpacity onPress={() => handleUpdateLeadStatus(l.id, 'Contacted')} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>Contact</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleUpdateLeadStatus(l.id, 'Onboarded')} style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}>
                    <Text style={styles.actionBtnText}>Onboard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 3. CAMPAIGNS VIEW */}
        {activeTab === 'campaigns' && (
          <View>
            <Text style={styles.sectionHeader}>Create Campaign</Text>
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Campaign Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Dhanori Festive Sale" 
                placeholderTextColor="#64748b" 
                value={campName} 
                onChangeText={setCampName}
              />
              <Text style={styles.fieldLabel}>Select Channel</Text>
              <View style={styles.channelsRow}>
                {['SMS', 'Email', 'Push Notification'].map(ch => (
                  <TouchableOpacity 
                    key={ch} 
                    style={[styles.channelChip, campChannel === ch && styles.channelChipActive]}
                    onPress={() => setCampChannel(ch)}
                  >
                    <Text style={[styles.channelChipText, campChannel === ch && styles.channelChipTextActive]}>{ch}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={handleLaunchCampaign} style={styles.launchBtn}>
                <Text style={styles.launchBtnText}>Launch Broadcast</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Campaign Analytics</Text>
            {campaigns.map(c => (
              <View key={c.id} style={styles.itemCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.itemName}>{c.name}</Text>
                  <View style={[styles.badge, styles.badgeSecondary]}><Text style={styles.badgeText}>{c.status}</Text></View>
                </View>
                <Text style={styles.metaLabel}>Channel: {c.channel}</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                  <Text style={styles.statsLabel}>Sent: <Text style={{ color: '#0f172a', fontWeight: 'bold' }}>{c.sent}</Text></Text>
                  <Text style={styles.statsLabel}>Clicks: <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>{c.clicks}</Text></Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 4. REVENUE SPLIT VIEW */}
        {activeTab === 'revenue' && (
          <View>
            <Text style={styles.sectionHeader}>Adjust Platform Splits</Text>
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Platform Dev Share (%)</Text>
              <TextInput style={styles.input} value={platformShare} onChangeText={setPlatformShare} keyboardType="numeric" />
              <Text style={styles.fieldLabel}>Franchise Partner Share (%)</Text>
              <TextInput style={styles.input} value={franchiseShare} onChangeText={setFranchiseShare} keyboardType="numeric" />
              <TouchableOpacity onPress={handleUpdatePolicy} style={styles.launchBtn}>
                <Text style={styles.launchBtnText}>Update Payout Policy</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Split Guidelines</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>• Dev Share: Core infrastructure, hosting & upgrades</Text>
              <Text style={styles.infoText}>• Partner Share: Merchant onboarding & zone operations</Text>
              <Text style={styles.infoText}>• Rewards & Reserve: 20% users rewards, 10% emergency SOS</Text>
            </View>

            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>split Ledger</Text>
            {mockTransactions.map(tx => (
              <View key={tx.id} style={styles.itemCard}>
                <Text style={styles.itemName}>{tx.type}</Text>
                <Text style={[styles.metaLabel, { color: '#10b981', fontWeight: 'bold', fontSize: 14, marginVertical: 4 }]}>Gross: ₹{tx.gross.toFixed(2)}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={styles.statsLabel}>Dev: {tx.dev}</Text>
                  <Text style={styles.statsLabel}>Partner: {tx.partner}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 5. SUPPORT TICKETS VIEW */}
        {activeTab === 'support' && (
          <View>
            <Text style={styles.sectionHeader}>Incoming Customer Tickets</Text>
            {tickets.map(t => (
              <View key={t.id} style={[styles.itemCard, t.priority === 'High' && { borderLeftWidth: 4, borderLeftColor: '#ef4444' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.itemName}>{t.title}</Text>
                  <View style={[styles.badge, t.status === 'Resolved' ? styles.badgeSuccess : styles.badgePrimary]}>
                    <Text style={styles.badgeText}>{t.status}</Text>
                  </View>
                </View>
                <Text style={styles.metaLabel}>Created by: {t.user}</Text>
                <Text style={styles.metaLabel}>Priority: <Text style={{ color: t.priority === 'High' ? '#ef4444' : '#f59e0b', fontWeight: 'bold' }}>{t.priority}</Text></Text>
                
                {t.status !== 'Resolved' && (
                  <TouchableOpacity onPress={() => handleResolveTicket(t.id)} style={[styles.actionBtn, { marginTop: 12, width: '100%', backgroundColor: '#10b981' }]}>
                    <Text style={styles.actionBtnText}>Mark Resolved</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  tabsScroll: { flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  tabButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginLeft: 8 },
  tabButtonActive: { backgroundColor: '#3b82f6' },
  tabLabel: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
  tabLabelActive: { color: '#0f172a' },

  content: { padding: 16, paddingBottom: 40 },
  sectionHeader: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },

  stageCard: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', padding: 16, marginBottom: 16 },
  stageHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ffffff', paddingBottom: 8, marginBottom: 12 },
  stageTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  stageCount: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
  
  leadCard: { backgroundColor: '#ffffff', padding: 12, borderRadius: 8, marginBottom: 12 },
  leadTypeBadge: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8 },
  leadTypeText: { color: '#475569', fontSize: 10, fontWeight: 'bold' },
  leadName: { color: '#0f172a', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  leadValue: { color: '#10b981', fontSize: 13, fontWeight: 'bold' },
  kanbanControls: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8 },
  kanbanBtn: { paddingVertical: 4 },
  kanbanBtnText: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  emptyText: { color: '#64748b', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 12 },

  itemCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', marginBottom: 12 },
  itemName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  metaLabel: { color: '#64748b', fontSize: 12, marginTop: 4 },
  statsLabel: { color: '#64748b', fontSize: 12 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgePrimary: { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
  badgeSecondary: { backgroundColor: '#e2e8f0' },
  badgeText: { color: '#0f172a', fontSize: 10, fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: { flex: 1, backgroundColor: '#ffffff', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  actionBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 12 },

  formCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', marginBottom: 16 },
  fieldLabel: { color: '#475569', fontSize: 13, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, color: '#0f172a', padding: 12, marginBottom: 16 },
  channelsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  channelChip: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  channelChipActive: { backgroundColor: '#3b82f6' },
  channelChipText: { color: '#475569', fontSize: 12 },
  channelChipTextActive: { color: '#0f172a', fontWeight: 'bold' },
  launchBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  launchBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },

  infoCard: { backgroundColor: 'rgba(59, 130, 246, 0.05)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.15)', padding: 16, borderRadius: 12, marginBottom: 16 },
  infoText: { color: '#64748b', fontSize: 13, marginBottom: 6, lineHeight: 18 }
});

export default withRoleGuard(CRMScreen, 'crm');
