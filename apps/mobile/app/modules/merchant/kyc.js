import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { myShopId, loadKyc, submitKyc, kycNeedsSubmission, KYC_STATUS_LABEL } from '../../../src/services/sellerTools';

/**
 * S1 on Android: the shop's KYC. No screen submitted it before — a seller
 * could register a shop on the phone and then had no way to get verified.
 */
const EMPTY = { pan_number: '', gst_number: '', bank_account_number: '', bank_ifsc: '', bank_name: '' };

export default function MerchantKyc() {
  const [shopId, setShopId] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [problems, setProblems] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const id = await myShopId();
      setShopId(id);
      setKyc(await loadKyc(id));
    } catch (e) {
      setError((e && e.message) || 'Your KYC could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    setError(''); setNotice(''); setProblems({});
    setBusy(true);
    try {
      await submitKyc(shopId, form);
      setKyc({ kyc_status: 'submitted' });
      setNotice('KYC submitted. We will tell you when your shop is verified.');
      setForm(EMPTY);
    } catch (e) {
      setProblems(e.problems || {});
      setError(e.message || 'Your KYC could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  const input = (key, label, props = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={form[key]} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))} accessibilityLabel={label} {...props} />
      {!!problems[key] && <Text style={styles.error} accessibilityLiveRegion="polite">{problems[key]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Shop KYC</Text>
        {loading ? <ActivityIndicator style={{ marginTop: 24 }} /> : (
          <>
            {kyc && (
              <Text style={styles.status} testID="kyc-status">
                Status: {KYC_STATUS_LABEL[kyc.kyc_status] || kyc.kyc_status}{kyc.rejection_reason ? ` — ${kyc.rejection_reason}` : ''}
              </Text>
            )}
            {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
            {!!notice && <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text>}
            {kyc && kycNeedsSubmission(kyc.kyc_status) && (
              <>
                {input('pan_number', 'PAN', { autoCapitalize: 'characters' })}
                {input('gst_number', 'GSTIN (if registered)', { autoCapitalize: 'characters' })}
                {input('bank_account_number', 'Bank account number', { keyboardType: 'number-pad' })}
                {input('bank_ifsc', 'IFSC', { autoCapitalize: 'characters' })}
                {input('bank_name', 'Bank name')}
                <TouchableOpacity style={styles.primary} onPress={send} disabled={busy || !shopId} accessibilityRole="button">
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit KYC</Text>}
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  status: { fontSize: 14, color: '#334155', marginTop: 12, fontWeight: '700' },
  field: { marginTop: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, minHeight: 44 },
  error: { color: '#b91c1c', marginTop: 6, fontSize: 13 },
  notice: { color: '#065f46', marginTop: 12, fontWeight: '700' },
  primary: { backgroundColor: '#f59e0b', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20, minHeight: 48, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
});
