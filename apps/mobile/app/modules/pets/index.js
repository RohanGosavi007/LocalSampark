import React, { useState, useEffect, useCallback } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost } from '../../../src/lib/api';

// The signed-in person's own pets, from GET/POST /pets. This screen used to show three
// invented vet clinics with phone numbers, three lost/found animals at named societies, and a
// price list for grooming, none of which any API supplied.
const SPECIES = ['Dog', 'Cat', 'Bird', 'Other'];

function PetsModule() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', species: 'Dog', breed: '', ageYears: '' });

  const load = useCallback(async () => {
    try {
      const r = await apiGet('/pets');
      setPets(Array.isArray(r) ? r : (r && (r.data || r.rows)) || []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load your pets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Name needed', 'Enter your pet\'s name.'); return; }
    const age = form.ageYears === '' ? undefined : Number(form.ageYears);
    if (age !== undefined && (!Number.isFinite(age) || age < 0 || age > 50)) { Alert.alert('Check the age', 'Enter the age in years.'); return; }
    setSaving(true);
    try {
      await apiPost('/pets', { name: form.name.trim(), species: form.species, breed: form.breed.trim() || undefined, ageYears: age });
      setForm({ name: '', species: 'Dog', breed: '', ageYears: '' });
      setAdding(false);
      await load();
    } catch (e) {
      Alert.alert('Not saved', e.message || 'Your pet could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>🐾 My Pets</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
          <>
            {error && <Text style={styles.error}>{error}</Text>}
            {pets.length === 0 && !error && <Text style={styles.sub}>You have not added a pet yet.</Text>}
            {pets.map((p) => (
              <View key={p.id} style={styles.card}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.sub}>{[p.species, p.breed, p.age_years != null ? `${p.age_years} yr` : null].filter(Boolean).join(' · ')}</Text>
              </View>
            ))}

            {adding ? (
              <View style={styles.card}>
                <Text style={styles.label}>Name</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} maxLength={40} />
                <Text style={styles.label}>Species</Text>
                <View style={styles.chips}>
                  {SPECIES.map((s) => (
                    <TouchableOpacity key={s} style={[styles.chip, form.species === s && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, species: s }))}>
                      <Text style={form.species === s ? styles.chipTextOn : styles.chipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>Breed (optional)</Text>
                <TextInput style={styles.input} value={form.breed} onChangeText={(v) => setForm((f) => ({ ...f, breed: v }))} maxLength={40} />
                <Text style={styles.label}>Age in years (optional)</Text>
                <TextInput style={styles.input} value={form.ageYears} onChangeText={(v) => setForm((f) => ({ ...f, ageYears: v }))} keyboardType="decimal-pad" />
                <TouchableOpacity style={[styles.btn, saving && styles.btnOff]} disabled={saving} onPress={save}>
                  <Text style={styles.btnText}>{saving ? 'Saving…' : 'Save pet'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.link} onPress={() => setAdding(false)}><Text style={styles.linkText}>Cancel</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.btn} onPress={() => setAdding(true)}><Text style={styles.btnText}>+ Add a pet</Text></TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16, paddingBottom: 48 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  sub: { color: '#64748b', marginTop: 4 },
  label: { fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }, chipOn: { backgroundColor: '#3b82f6' },
  chipText: { color: '#334155' }, chipTextOn: { color: '#fff', fontWeight: 'bold' },
  btn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  btnOff: { backgroundColor: '#94a3b8' }, btnText: { color: '#fff', fontWeight: 'bold' },
  link: { alignItems: 'center', marginTop: 12 }, linkText: { color: '#3b82f6', fontWeight: '600' },
  error: { color: '#dc2626', fontWeight: '600', marginBottom: 8 },
});

export default withRoleGuard(PetsModule, 'pets');
