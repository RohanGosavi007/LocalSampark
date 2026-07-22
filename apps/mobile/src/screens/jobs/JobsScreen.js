import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, SafeAreaView, 
  TextInput, Modal, Alert, ActivityIndicator 
} from 'react-native';
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
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-slate-900 bg-slate-950">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-xl font-black">Jobs & Dispatch</Text>
          <Text className="text-slate-400 text-xs font-semibold">Hyperlocal Vacancies & Skilled Pros</Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View className="flex-row p-3 gap-2 bg-slate-950 border-b border-slate-900">
        <TouchableOpacity 
          onPress={() => setActiveTab('browse')}
          className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${activeTab === 'browse' ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800'}`}
        >
          <Briefcase color="#fff" size={16} />
          <Text className="text-white font-bold text-xs">Browse Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab('dispatch')}
          className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${activeTab === 'dispatch' ? 'bg-amber-600 border-amber-500' : 'bg-slate-900 border-slate-800'}`}
        >
          <Zap color="#fff" size={16} />
          <Text className="text-white font-bold text-xs">Instant Dispatch</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab('post')}
          className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${activeTab === 'post' ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-900 border-slate-800'}`}
        >
          <Plus color="#fff" size={16} />
          <Text className="text-white font-bold text-xs">Post a Job</Text>
        </TouchableOpacity>
      </View>

      {/* BROWSE TAB */}
      {activeTab === 'browse' && (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Search Bar */}
          <View className="flex-row items-center bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl mb-4">
            <Search color="#94a3b8" size={20} className="mr-3" />
            <TextInput 
              placeholder="Search vacancies, roles or shops..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-white font-medium text-sm"
            />
          </View>

          {/* Categories Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            <View className="flex-row gap-2">
              {CATEGORIES.map(cat => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    className={`flex-row items-center px-4 py-2.5 rounded-full border ${isSelected ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800'}`}
                  >
                    <IconComponent color={isSelected ? '#fff' : '#94a3b8'} size={16} className="mr-2" />
                    <Text className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Text className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-3">
            Active Vacancies ({filteredJobs.length})
          </Text>

          {loading ? (
            <ActivityIndicator color="#3b82f6" size="large" className="my-8" />
          ) : (
            filteredJobs.map(job => (
              <View key={job.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-4">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-white font-black text-lg mb-1">{job.title}</Text>
                    <Text className="text-blue-400 font-bold text-xs">{job.employer_name}</Text>
                  </View>
                  <View className="bg-blue-950 border border-blue-800/50 px-3 py-1 rounded-full">
                    <Text className="text-blue-300 font-bold text-xs">{job.job_type || 'Full-time'}</Text>
                  </View>
                </View>

                <Text className="text-slate-300 text-sm mb-4 leading-5">{job.description}</Text>

                <View className="flex-row items-center justify-between border-t border-slate-800/80 pt-3 mt-1">
                  <View className="flex-row items-center">
                    <MapPin color="#64748b" size={16} className="mr-1" />
                    <Text className="text-slate-400 text-xs font-semibold">{job.location || 'Local Area'}</Text>
                  </View>
                  <Text className="text-emerald-400 font-extrabold text-sm">{job.salary_range}</Text>
                </View>

                <TouchableOpacity 
                  onPress={() => setSelectedJob(job)}
                  className="mt-4 bg-blue-600 py-3 rounded-xl items-center justify-center flex-row"
                >
                  <Send color="#fff" size={16} className="mr-2" />
                  <Text className="text-white font-black text-sm">Apply Now</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* INSTANT DISPATCH TAB */}
      {activeTab === 'dispatch' && (
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="bg-gradient-to-r from-amber-900 to-orange-950 p-6 rounded-3xl mb-6 border border-amber-500/30">
            <Zap color="#fbbf24" size={36} className="mb-3" />
            <Text className="text-white text-2xl font-black mb-2">Instant Worker Dispatch</Text>
            <Text className="text-amber-200 text-sm leading-5">
              Need an urgent electrician, plumber, or repair tech? Dispatch a verified professional to your doorstep within minutes.
            </Text>
          </View>

          {dispatchResult ? (
            <View className="bg-slate-900 border border-amber-500/40 p-6 rounded-2xl">
              <View className="flex-row items-center mb-4">
                <CheckCircle2 color="#22c55e" size={28} className="mr-3" />
                <View>
                  <Text className="text-white font-black text-lg">Worker Dispatched!</Text>
                  <Text className="text-slate-400 text-xs">{dispatchResult.dispatchId}</Text>
                </View>
              </View>

              <View className="bg-slate-950 p-4 rounded-xl border border-slate-800 gap-2 mb-4">
                <Text className="text-slate-300 font-bold text-sm">Assigned Professional:</Text>
                <Text className="text-amber-400 font-black text-base">{dispatchResult.workerName}</Text>
                <Text className="text-slate-400 text-xs">Contact: {dispatchResult.phone}</Text>
                <Text className="text-slate-400 text-xs">Rating: {dispatchResult.rating}</Text>
                <Text className="text-emerald-400 font-extrabold text-sm">ETA: {dispatchResult.eta}</Text>
              </View>

              <TouchableOpacity 
                onPress={() => setDispatchResult(null)}
                className="bg-amber-600 p-4 rounded-xl items-center"
              >
                <Text className="text-white font-black">Request Another Dispatch</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-slate-900 border border-slate-800 p-5 rounded-2xl gap-4">
              <Text className="text-white font-black text-base">Select Skilled Service Needed</Text>
              
              <View className="flex-row flex-wrap gap-2">
                {['Electrician', 'Plumber', 'AC Repair', 'Carpenter', 'Mechanic'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setDispatchCategory(cat)}
                    className={`px-4 py-3 rounded-xl border ${dispatchCategory === cat ? 'bg-amber-600 border-amber-500' : 'bg-slate-950 border-slate-800'}`}
                  >
                    <Text className={`font-bold text-xs ${dispatchCategory === cat ? 'text-white' : 'text-slate-300'}`}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-slate-400 font-bold text-xs mt-2">Urgency / Problem Details</Text>
              <TextInput
                placeholder="e.g. Main switchboard tripping continuously in Flat 302..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={3}
                value={dispatchNote}
                onChangeText={setDispatchNote}
                className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm"
              />

              <TouchableOpacity
                onPress={handleDispatch}
                disabled={dispatching}
                className="bg-amber-600 p-4 rounded-xl items-center justify-center flex-row mt-2"
              >
                {dispatching ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Zap color="#fff" size={18} className="mr-2" />
                    <Text className="text-white font-black text-sm">Confirm Instant Dispatch</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* POST A JOB TAB */}
      {activeTab === 'post' && (
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="bg-slate-900 border border-slate-800 p-6 rounded-2xl gap-4">
            <Text className="text-white font-black text-xl mb-1">Post a Local Vacancy</Text>
            <Text className="text-slate-400 text-xs">Reach thousands of active workers in your neighborhood.</Text>

            <Text className="text-slate-400 font-bold text-xs">Job Title</Text>
            <TextInput 
              placeholder="e.g. Delivery Executive or Store Assistant"
              placeholderTextColor="#64748b"
              value={postTitle}
              onChangeText={setPostTitle}
              className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-white text-sm"
            />

            <Text className="text-slate-400 font-bold text-xs">Salary / Compensation</Text>
            <TextInput 
              placeholder="e.g. ₹15,000 - ₹20,000 / month"
              placeholderTextColor="#64748b"
              value={postSalary}
              onChangeText={setPostSalary}
              className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-white text-sm"
            />

            <Text className="text-slate-400 font-bold text-xs">Description & Requirements</Text>
            <TextInput 
              placeholder="Provide responsibilities, shift timings, and qualifications..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              value={postDesc}
              onChangeText={setPostDesc}
              className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm"
            />

            <TouchableOpacity 
              onPress={handlePostJob}
              disabled={posting}
              className="bg-emerald-600 p-4 rounded-xl items-center justify-center flex-row mt-2"
            >
              {posting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Plus color="#fff" size={18} className="mr-2" />
                  <Text className="text-white font-black text-sm">Publish Job Vacancy</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* APPLY MODAL */}
      <Modal visible={!!selectedJob} animationType="slide" transparent>
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-slate-900 border-t border-slate-800 p-6 rounded-t-3xl gap-4">
            <View className="flex-row justify-between items-center border-b border-slate-800 pb-3">
              <Text className="text-white font-black text-lg flex-1 mr-2">{selectedJob?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedJob(null)} className="p-2 bg-slate-800 rounded-full">
                <X color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            <Text className="text-blue-400 font-bold text-xs">{selectedJob?.employer_name} • {selectedJob?.salary_range}</Text>
            
            <Text className="text-slate-400 font-bold text-xs mt-2">Application Cover Note / Resume Link</Text>
            <TextInput
              placeholder="Introduce yourself or paste Google Drive / PDF resume URL..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              value={applyNote}
              onChangeText={setApplyNote}
              className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm"
            />

            <TouchableOpacity
              onPress={handleApply}
              disabled={applying}
              className="bg-blue-600 p-4 rounded-xl items-center justify-center flex-row mt-2"
            >
              {applying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-black text-sm">Submit Application</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
