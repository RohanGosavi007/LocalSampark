import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiGet, apiPost } from '../../src/lib/api';

const TABS = [
  { k: 'calc', l: '🧮 Cost' },
  { k: 'otp', l: '🔐 OTP' },
  { k: 'carbon', l: '🌿 Carbon' },
  { k: 'price', l: '💰 AI Price' },
  { k: 'escrow', l: '🛡️ Safe Pay' },
  { k: 'resume', l: '📄 Resume' },
  { k: 'gap', l: '📈 Skill Gap' },
  { k: 'alerts', l: '🔔 Alerts' },
];

export default function AdvancedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('calc');

  // Cost Calculator
  const [costForm, setCostForm] = useState({ distance_km: '25', fuel_price_per_liter: '105', mileage_kmpl: '15', toll_amount: '0', passengers: '2' });
  const [costResult, setCostResult] = useState(null);

  // OTP
  const [otpRideId, setOtpRideId] = useState('');
  const [otps, setOtps] = useState([]);

  // Carbon
  const [carbonData, setCarbonData] = useState(null);

  // AI Price
  const [priceForm, setPriceForm] = useState({ category: 'Electronics', condition: 'Good', title: '' });
  const [priceResult, setPriceResult] = useState(null);

  // Escrow
  const [escrowForm, setEscrowForm] = useState({ listing_id: '', amount: '' });
  const [escrowResult, setEscrowResult] = useState(null);

  // Skill Gap
  const [gapJobId, setGapJobId] = useState('');
  const [gapResult, setGapResult] = useState(null);

  // Alerts
  const [alertForm, setAlertForm] = useState({ keywords: '', job_type: '', min_salary: '', frequency: 'daily' });
  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(false);

  const calculateCost = async () => {
    setLoading(true);
    try {
      const data = await apiPost('/carpool/cost-calculator', {
        distance_km: parseFloat(costForm.distance_km), fuel_price_per_liter: parseFloat(costForm.fuel_price_per_liter),
        mileage_kmpl: parseFloat(costForm.mileage_kmpl), toll_amount: parseFloat(costForm.toll_amount), passengers: parseInt(costForm.passengers)
      });
      setCostResult(data?.calculation);
    } catch (e) { Alert.alert('Error', 'Failed'); }
    setLoading(false);
  };

  const generateOTP = async () => {
    try {
      const data = await apiPost(`/carpool/rides/${otpRideId}/generate-otp`);
      setOtps(data?.otps || []);
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const loadCarbon = async () => {
    try {
      const data = await apiGet('/carpool/carbon-dashboard');
      setCarbonData(data?.dashboard);
    } catch (e) {}
  };

  const suggestPrice = async () => {
    try {
      const data = await apiPost('/marketplace/price-suggest', priceForm);
      setPriceResult(data?.suggestion);
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const createEscrow = async () => {
    try {
      const data = await apiPost('/marketplace/escrow/create', { listing_id: escrowForm.listing_id, amount: parseFloat(escrowForm.amount) });
      setEscrowResult(data?.escrow);
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const analyzeGap = async () => {
    try {
      const data = await apiPost('/jobs/skill-gap', { job_id: gapJobId });
      setGapResult(data?.analysis);
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const createAlert = async () => {
    try {
      await apiPost('/jobs/alerts', alertForm);
      Alert.alert('Success', 'Alert created!');
      loadAlerts();
    } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const loadAlerts = async () => {
    try {
      const data = await apiGet('/jobs/alerts');
      setAlerts(data?.alerts || []);
    } catch (e) {}
  };

  React.useEffect(() => {
    if (tab === 'carbon') loadCarbon();
    if (tab === 'alerts') loadAlerts();
  }, [tab]);

  const FormInput = ({ label, value, onChangeText, ...props }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChangeText} placeholderTextColor="#94a3b8" {...props} />
    </View>
  );

  const StatBox = ({ label, value, color = '#06b6d4' }) => (
    <View style={[s.statBox, { borderColor: color + '33', backgroundColor: color + '11' }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#06b6d4', '#0891b2']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
        <Text style={s.headerTitle}>⚡ Advanced Features</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48, marginVertical: 8 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.k} onPress={() => setTab(t.k)} style={[s.tabPill, tab === t.k && s.tabPillActive]}>
            <Text style={[s.tabPillText, tab === t.k && { color: '#fff' }]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* 🧮 COST CALCULATOR */}
        {tab === 'calc' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🧮 Ride Cost Splitter</Text>
            <FormInput label="Distance (km)" value={costForm.distance_km} onChangeText={v => setCostForm({...costForm, distance_km: v})} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><FormInput label="Fuel ₹/L" value={costForm.fuel_price_per_liter} onChangeText={v => setCostForm({...costForm, fuel_price_per_liter: v})} keyboardType="numeric" /></View>
              <View style={{ flex: 1 }}><FormInput label="Mileage km/L" value={costForm.mileage_kmpl} onChangeText={v => setCostForm({...costForm, mileage_kmpl: v})} keyboardType="numeric" /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><FormInput label="Toll ₹" value={costForm.toll_amount} onChangeText={v => setCostForm({...costForm, toll_amount: v})} keyboardType="numeric" /></View>
              <View style={{ flex: 1 }}><FormInput label="Passengers" value={costForm.passengers} onChangeText={v => setCostForm({...costForm, passengers: v})} keyboardType="numeric" /></View>
            </View>
            <TouchableOpacity onPress={calculateCost} style={s.btnPrimary}><Text style={s.btnText}>Calculate Split 🧮</Text></TouchableOpacity>
            {costResult && (
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <StatBox label="Per Person" value={`₹${costResult.per_person_cost}`} color="#06b6d4" />
                  <StatBox label="You Save" value={`₹${costResult.comparison.savings_per_person}`} color="#10b981" />
                </View>
                <View style={s.infoRow}><Text style={s.infoLabel}>Ola estimate</Text><Text style={[s.infoValue, { textDecorationLine: 'line-through', color: '#ef4444' }]}>₹{costResult.comparison.ola_estimate}</Text></View>
                <View style={s.infoRow}><Text style={s.infoLabel}>Savings</Text><Text style={[s.infoValue, { color: '#10b981' }]}>{costResult.comparison.savings_percent}% cheaper</Text></View>
                <View style={s.infoRow}><Text style={s.infoLabel}>🌿 CO₂ saved</Text><Text style={[s.infoValue, { color: '#10b981' }]}>{costResult.eco_impact.co2_saved_grams}g</Text></View>
              </View>
            )}
          </View>
        )}

        {/* 🔐 OTP */}
        {tab === 'otp' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🔐 Ride OTP Verification</Text>
            <FormInput label="Ride ID" value={otpRideId} onChangeText={setOtpRideId} placeholder="Enter your ride ID" />
            <TouchableOpacity onPress={generateOTP} style={s.btnPrimary}><Text style={s.btnText}>Generate OTP 🔑</Text></TouchableOpacity>
            {otps.map((o, i) => (
              <View key={i} style={[s.statBox, { borderColor: '#10b98133', backgroundColor: '#10b98111', marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }]}>
                <Text style={s.infoLabel}>Booking #{o.booking_id}</Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#10b981', letterSpacing: 6 }}>{o.otp}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 🌿 CARBON */}
        {tab === 'carbon' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🌿 Your Green Impact</Text>
            {carbonData ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <StatBox label="CO₂ Saved (kg)" value={carbonData.total_co2_saved_kg} color="#10b981" />
                <StatBox label="km Shared" value={carbonData.total_km} color="#06b6d4" />
                <StatBox label="Money Saved" value={`₹${carbonData.total_money_saved}`} color="#f59e0b" />
                <StatBox label="🌳 Trees" value={carbonData.trees_equivalent} color="#8b5cf6" />
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}><Text style={{ fontSize: 40, marginBottom: 8 }}>🌱</Text><Text style={{ color: '#94a3b8' }}>Start sharing rides!</Text></View>
            )}
          </View>
        )}

        {/* 💰 AI PRICE */}
        {tab === 'price' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>💰 AI Price Suggestion</Text>
            <FormInput label="Item Title" value={priceForm.title} onChangeText={v => setPriceForm({...priceForm, title: v})} placeholder="e.g., iPhone 13 Pro" />
            <FormInput label="Category" value={priceForm.category} onChangeText={v => setPriceForm({...priceForm, category: v})} placeholder="Electronics" />
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {['Like New', 'Excellent', 'Good', 'Fair'].map(c => (
                <TouchableOpacity key={c} onPress={() => setPriceForm({...priceForm, condition: c})} style={[s.tabPill, priceForm.condition === c && s.tabPillActive, { flex: 1 }]}>
                  <Text style={[s.tabPillText, priceForm.condition === c && { color: '#fff' }, { fontSize: 10, textAlign: 'center' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={suggestPrice} style={[s.btnPrimary, { backgroundColor: '#f59e0b' }]}><Text style={s.btnText}>Get AI Price 🤖</Text></TouchableOpacity>
            {priceResult && (
              <View style={{ marginTop: 16 }}>
                <View style={[s.statBox, { borderColor: '#f59e0b33', backgroundColor: '#f59e0b11', marginBottom: 8 }]}>
                  <Text style={s.infoLabel}>Recommended Price</Text>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: '#f59e0b' }}>₹{priceResult.recommended_price?.toLocaleString()}</Text>
                </View>
                <View style={s.infoRow}><Text style={s.infoLabel}>Range</Text><Text style={s.infoValue}>₹{priceResult.price_range?.min} — ₹{priceResult.price_range?.max}</Text></View>
                <View style={s.infoRow}><Text style={s.infoLabel}>Market avg</Text><Text style={s.infoValue}>₹{priceResult.market_data?.avg_price}</Text></View>
                <Text style={{ color: '#06b6d4', fontSize: 11, fontWeight: '700', marginTop: 8 }}>💡 {priceResult.tip}</Text>
              </View>
            )}
          </View>
        )}

        {/* 🛡️ ESCROW */}
        {tab === 'escrow' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🛡️ Escrow Safe Pay</Text>
            <FormInput label="Listing ID" value={escrowForm.listing_id} onChangeText={v => setEscrowForm({...escrowForm, listing_id: v})} placeholder="Paste listing ID" />
            <FormInput label="Amount (₹)" value={escrowForm.amount} onChangeText={v => setEscrowForm({...escrowForm, amount: v})} keyboardType="numeric" placeholder="Amount" />
            <TouchableOpacity onPress={createEscrow} style={[s.btnPrimary, { backgroundColor: '#10b981' }]}><Text style={s.btnText}>Hold Payment 🔒</Text></TouchableOpacity>
            {escrowResult && (
              <View style={{ marginTop: 16 }}>
                <StatBox label="Payment Held" value={`₹${escrowResult.amount}`} color="#10b981" />
                <View style={[s.infoRow, { marginTop: 8 }]}><Text style={s.infoLabel}>Fee</Text><Text style={s.infoValue}>₹{escrowResult.platform_fee}</Text></View>
                <View style={s.infoRow}><Text style={s.infoLabel}>Seller gets</Text><Text style={[s.infoValue, { color: '#10b981' }]}>₹{escrowResult.net_to_seller}</Text></View>
                <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700', marginTop: 8 }}>{escrowResult.message}</Text>
              </View>
            )}
          </View>
        )}

        {/* 📈 SKILL GAP */}
        {tab === 'gap' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📈 Skill Gap Analyzer</Text>
            <FormInput label="Job ID" value={gapJobId} onChangeText={setGapJobId} placeholder="Enter job posting ID" />
            <TouchableOpacity onPress={analyzeGap} style={[s.btnPrimary, { backgroundColor: '#f59e0b' }]}><Text style={s.btnText}>Analyze My Fit 📊</Text></TouchableOpacity>
            {gapResult && (
              <View style={{ marginTop: 16 }}>
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#06b6d422', justifyContent: 'center', alignItems: 'center', backgroundColor: '#06b6d411' }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#06b6d4' }}>{gapResult.current_match}%</Text>
                  </View>
                </View>
                {gapResult.matched_skills?.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>✅ Skills You Have</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {gapResult.matched_skills.map(sk => <View key={sk.skill} style={{ backgroundColor: '#10b98111', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}><Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700' }}>✅ {sk.skill}</Text></View>)}
                    </View>
                  </View>
                )}
                {gapResult.missing_skills?.length > 0 && (
                  <View>
                    <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>❌ Skills You Need</Text>
                    {gapResult.missing_skills.map(sk => (
                      <View key={sk.skill} style={{ backgroundColor: '#ef444411', borderRadius: 8, padding: 8, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '700' }}>{sk.skill}</Text>
                        <Text style={{ color: '#06b6d4', fontSize: 10, fontWeight: '700' }}>Learn →</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={{ color: '#06b6d4', fontSize: 11, fontWeight: '700', marginTop: 8 }}>{gapResult.recommendation}</Text>
              </View>
            )}
          </View>
        )}

        {/* 🔔 ALERTS */}
        {tab === 'alerts' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🔔 Job Alerts</Text>
            <FormInput label="Keywords" value={alertForm.keywords} onChangeText={v => setAlertForm({...alertForm, keywords: v})} placeholder="e.g., React Developer" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><FormInput label="Job Type" value={alertForm.job_type} onChangeText={v => setAlertForm({...alertForm, job_type: v})} placeholder="Full-time" /></View>
              <View style={{ flex: 1 }}><FormInput label="Min Salary ₹" value={alertForm.min_salary} onChangeText={v => setAlertForm({...alertForm, min_salary: v})} keyboardType="numeric" /></View>
            </View>
            <TouchableOpacity onPress={createAlert} style={s.btnPrimary}><Text style={s.btnText}>Create Alert 🔔</Text></TouchableOpacity>
            {alerts.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: '#e2e8f0', fontSize: 14, fontWeight: '800', marginBottom: 8 }}>My Alerts ({alerts.length})</Text>
                {alerts.map(a => (
                  <View key={a.id} style={{ backgroundColor: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View><Text style={{ color: '#e2e8f0', fontWeight: '700', fontSize: 13 }}>{a.keywords || 'All Jobs'}</Text><Text style={{ color: '#94a3b8', fontSize: 10 }}>{a.frequency}</Text></View>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 📄 RESUME */}
        {tab === 'resume' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📄 Resume Parser</Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16 }}>Upload your resume on the web app to auto-extract skills, education, and experience.</Text>
            <View style={{ backgroundColor: '#06b6d411', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#06b6d422', borderStyle: 'dashed' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📤</Text>
              <Text style={{ color: '#06b6d4', fontWeight: '700', fontSize: 13 }}>Use web app for PDF upload</Text>
              <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>Visit /advanced on desktop</Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  tabPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  tabPillActive: { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
  tabPillText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  label: { color: '#94a3b8', fontSize: 10, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#0f172a', color: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155', fontSize: 14 },
  btnPrimary: { backgroundColor: '#06b6d4', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  statBox: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { color: '#94a3b8', fontSize: 12 },
  infoValue: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },
});
