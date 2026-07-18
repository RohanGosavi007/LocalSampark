import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Switch } from 'react-native';
import { router } from 'expo-router';

export default function RunnerDashboard() {
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [activePing, setActivePing] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Delivery Runner</Text>
        </View>
      </View>

      {/* Map Area Placeholder */}
      <View style={styles.mapContainer}>
        <Text style={styles.mapText}>🗺️ Live GPS Tracking Map</Text>
        <Text style={styles.mapSub}>Streaming your location to socket room...</Text>
      </View>

      {/* Bottom Sheet UI */}
      <View style={styles.bottomSheet}>
        
        <View style={styles.dutyRow}>
          <View>
            <Text style={styles.dutyTitle}>{isOnDuty ? '🟢 Online & Ready' : '🔴 Offline'}</Text>
            <Text style={styles.dutySub}>Toggle to receive dispatch pings</Text>
          </View>
          <Switch 
            value={isOnDuty} 
            onValueChange={setIsOnDuty}
            trackColor={{ false: '#e2e8f0', true: '#10b981' }}
            thumbColor="#fff"
            style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }}
          />
        </View>

        {isOnDuty && activePing && (
          <View style={styles.dispatchCard}>
            <View style={styles.pingBadge}>
              <Text style={styles.pingText}>NEW DISPATCH</Text>
            </View>
            
            <View style={styles.routeRow}>
              <Text style={styles.routeIcon}>🏪</Text>
              <View>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeVal}>Local Mart (0.5 km)</Text>
              </View>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.routeRow}>
              <Text style={styles.routeIcon}>📍</Text>
              <View>
                <Text style={styles.routeLabel}>Dropoff</Text>
                <Text style={styles.routeVal}>Pride Aashiyana B-404 (1.2 km)</Text>
              </View>
            </View>
            
            <View style={styles.earningRow}>
              <Text style={styles.earningLabel}>Estimated Payout:</Text>
              <Text style={styles.earningVal}>₹45.00</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => setActivePing(false)}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn}>
                <Text style={styles.acceptBtnText}>ACCEPT (15s)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Today's Earnings</Text>
            <Text style={styles.statNumber}>₹340.00</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Deliveries</Text>
            <Text style={styles.statNumber}>8</Text>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16, paddingTop: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'absolute', top: 0, width: '100%', zIndex: 10 },
  backBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8 },
  backText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  
  mapContainer: { flex: 1, backgroundColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  mapText: { fontSize: 24, fontWeight: '900', color: '#334155', marginBottom: 8 },
  mapSub: { fontSize: 14, color: '#475569', fontWeight: '600' },

  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  
  dutyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  dutyTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  dutySub: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  dispatchCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#3b82f6', marginBottom: 24, position: 'relative' },
  pingBadge: { position: 'absolute', top: -12, left: '50%', transform: [{translateX: -50}], backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  pingText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeIcon: { fontSize: 24, marginRight: 12 },
  routeLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  routeVal: { fontSize: 15, color: '#0f172a', fontWeight: '800' },
  routeLine: { height: 20, width: 2, backgroundColor: '#cbd5e1', marginLeft: 12, marginVertical: 4 },
  
  earningRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: '#e2e8f0' },
  earningLabel: { fontSize: 14, color: '#475569', fontWeight: '700' },
  earningVal: { fontSize: 22, color: '#10b981', fontWeight: '900' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  rejectBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  rejectBtnText: { color: '#475569', fontWeight: '800', fontSize: 14 },
  acceptBtn: { flex: 2, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  statNumber: { fontSize: 18, color: '#0f172a', fontWeight: '900' }
});
