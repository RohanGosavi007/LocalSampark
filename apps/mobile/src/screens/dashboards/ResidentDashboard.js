import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Dimensions, SafeAreaView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Bell, MapPin, Search, ChevronDown, MessageCircle, Store, Briefcase, Building2, Truck, Car, Home, IndianRupee, AlertTriangle, Cross, ShoppingBag, Droplet, Wallet, ShieldCheck, Heart, User } from 'lucide-react-native';
import StoriesRow from '../../components/StoriesRow';
import { useNotifications } from '../../context/NotificationContext';
import { useZone } from '../../context/ZoneContext';
import { apiGet } from '../../lib/api';

const { width } = Dimensions.get('window');

export default function ResidentDashboard({ user }) {
  const { unreadCount } = useNotifications();
  const { activeZone } = useZone();
  const [feedPosts, setFeedPosts] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const data = await apiGet('/feed/posts');
        setFeedPosts(Array.isArray(data) ? data : (data.posts || []));
      } catch (err) {
        console.warn('Failed to load feed:', err);
      } finally {
        setLoadingFeed(false);
      }
    };
    loadFeed();
  }, []);

  const PILLARS = [
    { title: 'Community', icon: MessageCircle, route: '/(tabs)/community', color: '#3b82f6' },
    { title: 'Local Shops', icon: Store, route: '/(tabs)/directory', color: '#10b981' },
    { title: 'Gig & Jobs', icon: Briefcase, route: '/modules/jobs', color: '#f59e0b' },
    { title: 'Real Estate', icon: Building2, route: '/modules/properties', color: '#8b5cf6' },
    { title: 'Delivery', icon: Truck, route: '/modules/delivery', color: '#ef4444' },
    { title: 'Carpool', icon: Car, route: '/modules/carpool', color: '#06b6d4' },
    { title: 'Society', icon: Home, route: '/modules/society', color: '#6366f1' },
    { title: 'Earn Money', icon: IndianRupee, route: '/modules/earn', color: '#14b8a6' },
  ];

  const QUICK_TILES = [
    { label: 'Services', icon: '🛠️', route: '/(tabs)/services', bg: '#e0e7ff' },
    { label: 'Bills', icon: '🧾', route: '/modules/bills', bg: '#fef3c7' },
    { label: 'Chef', icon: '🍲', route: '/modules/chef', bg: '#ffedd5' },
    { label: 'Equipment', icon: '🚜', route: '/modules/equipment', bg: '#f3e8ff' },
    { label: 'Care', icon: '❤️', route: '/modules/care', bg: '#ffe4e6' },
    { label: 'Scrap', icon: '♻️', route: '/modules/scrap', bg: '#d1fae5' },
    { label: 'Market', icon: '🏷️', route: '/modules/marketplace', bg: '#e0f2fe' },
    { label: 'Pets', icon: '🐾', route: '/modules/pets', bg: '#fef9c3' },
    { label: 'Events', icon: '🎉', route: '/modules/events', bg: '#fae8ff' },
    { label: 'Health', icon: '⚕️', route: '/modules/health', bg: '#ccfbf1' },
    { label: 'Subscribes', icon: '📅', route: '/modules/subscriptions', bg: '#e0e7ff' },
    { label: 'Referral', icon: '🎁', route: '/modules/referral', bg: '#fee2e2' },
    { label: 'Rewards', icon: '🏆', route: '/modules/rewards', bg: '#fef3c7' },
    { label: 'Premium', icon: '✨', route: '/modules/premium', bg: '#f3e8ff' },
    { label: 'Donations', icon: '🤝', route: '/modules/donations', bg: '#dcfce7' },
    { label: 'Volunteer', icon: '🙋', route: '/modules/volunteer', bg: '#ffedd5' },
    { label: 'Comm Hub', icon: '🏫', route: '/modules/community_hub', bg: '#e0f2fe' },
    { label: 'Tracking', icon: '📍', route: '/modules/tracking', bg: '#fef9c3' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6 mt-2">
          <View>
            <Text className="text-white text-2xl font-black mb-1">Hello, {user?.name || 'Resident'}</Text>
            <TouchableOpacity 
              className="flex-row items-center bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full self-start"
              onPress={() => router.push('/modules/zone-selector')}
            >
              <MapPin size={12} color="#10b981" className="mr-1.5" />
              <Text className="text-slate-300 font-bold text-xs">{activeZone?.name || 'Select Zone'}</Text>
              <ChevronDown size={12} color="#64748b" className="ml-1.5" />
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity 
              className="w-11 h-11 bg-slate-900 border border-slate-800 rounded-full items-center justify-center"
              onPress={() => router.push('/modules/wallet')}
            >
              <Wallet size={20} color="#e2e8f0" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="relative w-11 h-11 bg-slate-900 border border-slate-800 rounded-full items-center justify-center"
              onPress={() => router.push('/modules/notifications')}
            >
              <Bell size={20} color="#e2e8f0" />
              {unreadCount > 0 && (
                <View className="absolute top-0 right-0 bg-red-500 w-5 h-5 rounded-full items-center justify-center border-2 border-slate-950">
                  <Text className="text-white text-[10px] font-black">{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 mb-6 shadow-sm shadow-slate-900">
          <Search size={20} color="#94a3b8" className="mr-3" />
          <TextInput 
            placeholder="Search shops, plumbers, community..." 
            placeholderTextColor="#64748b"
            className="flex-1 text-white font-medium text-sm"
          />
        </View>

        {/* Stories */}
        <View className="mb-6">
          <Text className="text-white font-bold text-lg mb-4">Neighborhood Stories</Text>
          <StoriesRow />
        </View>
        
        {/* Urgent Actions Banner */}
        <View className="flex-row justify-between mb-8 gap-3">
          <TouchableOpacity 
            className="flex-1 bg-red-950/40 border border-red-900/50 p-4 rounded-2xl items-center shadow-lg shadow-red-900/20"
            onPress={() => router.push('/modules/sos')}
          >
            <View className="w-12 h-12 bg-red-500/20 rounded-full items-center justify-center mb-2">
              <AlertTriangle size={24} color="#ef4444" />
            </View>
            <Text className="text-red-400 font-bold text-xs mt-1">SOS Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 bg-blue-950/40 border border-blue-900/50 p-4 rounded-2xl items-center shadow-lg shadow-blue-900/20"
            onPress={() => router.push('/modules/pharmacy')}
          >
            <View className="w-12 h-12 bg-blue-500/20 rounded-full items-center justify-center mb-2">
              <Cross size={24} color="#3b82f6" />
            </View>
            <Text className="text-blue-400 font-bold text-xs mt-1">Pharmacy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 bg-emerald-950/40 border border-emerald-900/50 p-4 rounded-2xl items-center shadow-lg shadow-emerald-900/20"
            onPress={() => router.push('/(tabs)/directory')}
          >
            <View className="w-12 h-12 bg-emerald-500/20 rounded-full items-center justify-center mb-2">
              <ShoppingBag size={24} color="#10b981" />
            </View>
            <Text className="text-emerald-400 font-bold text-xs mt-1">Groceries</Text>
          </TouchableOpacity>
        </View>

        {/* 8 Pillars / Primary Categories */}
        <Text className="text-white font-bold text-lg mb-4">Platform Services</Text>
        <View className="flex-row flex-wrap justify-between mb-6">
          {PILLARS.map((p, i) => {
            const IconComponent = p.icon;
            return (
              <TouchableOpacity key={i} className="w-[48%] bg-slate-900 border border-slate-800 rounded-2xl p-4 items-center mb-4 shadow-sm shadow-slate-900" onPress={() => router.push(p.route)}>
                <View className="w-14 h-14 rounded-full justify-center items-center mb-3" style={{ backgroundColor: `${p.color}15` }}>
                  <IconComponent size={28} color={p.color} />
                </View>
                <Text className="text-white font-bold text-sm">{p.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Tiles Grid */}
        <Text className="text-white font-bold text-lg mb-4">Explore More</Text>
        <View className="flex-row flex-wrap mb-6 bg-slate-900 border border-slate-800 rounded-3xl p-4 pb-0 shadow-sm shadow-slate-900">
          {QUICK_TILES.map((t, i) => (
            <TouchableOpacity key={i} className="w-[25%] items-center mb-5" onPress={() => router.push(t.route)}>
              <View className="w-12 h-12 rounded-[18px] justify-center items-center mb-2" style={{ backgroundColor: t.bg + '20' }}>
                <Text className="text-2xl">{t.icon}</Text>
              </View>
              <Text className="text-slate-400 font-bold text-[10px] text-center">{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Community Feed Preview */}
        <View className="flex-row justify-between items-center mb-4 mt-2">
          <Text className="text-white font-bold text-lg">Townsquare Feed</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/community')}>
            <Text className="text-blue-400 font-bold text-xs">View All</Text>
          </TouchableOpacity>
        </View>
        
        {loadingFeed ? (
          <ActivityIndicator color="#3b82f6" className="my-6" />
        ) : feedPosts.length === 0 ? (
          <View className="bg-slate-900 border border-slate-800 rounded-2xl p-6 items-center">
            <MessageCircle size={32} color="#64748b" className="mb-3" />
            <Text className="text-slate-400 font-semibold text-sm">No stories in your area yet.</Text>
          </View>
        ) : feedPosts.map(post => (
          <View key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-sm shadow-slate-900">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-blue-600 justify-center items-center mr-3">
                <Text className="text-white font-black text-base">{post.author_name?.charAt(0) || post.full_name?.charAt(0) || 'U'}</Text>
              </View>
              <View>
                <Text className="text-white font-bold text-sm">{post.author_name || post.full_name}</Text>
                <Text className="text-slate-400 text-[10px]">{post.time || new Date(post.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
            <Text className="text-slate-300 font-medium text-sm leading-5 mb-4">{post.content}</Text>
            <View className="flex-row justify-between border-t border-slate-800 pt-3 mt-1">
              <TouchableOpacity className="flex-row items-center"><Text className="text-slate-400 font-bold text-xs">❤️ {post.likes || 0} Likes</Text></TouchableOpacity>
              <TouchableOpacity className="flex-row items-center"><Text className="text-slate-400 font-bold text-xs">💬 {post.comments || 0} Comments</Text></TouchableOpacity>
              <TouchableOpacity className="flex-row items-center"><Text className="text-blue-400 font-bold text-xs">🔗 Share</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
