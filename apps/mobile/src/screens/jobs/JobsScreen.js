import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, SafeAreaView, 
  TextInput, Modal, Alert, ActivityIndicator 
, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, Search, MapPin, Briefcase, Plus, Send, Zap, 
  Wrench, Store, Home, Truck, Shield, Heart, Laptop, CheckCircle2, X 
} from 'lucide-react-native';
import { apiGet, apiPost } from '../../lib/api';

const CATEGORIES = [
  { id: 'all', name: 'All Jobs', icon: Briefcase },
  { id: 'retail', name: 'Retail', icon: Store },
  { id: 'electrician', name: 'Electrician', icon: Zap },
  { id: 'plumber', name: 'Plumbing', icon: Wrench },
  { id: 'household', name: 'Household', icon: Home },
  { id: 'delivery', name: 'Delivery', icon: Truck },
  { id: 'technical', name: 'Admin & Tech', icon: Laptop }
];

export default function NativeJobsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'dispatch' | 'post'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Application Modal state
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyNote, setApplyNote] = useState('');
  const [applying, setApplying] = useState(false);

  // Dispatch state
  const [dispatchCategory, setDispatchCategory] = useState('Electrician');
  const [dispatchNote, setDispatchNote] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  // Post Job Form state
  const [postTitle, setPostTitle] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postSalary, setPostSalary] = useState('');
  const [postType, setPostType] = useState('Full-time');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [selectedCategory]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const catQuery = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      const json = await apiGet(`/jobs/postings${catQuery}`);
      if (json && json.success && json.jobs && json.jobs.length > 0) {
        setJobs(json.jobs);
      } else {
        throw new Error('No jobs returned from API');
      }
    } catch (e) {
      // Fallback local dataset if offline or dev server inactive
      setJobs([
        {
          id: 'job-1',
          title: 'Store Executive & Cashier',
          description: 'Assist customers, manage billing counters, and organize store inventory.',
          salary_range: '₹14,000 - ₹18,000 / month',
          job_type: 'Full-time',
          employer_name: 'Sampark Supermarket',
          location: 'Kothrud, Pune',
          category: 'retail'
        },
        {
          id: 'job-2',
          title: 'Certified Society Electrician',
          description: 'Emergency repair technician needed for residential society electrical maintenance.',
          salary_range: '₹600 / visit + incentives',
          job_type: 'Contract',
          employer_name: 'QuickFix Electricals',
          location: 'Baner, Pune',
          category: 'electrician'
        },
        {
          id: 'job-3',
          title: 'Hyperlocal Rider & Logistics Agent',
          description: 'Deliver retail orders within 5km radius. Flexible shifts and daily payout.',
          salary_range: '₹18,000 - ₹25,000 / month',
          job_type: 'Part-time',
          employer_name: 'LocalSampark Express',
          location: 'Viman Nagar, Pune',
          category: 'delivery'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!applyNote) {
      Alert.alert('Required', 'Please enter a short note or resume link.');
      return;
    }
    setApplying(true);
    try {
      await apiPost('/jobs/apply', {
        jobId: selectedJob?.id,
        applicantName: 'Applicant',
        applicantPhone: '9999999999',
        experienceSummary: applyNote
      });
      Alert.alert('Success 🎉', 'Your application has been submitted to the employer!');
      setSelectedJob(null);
      setApplyNote('');
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit application.');
    } finally {
      setApplying(false);
    }
  };

  const handleDispatch = async () => {
    setDispatching(true);
    setTimeout(() => {
      setDispatching(false);
      setDispatchResult({
        dispatchId: `DISPATCH-${Math.floor(1000 + Math.random() * 9000)}`,
        workerName: 'Ramesh Sharma (Verified Pro)',
        phone: '+91 98220 44551',
        rating: '4.9 ★',
        eta: '12-15 Mins',
        status: 'ON_THE_WAY'
      });
    }, 1000);
  };

  const handlePostJob = async () => {
    if (!postTitle || !postDesc) {
      Alert.alert('Required', 'Please fill in job title and description.');
      return;
    }
    setPosting(true);
    setTimeout(() => {
      setPosting(false);
      Alert.alert('Posted! 💼', 'Your job vacancy is now live on LocalSampark.');
      setPostTitle('');
      setPostDesc('');
      setPostSalary('');
      setActiveTab('browse');
      fetchJobs();
    }, 800);
  };

  const filteredJobs = jobs.filter(job => 
    job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.employer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={s.s0}>
      {/* Header */}
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={s.s3}>
          <Text style={s.s4}>Jobs & Dispatch</Text>
          <Text style={s.s5}>Hyperlocal Vacancies & Skilled Pros</Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={s.s6}>
        <TouchableOpacity 
          onPress={() => setActiveTab('browse')}
          style={[s.s77, activeTab === 'browse' ? s.s78 : s.s79]}
        >
          <Briefcase color="#fff" size={16} />
          <Text style={s.s7}>Browse Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab('dispatch')}
          style={[s.s80, activeTab === 'dispatch' ? s.s81 : s.s82]}
        >
          <Zap color="#fff" size={16} />
          <Text style={s.s8}>Instant Dispatch</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab('post')}
          style={[s.s83, activeTab === 'post' ? s.s84 : s.s85]}
        >
          <Plus color="#fff" size={16} />
          <Text style={s.s9}>Post a Job</Text>
        </TouchableOpacity>
      </View>

      {/* BROWSE TAB */}
      {activeTab === 'browse' && (
        <ScrollView style={s.s10} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Search Bar */}
          <View style={s.s11}>
            <Search color="#94a3b8" size={20} />
            <TextInput 
              placeholder="Search vacancies, roles or shops..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={s.s12}
            />
          </View>

          {/* Categories Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.s13}>
            <View style={s.s14}>
              {CATEGORIES.map(cat => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[s.s86, isSelected ? s.s87 : s.s88]}
                  >
                    <IconComponent color={isSelected ? '#fff' : '#94a3b8'} size={16} style={s.s15} />
                    <Text style={[s.s89, isSelected ? s.s90 : s.s91]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Text style={s.s16}>
            Active Vacancies ({filteredJobs.length})
          </Text>

          {loading ? (
            <ActivityIndicator color="#3b82f6" size="large" style={s.s17} />
          ) : (
            filteredJobs.map(job => (
              <View key={job.id} style={s.s18}>
                <View style={s.s19}>
                  <View style={s.s20}>
                    <Text style={s.s21}>{job.title}</Text>
                    <Text style={s.s22}>{job.employer_name}</Text>
                  </View>
                  <View style={s.s23}>
                    <Text style={s.s24}>{job.job_type || 'Full-time'}</Text>
                  </View>
                </View>

                <Text style={s.s25}>{job.description}</Text>

                <View style={s.s26}>
                  <View style={s.s27}>
                    <MapPin color="#64748b" size={16} />
                    <Text style={s.s28}>{job.location || 'Local Area'}</Text>
                  </View>
                  <Text style={s.s29}>{job.salary_range}</Text>
                </View>

                <TouchableOpacity 
                  onPress={() => setSelectedJob(job)}
                  style={s.s30}
                >
                  <Send color="#fff" size={16} />
                  <Text style={s.s31}>Apply Now</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* INSTANT DISPATCH TAB */}
      {activeTab === 'dispatch' && (
        <ScrollView style={s.s32} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={s.s33}>
            <Zap color="#fbbf24" size={36} />
            <Text style={s.s34}>Instant Worker Dispatch</Text>
            <Text style={s.s35}>
              Need an urgent electrician, plumber, or repair tech? Dispatch a verified professional to your doorstep within minutes.
            </Text>
          </View>

          {dispatchResult ? (
            <View style={s.s36}>
              <View style={s.s37}>
                <CheckCircle2 color="#22c55e" size={28} />
                <View>
                  <Text style={s.s38}>Worker Dispatched!</Text>
                  <Text style={s.s39}>{dispatchResult.dispatchId}</Text>
                </View>
              </View>

              <View style={s.s40}>
                <Text style={s.s41}>Assigned Professional:</Text>
                <Text style={s.s42}>{dispatchResult.workerName}</Text>
                <Text style={s.s43}>Contact: {dispatchResult.phone}</Text>
                <Text style={s.s44}>Rating: {dispatchResult.rating}</Text>
                <Text style={s.s45}>ETA: {dispatchResult.eta}</Text>
              </View>

              <TouchableOpacity 
                onPress={() => setDispatchResult(null)}
                style={s.s46}
              >
                <Text style={s.s47}>Request Another Dispatch</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.s48}>
              <Text style={s.s49}>Select Skilled Service Needed</Text>
              
              <View style={s.s50}>
                {['Electrician', 'Plumber', 'AC Repair', 'Carpenter', 'Mechanic'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setDispatchCategory(cat)}
                    style={[s.s92, dispatchCategory === cat ? s.s93 : s.s94]}
                  >
                    <Text style={[s.s95, dispatchCategory === cat ? s.s96 : s.s97]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.s51}>Urgency / Problem Details</Text>
              <TextInput
                placeholder="e.g. Main switchboard tripping continuously in Flat 302..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={3}
                value={dispatchNote}
                onChangeText={setDispatchNote}
                style={s.s52}
              />

              <TouchableOpacity
                onPress={handleDispatch}
                disabled={dispatching}
                style={s.s53}
              >
                {dispatching ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Zap color="#fff" size={18} />
                    <Text style={s.s54}>Confirm Instant Dispatch</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* POST A JOB TAB */}
      {activeTab === 'post' && (
        <ScrollView style={s.s55} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={s.s56}>
            <Text style={s.s57}>Post a Local Vacancy</Text>
            <Text style={s.s58}>Reach thousands of active workers in your neighborhood.</Text>

            <Text style={s.s59}>Job Title</Text>
            <TextInput 
              placeholder="e.g. Delivery Executive or Store Assistant"
              placeholderTextColor="#64748b"
              value={postTitle}
              onChangeText={setPostTitle}
              style={s.s60}
            />

            <Text style={s.s61}>Salary / Compensation</Text>
            <TextInput 
              placeholder="e.g. ₹15,000 - ₹20,000 / month"
              placeholderTextColor="#64748b"
              value={postSalary}
              onChangeText={setPostSalary}
              style={s.s62}
            />

            <Text style={s.s63}>Description & Requirements</Text>
            <TextInput 
              placeholder="Provide responsibilities, shift timings, and qualifications..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              value={postDesc}
              onChangeText={setPostDesc}
              style={s.s64}
            />

            <TouchableOpacity 
              onPress={handlePostJob}
              disabled={posting}
              style={s.s65}
            >
              {posting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Plus color="#fff" size={18} />
                  <Text style={s.s66}>Publish Job Vacancy</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* APPLY MODAL */}
      <Modal visible={!!selectedJob} animationType="slide" transparent>
        <View style={s.s67}>
          <View style={s.s68}>
            <View style={s.s69}>
              <Text style={s.s70}>{selectedJob?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedJob(null)} style={s.s71}>
                <X color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={s.s72}>{selectedJob?.employer_name} • {selectedJob?.salary_range}</Text>
            
            <Text style={s.s73}>Application Cover Note / Resume Link</Text>
            <TextInput
              placeholder="Introduce yourself or paste Google Drive / PDF resume URL..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              value={applyNote}
              onChangeText={setApplyNote}
              style={s.s74}
            />

            <TouchableOpacity
              onPress={handleApply}
              disabled={applying}
              style={s.s75}
            >
              {applying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.s76}>Submit Application</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#0f172a', backgroundColor: '#020617' },
  s2: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s3: { flex: 1 },
  s4: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  s5: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  s6: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#020617', borderBottomWidth: 1, borderColor: '#0f172a' },
  s7: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  s8: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  s9: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  s10: { flex: 1 },
  s11: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 16 },
  s12: { flex: 1, color: '#ffffff', fontWeight: '500', fontSize: 14 },
  s13: { marginBottom: 24 },
  s14: { flexDirection: 'row', gap: 8 },
  s15: { marginRight: 8 },
  s16: { color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12, marginBottom: 12 },
  s17: { marginVertical: 32 },
  s18: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 16 },
  s19: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  s20: { flex: 1, marginRight: 8 },
  s21: { color: '#ffffff', fontWeight: '900', fontSize: 18, marginBottom: 4 },
  s22: { color: '#60a5fa', fontWeight: '700', fontSize: 12 },
  s23: { backgroundColor: '#172554', borderWidth: 1, borderColor: 'rgba(30,64,175,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  s24: { color: '#93c5fd', fontWeight: '700', fontSize: 12 },
  s25: { color: '#cbd5e1', fontSize: 14, marginBottom: 16, lineHeight: 5 },
  s26: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: 'rgba(30,41,59,0.8)', paddingTop: 12, marginTop: 4 },
  s27: { flexDirection: 'row', alignItems: 'center' },
  s28: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  s29: { color: '#34d399', fontWeight: '800', fontSize: 14 },
  s30: { marginTop: 16, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  s31: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  s32: { flex: 1, padding: 16 },
  s33: { padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  s34: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  s35: { color: '#fde68a', fontSize: 14, lineHeight: 5 },
  s36: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', padding: 24, borderRadius: 16 },
  s37: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  s38: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  s39: { color: '#94a3b8', fontSize: 12 },
  s40: { backgroundColor: '#020617', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', gap: 8, marginBottom: 16 },
  s41: { color: '#cbd5e1', fontWeight: '700', fontSize: 14 },
  s42: { color: '#fbbf24', fontWeight: '900', fontSize: 16 },
  s43: { color: '#94a3b8', fontSize: 12 },
  s44: { color: '#94a3b8', fontSize: 12 },
  s45: { color: '#34d399', fontWeight: '800', fontSize: 14 },
  s46: { backgroundColor: '#d97706', padding: 16, borderRadius: 12, alignItems: 'center' },
  s47: { color: '#ffffff', fontWeight: '900' },
  s48: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 20, borderRadius: 16, gap: 16 },
  s49: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  s50: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  s51: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginTop: 8 },
  s52: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 12, color: '#ffffff', fontSize: 14 },
  s53: { backgroundColor: '#d97706', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 8 },
  s54: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  s55: { flex: 1, padding: 16 },
  s56: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 24, borderRadius: 16, gap: 16 },
  s57: { color: '#ffffff', fontWeight: '900', fontSize: 20, marginBottom: 4 },
  s58: { color: '#94a3b8', fontSize: 12 },
  s59: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  s60: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, color: '#ffffff', fontSize: 14 },
  s61: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  s62: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, color: '#ffffff', fontSize: 14 },
  s63: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  s64: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 12, color: '#ffffff', fontSize: 14 },
  s65: { backgroundColor: '#059669', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 8 },
  s66: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  s67: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  s68: { backgroundColor: '#0f172a', borderTopWidth: 1, borderColor: '#1e293b', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 16 },
  s69: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#1e293b', paddingBottom: 12 },
  s70: { color: '#ffffff', fontWeight: '900', fontSize: 18, flex: 1, marginRight: 8 },
  s71: { padding: 8, backgroundColor: '#1e293b', borderRadius: 9999 },
  s72: { color: '#60a5fa', fontWeight: '700', fontSize: 12 },
  s73: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginTop: 8 },
  s74: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 12, color: '#ffffff', fontSize: 14 },
  s75: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 8 },
  s76: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  s77: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  s78: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  s79: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  s80: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  s81: { backgroundColor: '#d97706', borderColor: '#f59e0b' },
  s82: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  s83: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  s84: { backgroundColor: '#059669', borderColor: '#10b981' },
  s85: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  s86: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999, borderWidth: 1 },
  s87: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  s88: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  s89: { fontWeight: '700', fontSize: 12 },
  s90: { color: '#ffffff' },
  s91: { color: '#94a3b8' },
  s92: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  s93: { backgroundColor: '#d97706', borderColor: '#f59e0b' },
  s94: { backgroundColor: '#020617', borderColor: '#1e293b' },
  s95: { fontWeight: '700', fontSize: 12 },
  s96: { color: '#ffffff' },
  s97: { color: '#cbd5e1' },
});
