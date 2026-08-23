import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { API_V1 } from '../../config/api';
export default function TownSquareScreen() {
  const [activeTab, setActiveTab] = useState('news');
  const [news, setNews] = useState([]);
  const [polls, setPolls] = useState([]);
  const [pendingNews, setPendingNews] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [votedPolls, setVotedPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newTipTitle, setNewTipTitle] = useState('');
  const [newTipContent, setNewTipContent] = useState('');
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOption1, setNewPollOption1] = useState('');
  const [newPollOption2, setNewPollOption2] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const storedVotes = await AsyncStorage.getItem('votedPolls');
      if (storedVotes) setVotedPolls(JSON.parse(storedVotes));

      const token = await AsyncStorage.getItem('token');
      if (token) {
        // Simplified role check for mobile
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (['superadmin', 'admin', 'territory_admin', 'area_agent'].includes(payload.role)) {
          setIsAdmin(true);
          fetchPendingTips(token);
        }
      }

      await Promise.all([fetchNews(), fetchPolls()]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/townsquare/news`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const parsedNews = data.data.map(n => {
          try {
            const parsed = JSON.parse(n.content);
            return { ...n, title: parsed.title, contentText: parsed.text };
          } catch(e) {
            return { ...n, title: 'Notice', contentText: n.content };
          }
        });
        setNews(parsedNews);
      }
    } catch (e) {}
  };

  const fetchPolls = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/townsquare/polls`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setPolls(data.data);
    } catch (e) {}
  };

  const fetchPendingTips = async (token) => {
    try {
      const res = await fetch(`${API_V1}/townsquare/news/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const parsedPending = data.data.map(n => {
          try {
            const parsed = JSON.parse(n.content);
            return { ...n, title: parsed.title, contentText: parsed.text };
          } catch(e) {
            return { ...n, title: 'Notice', contentText: n.content };
          }
        });
        setPendingNews(parsedPending);
      }
    } catch(e) {}
  };

  const submitNewsTip = async () => {
    if (!newTipTitle || !newTipContent) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = { title: newTipTitle, content: newTipContent, pincode: '400001', location: '' };
      const data = await apiPost('/townsquare/news', payload);
      Alert.alert('Success', data.message);
      setNewTipTitle('');
      setNewTipContent('');
      fetchNews();
    } catch(e) {}
  };

  const handleVote = async (pollId, optionId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await apiPost(`/townsquare/polls/${pollId}/vote`, { optionId });
      if (data.success) {
        Alert.alert('Success', data.message);
        const updatedVotes = [...votedPolls, pollId];
        setVotedPolls(updatedVotes);
        await AsyncStorage.setItem('votedPolls', JSON.stringify(updatedVotes));
        fetchPolls();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch(e) {}
  };

  // handleAdminAction (approve/reject a news item) and createAdminPoll
  // (publish a poll) were merged into one function under the wrong name and
  // wrong body — the approve/reject buttons called a function that actually
  // built a poll payload from `options`, a variable that was never declared,
  // while the "Publish Poll" button referenced a `createAdminPoll` that
  // didn't exist anywhere. Both crashed on tap. Split back into two; no
  // matching backend route exists for either yet (checked src/routes), so
  // both still resolve through the existing try/catch no-op on failure.
  const handleAdminAction = async (id, action) => {
    try {
      await apiPost(`/townsquare/news/${id}/${action}`, {});
      fetchPolls();
    } catch (e) {}
  };

  const createAdminPoll = async () => {
    try {
      const data = await apiPost('/townsquare/polls', {
        question: newPollQuestion,
        options: [newPollOption1, newPollOption2].filter(Boolean),
        rewardCoins: 5,
      });
      Alert.alert('Success', data.message || 'Poll published.');
      setNewPollQuestion('');
      setNewPollOption1('');
      setNewPollOption2('');
      fetchPolls();
    } catch (e) {}
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Town Square</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'news' && styles.tabBtnActive]} onPress={() => setActiveTab('news')}>
          <Text style={[styles.tabBtnText, activeTab === 'news' && styles.tabBtnTextActive]}>Local News</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'polls' && styles.tabBtnActive]} onPress={() => setActiveTab('polls')}>
          <Text style={[styles.tabBtnText, activeTab === 'polls' && styles.tabBtnTextActive]}>Polls</Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'admin' && styles.tabBtnActive]} onPress={() => setActiveTab('admin')}>
            <Text style={[styles.tabBtnText, activeTab === 'admin' && styles.tabBtnTextActive]}>Admin</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* News Tab */}
        {activeTab === 'news' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Submit a News Tip</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Headline" 
                value={newTipTitle} 
                onChangeText={setNewTipTitle} 
              />
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                placeholder="What's happening in your area?" 
                value={newTipContent} 
                onChangeText={setNewTipContent} 
                multiline 
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={submitNewsTip}>
                <Text style={styles.primaryBtnText}>Submit Tip</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.headingLabel}>Latest Headlines</Text>
            {news.map(n => (
              <View key={n.id} style={styles.newsCard}>
                <Text style={styles.newsTitle}>{n.title}</Text>
                <Text style={styles.newsContent}>{n.contentText}</Text>
                <View style={styles.newsFooter}>
                  <Text style={styles.newsAuthor}>By: {n.author_name}</Text>
                  <Text style={styles.newsDate}>{new Date(n.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Polls Tab */}
        {activeTab === 'polls' && (
          <View>
            <View style={styles.infoBanner}>
              <Text style={styles.infoIcon}>🪙</Text>
              <Text style={styles.infoText}>Vote in community polls to earn Gamification points!</Text>
            </View>

            {polls.map(p => {
              const options = typeof p.options === 'string' ? JSON.parse(p.options) : p.options;
              const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);
              const hasVoted = votedPolls.includes(p.id);

              return (
                <View key={p.id} style={styles.pollCard}>
                  <View style={styles.pollHeader}>
                    <Text style={styles.pollQuestion}>{p.question}</Text>
                    {hasVoted ? (
                      <View style={styles.votedBadge}><Text style={styles.votedBadgeText}>✔ Voted</Text></View>
                    ) : (
                      <View style={styles.voteBadge}><Text style={styles.voteBadgeText}>Vote</Text></View>
                    )}
                  </View>

                  {options.map(opt => {
                    const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                    return (
                      <TouchableOpacity 
                        key={opt.id} 
                        style={styles.pollOption} 
                        onPress={() => !hasVoted && handleVote(p.id, opt.id)}
                        disabled={hasVoted}
                      >
                        <View style={[styles.pollProgress, { width: `${percent}%` }]} />
                        <View style={styles.pollOptionContent}>
                          <Text style={styles.pollOptionText}>{opt.text}</Text>
                          <Text style={styles.pollOptionPercent}>{percent}% ({opt.votes})</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <Text style={styles.pollTotalVotes}>{totalVotes} Total Votes</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && isAdmin && (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Moderate News Tips</Text>
              {pendingNews.length === 0 && <Text style={styles.emptyText}>No pending tips.</Text>}
              
              {pendingNews.map(n => (
                <View key={n.id} style={styles.pendingCard}>
                  <Text style={styles.newsTitle}>{n.title}</Text>
                  <Text style={styles.newsContent}>{n.contentText}</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleAdminAction(n.id, 'approve')}>
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleAdminAction(n.id, 'reject')}>
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Create New Poll</Text>
              <TextInput style={styles.input} placeholder="Poll Question" value={newPollQuestion} onChangeText={setNewPollQuestion} />
              <Text style={styles.label}>Options</Text>
              <TextInput style={styles.input} placeholder="Option 1" value={newPollOption1} onChangeText={setNewPollOption1} />
              <TextInput style={styles.input} placeholder="Option 2" value={newPollOption2} onChangeText={setNewPollOption2} />
              <TouchableOpacity style={styles.primaryBtn} onPress={createAdminPoll}>
                <Text style={styles.primaryBtnText}>Publish Poll</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  tabBtnActive: { borderColor: '#3b82f6' },
  tabBtnText: { fontWeight: '600', color: '#64748b' },
  tabBtnTextActive: { color: '#3b82f6', fontWeight: '700' },
  
  content: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12, color: '#0f172a' },
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 24 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  headingLabel: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16, borderLeftWidth: 4, borderColor: '#3b82f6', paddingLeft: 12 },
  
  newsCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, borderLeftWidth: 4, borderColor: '#10b981' },
  newsTitle: { fontSize: 18, fontWeight: '800', color: '#3b82f6', marginBottom: 8 },
  newsContent: { fontSize: 15, color: '#334155', lineHeight: 22, marginBottom: 16 },
  newsFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  newsAuthor: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  newsDate: { fontSize: 12, color: '#94a3b8' },

  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6', marginBottom: 20 },
  infoIcon: { fontSize: 24, marginRight: 12 },
  infoText: { flex: 1, color: '#3b82f6', fontWeight: '700' },

  pollCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  pollHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pollQuestion: { flex: 1, fontSize: 16, fontWeight: '800', color: '#0f172a', marginRight: 12 },
  votedBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  votedBadgeText: { color: '#3b82f6', fontSize: 10, fontWeight: '800' },
  voteBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  voteBadgeText: { color: '#64748b', fontSize: 10, fontWeight: '800' },

  pollOption: { backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, overflow: 'hidden', height: 48 },
  pollProgress: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#3b82f6', opacity: 0.15 },
  pollOptionContent: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  pollOptionText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  pollOptionPercent: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  pollTotalVotes: { textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 8 },

  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', marginVertical: 12 },
  pendingCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  approveBtn: { backgroundColor: '#3b82f6' },
  approveBtnText: { color: '#fff', fontWeight: '700' },
  rejectBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ef4444' },
  rejectBtnText: { color: '#ef4444', fontWeight: '700' }
});
