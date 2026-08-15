import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, StyleSheet, TextInput, Modal, Alert, FlatList, RefreshControl, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, Briefcase, MapPin, Clock, Building2, Star, Bookmark, BookmarkCheck, Send, Users, Mic, MicOff, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiGet, apiPost } from '../../src/lib/api';

const JOB_TYPES = [{ v: '', l: 'All' }, { v: 'full_time', l: 'Full-Time' }, { v: 'part_time', l: 'Part-Time' }, { v: 'gig', l: 'Gig' }, { v: 'internship', l: 'Internship' }];
const STAGE_CONFIG = { applied: { color: '#3b82f6', label: 'Applied' }, shortlisted: { color: '#eab308', label: 'Shortlisted' }, interviewing: { color: '#8b5cf6', label: 'Interviewing' }, offered: { color: '#10b981', label: 'Offered' }, hired: { color: '#22c55e', label: '🎉 Hired' }, rejected: { color: '#ef4444', label: 'Rejected' } };

export default function JobsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('browse');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [jobType, setJobType] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [applyNote, setApplyNote] = useState('');
  const [applied, setApplied] = useState(false);
  const [matchScore, setMatchScore] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [resume, setResume] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/jobs/postings?limit=30';
      if (jobType) url += `&job_type=${jobType}`;
      if (searchQ) url += `&search=${encodeURIComponent(searchQ)}`;
      const data = await apiGet(url);
      setJobs(data?.jobs || data?.data || []);
    } catch (e) { setJobs([]); }
    setLoading(false);
  }, [jobType, searchQ]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    if (tab === 'applications') {
      apiGet('/jobs/applications').then(d => setApplications(d?.applications || [])).catch(() => {});
    }
    if (tab === 'resume') {
      apiGet('/jobs/resumes/me').then(d => { setResume(d?.resume || null); setSkills(d?.skills || []); }).catch(() => {});
      apiGet('/jobs/recommendations').then(d => setRecommendations(d?.recommendations || [])).catch(() => {});
    }
  }, [tab]);

  const onRefresh = async () => { setRefreshing(true); await fetchJobs(); setRefreshing(false); };

  const toggleSave = async (jobId) => {
    try {
      const data = await apiPost(`/jobs/postings/${jobId}/save`);
      setSavedIds(prev => { const n = new Set(prev); data?.saved ? n.add(jobId) : n.delete(jobId); return n; });
    } catch (e) {}
  };

  const handleApply = async () => {
    try {
      const data = await apiPost('/jobs/apply', { jobId: selectedJob.id, cover_note: applyNote, resume_id: resume?.id });
      setApplied(true);
      setMatchScore(data?.matchScore || null);
      setTimeout(() => { setShowApply(false); setApplied(false); setApplyNote(''); setMatchScore(null); }, 3000);
    } catch (e) { Alert.alert('Error', 'Failed to apply'); }
  };

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    try {
      await apiPost('/jobs/resumes', { skills: [...skills.map(s => s.skill_name), newSkill.trim()] });
      setSkills(prev => [...prev, { skill_name: newSkill.trim(), proficiency: 'intermediate' }]);
      setNewSkill('');
    } catch (e) {}
  };

  const JobCard = ({ job }) => {
    const typeColors = { full_time: '#10b981', part_time: '#3b82f6', gig: '#eab308', internship: '#8b5cf6', contract: '#06b6d4' };
    const color = typeColors[job.job_type] || '#3b82f6';
    const isSaved = savedIds.has(job.id);
    const jobSkills = (() => { try { return typeof job.skills_required === 'string' ? JSON.parse(job.skills_required) : (job.skills_required || []); } catch { return []; } })();

    return (
      <TouchableOpacity style={s.jobCard} onPress={() => { setSelectedJob(job); setShowDetail(true); }} activeOpacity={0.8}>
        <View style={s.jobHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.jobTitle} numberOfLines={2}>{job.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Building2 color="#94a3b8" size={12} />
              <Text style={s.companyText}>{job.company_name || job.shop_name || 'Local Business'}</Text>
              {job.company_rating > 0 && <Text style={{ color: '#eab308', fontSize: 11 }}>⭐ {parseFloat(job.company_rating).toFixed(1)}</Text>}
            </View>
          </View>
          <TouchableOpacity onPress={() => toggleSave(job.id)} style={{ padding: 4 }}>
            {isSaved ? <BookmarkCheck color="#3b82f6" size={20} fill="#3b82f6" /> : <Bookmark color="#94a3b8" size={20} />}
          </TouchableOpacity>
        </View>

        <Text style={s.jobDesc} numberOfLines={2}>{job.description}</Text>

        {jobSkills.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {jobSkills.slice(0, 3).map((sk, i) => (
              <View key={i} style={s.skillChip}><Text style={s.skillChipText}>{typeof sk === 'object' ? sk.name : sk}</Text></View>
            ))}
            {jobSkills.length > 3 && <Text style={[s.metaText, { paddingTop: 3 }]}>+{jobSkills.length - 3}</Text>}
          </View>
        )}

        <View style={s.jobFooter}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={[s.typeBadge, { backgroundColor: color + '22' }]}>
              <Text style={[s.typeBadgeText, { color }]}>{(job.job_type || 'full_time').replace('_', '-')}</Text>
            </View>
            {job.salary_range && <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '700' }}>₹{job.salary_range}</Text>}
            {job.remote_allowed ? <Text style={{ color: '#06b6d4', fontSize: 10, fontWeight: '700' }}>🏠 Remote</Text> : null}
          </View>
          {job.urgency === 'urgent' && <View style={[s.typeBadge, { backgroundColor: '#ef444422' }]}><Text style={[s.typeBadgeText, { color: '#ef4444' }]}>🔥 Urgent</Text></View>}
        </View>

        {job.match_score !== undefined && (
          <View style={[s.typeBadge, { backgroundColor: job.match_score >= 70 ? '#10b98122' : '#eab30822', marginTop: 6 }]}>
            <Text style={[s.typeBadgeText, { color: job.match_score >= 70 ? '#10b981' : '#eab308' }]}>{job.match_score}% match</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#1e40af', '#3b82f6']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
        <Text style={s.headerTitle}>💼 Local Jobs</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        {[{ k: 'browse', l: '🔍 Jobs' }, { k: 'applications', l: '📋 Track' }, { k: 'resume', l: '📄 Resume' }].map(t => (
          <TouchableOpacity key={t.k} onPress={() => setTab(t.k)} style={[s.tabItem, tab === t.k && s.tabItemActive]}>
            <Text style={[s.tabText, tab === t.k && s.tabTextActive]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ═══ BROWSE ═══ */}
      {tab === 'browse' && (
        <>
          <View style={s.searchBox}>
            <Search color="#94a3b8" size={16} />
            <TextInput style={s.searchInput} placeholder="Search jobs, skills..." placeholderTextColor="#94a3b8" value={searchQ} onChangeText={setSearchQ} returnKeyType="search" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: 8 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
            {JOB_TYPES.map(t => (
              <TouchableOpacity key={t.v} onPress={() => setJobType(t.v)} style={[s.filterPill, jobType === t.v && s.filterPillActive]}>
                <Text style={[s.filterPillText, jobType === t.v && { color: '#fff' }]}>{t.l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={s.centerView}><ActivityIndicator size="large" color="#3b82f6" /></View>
          ) : (
            <FlatList data={jobs} keyExtractor={(item, i) => item.id || String(i)}
              renderItem={({ item }) => <JobCard job={item} />}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
              ListEmptyComponent={
                <View style={s.centerView}><Text style={{ fontSize: 48, marginBottom: 12 }}>💼</Text><Text style={s.emptyTitle}>No jobs found</Text></View>
              }
            />
          )}
        </>
      )}

      {/* ═══ APPLICATIONS ═══ */}
      {tab === 'applications' && (
        <FlatList data={applications} keyExtractor={(item, i) => item.id || String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item: app }) => {
            const stg = STAGE_CONFIG[app.stage || 'applied'] || STAGE_CONFIG.applied;
            const stages = ['applied','shortlisted','interviewing','offered','hired'];
            const currentIdx = stages.indexOf(app.stage || 'applied');
            return (
              <View style={s.appCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.jobTitle}>{app.job_title}</Text>
                    <Text style={s.companyText}>{app.company_name || 'Company'}</Text>
                  </View>
                  <View style={[s.typeBadge, { backgroundColor: stg.color + '22' }]}>
                    <Text style={[s.typeBadgeText, { color: stg.color }]}>{stg.label}</Text>
                  </View>
                </View>
                {app.match_score > 0 && <Text style={{ color: app.match_score >= 70 ? '#10b981' : '#eab308', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>{app.match_score}% skill match</Text>}
                {/* Stage Pipeline */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  {stages.map((stage, idx) => (
                    <React.Fragment key={stage}>
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: idx <= currentIdx ? '#3b82f6' : '#334155', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>{idx <= currentIdx ? '✓' : idx + 1}</Text>
                      </View>
                      {idx < stages.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: idx < currentIdx ? '#3b82f6' : '#334155' }} />}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<View style={s.centerView}><Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text><Text style={s.emptyTitle}>No applications yet</Text></View>}
        />
      )}

      {/* ═══ RESUME ═══ */}
      {tab === 'resume' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Health Score */}
          <View style={s.resumeHealth}>
            <Text style={s.sectionTitle}>📄 Resume Health</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
              <View style={s.healthCircle}>
                <Text style={[s.healthScore, { color: (resume?.health_score || 0) >= 70 ? '#10b981' : '#eab308' }]}>{resume?.health_score || 0}%</Text>
              </View>
            </View>
          </View>

          {/* Skills */}
          <View style={s.skillsSection}>
            <Text style={s.sectionTitle}>🎯 Skills ({skills.length})</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {skills.map((sk, i) => (
                <View key={i} style={[s.skillChip, { backgroundColor: '#3b82f622' }]}>
                  <Text style={[s.skillChipText, { color: '#3b82f6' }]}>{sk.skill_name}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TextInput style={[s.formInput, { flex: 1, marginBottom: 0 }]} placeholder="Add skill (e.g. React, Excel)" placeholderTextColor="#94a3b8" value={newSkill} onChangeText={setNewSkill} onSubmitEditing={addSkill} />
              <TouchableOpacity onPress={addSkill} style={s.addSkillBtn}><Plus color="#fff" size={18} /></TouchableOpacity>
            </View>
          </View>

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={s.sectionTitle}>✨ AI Recommended Jobs</Text>
              {recommendations.slice(0, 5).map((job, i) => <JobCard key={job.id || i} job={job} />)}
            </View>
          )}
        </ScrollView>
      )}

      {/* ═══ JOB DETAIL MODAL ═══ */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {selectedJob && (
              <ScrollView>
                <Text style={s.sectionTitle}>{selectedJob.title}</Text>
                <Text style={s.companyText}>{selectedJob.company_name || 'Local Business'}</Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, marginBottom: 12 }}>
                  <View style={[s.typeBadge, { backgroundColor: '#3b82f622' }]}><Text style={[s.typeBadgeText, { color: '#3b82f6' }]}>{(selectedJob.job_type || 'full_time').replace('_', '-')}</Text></View>
                  {selectedJob.salary_range && <View style={[s.typeBadge, { backgroundColor: '#10b98122' }]}><Text style={[s.typeBadgeText, { color: '#10b981' }]}>₹{selectedJob.salary_range}</Text></View>}
                  {selectedJob.remote_allowed ? <View style={[s.typeBadge, { backgroundColor: '#06b6d422' }]}><Text style={[s.typeBadgeText, { color: '#06b6d4' }]}>🏠 Remote</Text></View> : null}
                  {selectedJob.urgency === 'urgent' && <View style={[s.typeBadge, { backgroundColor: '#ef444422' }]}><Text style={[s.typeBadgeText, { color: '#ef4444' }]}>🔥 Urgent</Text></View>}
                </View>

                <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginBottom: 16 }}>{selectedJob.description}</Text>
                {selectedJob.requirements && <>
                  <Text style={{ color: '#e2e8f0', fontWeight: '700', fontSize: 14, marginBottom: 4 }}>Requirements</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 16 }}>{selectedJob.requirements}</Text>
                </>}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => { setShowDetail(false); setShowApply(true); }} style={[s.primaryBtn, { flex: 1 }]}>
                    <Text style={s.primaryBtnText}>Quick Apply 🚀</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleSave(selectedJob.id)} style={s.saveBtn}>
                    {savedIds.has(selectedJob.id) ? <BookmarkCheck color="#3b82f6" size={20} fill="#3b82f6" /> : <Bookmark color="#94a3b8" size={20} />}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setShowDetail(false)} style={{ marginTop: 12, alignItems: 'center' }}><Text style={s.metaText}>Close</Text></TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══ APPLY MODAL ═══ */}
      <Modal visible={showApply} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {applied ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
                <Text style={s.sectionTitle}>Application Sent!</Text>
                {matchScore !== null && (
                  <Text style={{ color: matchScore >= 70 ? '#10b981' : '#eab308', fontSize: 28, fontWeight: '900', marginTop: 8 }}>{matchScore}% match</Text>
                )}
                <Text style={[s.metaText, { marginTop: 8 }]}>Track your application in the Applications tab</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionTitle}>Apply to {selectedJob?.title}</Text>
                {resume && <View style={{ backgroundColor: '#10b98122', borderRadius: 12, padding: 10, marginBottom: 12 }}><Text style={{ color: '#10b981', fontSize: 12 }}>📄 Resume attached automatically</Text></View>}
                {skills.length > 0 && <View style={{ backgroundColor: '#3b82f622', borderRadius: 12, padding: 10, marginBottom: 12 }}><Text style={{ color: '#3b82f6', fontSize: 12 }}>✨ AI skill matching enabled</Text></View>}
                <TextInput style={[s.formInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Cover note (optional)..." placeholderTextColor="#94a3b8" multiline value={applyNote} onChangeText={setApplyNote} />
                <TouchableOpacity onPress={handleApply} style={s.primaryBtn}><Text style={s.primaryBtnText}>Submit Application 🚀</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowApply(false)} style={{ marginTop: 12, alignItems: 'center' }}><Text style={s.metaText}>Cancel</Text></TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  tabBar: { maxHeight: 50, paddingVertical: 8 },
  tabItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#1e293b' },
  tabItemActive: { backgroundColor: '#3b82f6' },
  tabText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterPillActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterPillText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  metaText: { color: '#94a3b8', fontSize: 11 },

  jobCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  jobHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  jobTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '800', lineHeight: 20 },
  companyText: { color: '#94a3b8', fontSize: 12 },
  jobDesc: { color: '#94a3b8', fontSize: 12, marginTop: 8, lineHeight: 18 },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  skillChip: { backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  skillChipText: { color: '#94a3b8', fontSize: 10, fontWeight: '600' },

  appCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },

  resumeHealth: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  healthCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  healthScore: { fontSize: 22, fontWeight: '900' },
  skillsSection: { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#334155' },
  formInput: { backgroundColor: '#0f172a', color: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155', fontSize: 14, marginBottom: 12 },
  addSkillBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },

  primaryBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  saveBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
});
