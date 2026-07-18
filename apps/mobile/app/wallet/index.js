import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Wallet, Plus, QrCode, Landmark, ShieldCheck, History, ArrowUpRight } from 'lucide-react-native';
import { apiGet } from '../../src/lib/api';
import { useAppStore } from '../../src/store/useAppStore';

export default function NativeWalletScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const { 
    walletBalance, setWalletBalance, 
    samparkCoins, setSamparkCoins, 
    walletTransactions, setWalletTransactions 
  } = useAppStore();

  const fetchWalletData = useCallback(async () => {
    try {
      // Fetch balance and coins mapping from identical web endpoints
      const balanceData = await apiGet('/wallet/balance');
      if (balanceData) {
        if (balanceData.balance !== undefined) setWalletBalance(balanceData.balance);
        if (balanceData.coins !== undefined) setSamparkCoins(balanceData.coins);
      }

      // Fetch transaction history
      const txData = await apiGet('/wallet/transactions');
      if (txData && Array.isArray(txData)) {
        const mappedTxs = txData.map(tx => ({
          title: tx.description || tx.title || 'Transaction',
          category: tx.category || tx.type || 'General',
          amount: tx.amount,
          type: tx.amount >= 0 ? 'credit' : 'debit',
          date: tx.created_at ? new Date(tx.created_at).toLocaleString() : 'Recently',
          icon: tx.amount >= 0 ? '🏦' : '🛒',
        }));
        setWalletTransactions(mappedTxs);
      }
    } catch (err) {
      console.warn("Failed to fetch wallet data (Native Mode)", err);
    }
  }, [setWalletBalance, setSamparkCoins, setWalletTransactions]);

  useEffect(() => {
    fetchWalletData().finally(() => setLoading(false));
  }, [fetchWalletData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWalletData().finally(() => setRefreshing(false));
  }, [fetchWalletData]);

  const renderTransaction = ({ item }) => (
    <TouchableOpacity className="flex-row items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-900/50 mb-3 mx-4">
      <View className="flex-row items-center gap-4">
        <View className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 items-center justify-center">
          <Text className="text-xl">{item.icon}</Text>
        </View>
        <View>
          <Text className="font-bold text-white mb-0.5">{item.title}</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-slate-400">{item.date}</Text>
            <View className="w-1 h-1 rounded-full bg-slate-600"></View>
            <Text className="text-xs text-slate-400">{item.category}</Text>
          </View>
        </View>
      </View>
      <View className="items-end">
        <Text className={`font-black text-lg ${item.type === 'credit' ? 'text-emerald-500' : 'text-white'}`}>
          {item.type === 'credit' ? '+' : '-'}₹{Math.abs(item.amount)}
        </Text>
        <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
          {item.type === 'credit' ? 'Credit' : 'Debit'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View className="px-4 pt-4 pb-6 flex-col gap-6">
      {/* Cash Wallet Card */}
      <View className="rounded-[2rem] p-6 bg-slate-800 shadow-xl overflow-hidden">
        <View className="flex-row items-center justify-between mb-8">
          <View className="flex-row items-center gap-2">
            <Wallet size={20} color="#94a3b8" />
            <Text className="text-slate-400 font-bold tracking-widest uppercase text-sm">Cash Wallet</Text>
          </View>
          <View className="bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-full">
            <Text className="text-emerald-400 text-xs font-bold">Active</Text>
          </View>
        </View>

        <View className="mb-8">
          <View className="flex-row items-end">
            <Text className="text-4xl font-black text-white tracking-tight">₹{walletBalance.toLocaleString()}</Text>
            <Text className="text-xl text-white/50 mb-1">.00</Text>
          </View>
          <Text className="text-sm text-white/60">Available Balance</Text>
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity className="flex-1 bg-white rounded-xl py-4 flex-row items-center justify-center">
            <Plus size={20} color="#0f172a" />
            <Text className="ml-2 font-bold text-slate-900">Top Up</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 border border-white/20 rounded-xl py-4 flex-row items-center justify-center bg-white/10">
            <QrCode size={20} color="#fff" />
            <Text className="ml-2 font-bold text-white">Pay</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sampark Coins Card */}
      <View className="rounded-[2rem] p-6 border border-amber-500/30 bg-amber-500/10">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl">🪙</Text>
            <Text className="font-bold text-amber-500">SamparkCoins</Text>
          </View>
        </View>
        <View className="flex-row items-end gap-2 mb-2">
          <Text className="text-3xl font-black text-white">{samparkCoins.toLocaleString()}</Text>
          <Text className="text-sm text-slate-400 font-bold mb-1">SC</Text>
        </View>
        <Text className="text-xs text-slate-400 mb-4 pb-4 border-b border-slate-800">Use coins to claim rewards and discounts.</Text>
        <TouchableOpacity className="flex-row items-center justify-between">
          <Text className="text-sm font-bold text-amber-500">Redeem Rewards</Text>
          <ArrowUpRight size={16} color="#f59e0b" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View className="flex-row gap-4">
        <TouchableOpacity className="flex-1 p-4 rounded-2xl border border-slate-800 bg-slate-900 items-center justify-center">
          <View className="w-10 h-10 bg-blue-500/10 rounded-full items-center justify-center mb-2">
            <Landmark size={20} color="#3b82f6" />
          </View>
          <Text className="text-sm font-bold text-white">Bank Transfer</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 p-4 rounded-2xl border border-slate-800 bg-slate-900 items-center justify-center">
          <View className="w-10 h-10 bg-emerald-500/10 rounded-full items-center justify-center mb-2">
            <ShieldCheck size={20} color="#10b981" />
          </View>
          <Text className="text-sm font-bold text-white">Pay Bills</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between mt-4">
        <View className="flex-row items-center gap-2">
          <History size={20} color="#3b82f6" />
          <Text className="text-xl font-black text-white">Recent Transactions</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center p-4 border-b border-slate-800 bg-slate-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold capitalize">Native Wallet</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={walletTransactions}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderTransaction}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
              colors={["#3b82f6"]}
            />
          }
          ListEmptyComponent={
            <View className="py-8 items-center justify-center">
              <Text className="text-slate-400">No recent transactions found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}