import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';

/**
 * Clinic page.
 *
 * The practitioner block named a doctor who does not exist — "Dr. Rajesh Sharma,
 * MBBS, MD (General Medicine), 15+ Years Experience, ₹500 consultation" — and
 * showed it on every clinic a patient opened, whatever that clinic's actual name.
 * Inventing a doctor's qualifications and fee is the kind of claim a patient
 * acts on: they choose a clinic on it, and turn up expecting that person.
 *
 * MOCK_SLOTS then offered four bookable times "today" at every clinic, whether
 * or not anybody was consulting.
 *
 * The header now comes from the shop's own record, the fee from the service the
 * clinic published, and the slot grid stays empty until this view is wired to
 * /shops/:id/staff/:sid/slots — which is the endpoint that knows real times.
 */
export default function DoctorVisitorView({ shop, services = [] }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Consultation is whichever service the clinic listed; the fee is theirs.
  const consultation = services[0] || null;

  // No invented availability. An empty grid says the clinic has published none.
  const slots = [];

  return (
    <VisitorLayout
      shop={shop}
      shopName={shop.name || 'Clinic'}
      shopAddress={shop.address || ''}
      shopIcon="🩺"
      cartCount={selectedSlot ? 1 : 0}
      onCheckout={() => router.push('/modules/checkout')}
    >
      <View style={{ padding: 16 }}>

        <View style={styles.docProfile}>
          <Text style={styles.docName}>{shop.name || 'Clinic'}</Text>
          {shop.description ? <Text style={styles.docEdu}>{shop.description}</Text> : null}
          {/* Fee shown only when the clinic published one. */}
          {consultation?.price ? (
            <View style={styles.feeBox}>
              <Text style={styles.feeLabel}>{consultation.name || 'Consultation'}</Text>
              <Text style={styles.feeVal}>₹{Number(consultation.price) || 0}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Available Slots Today</Text>

        {slots.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyBody}>
              This clinic has not published consulting times yet. Contact them
              directly to book an appointment.
            </Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map(slot => (
              <TouchableOpacity
                key={slot.id}
                style={[styles.slotCard, selectedSlot === slot.id && styles.slotCardActive]}
                onPress={() => setSelectedSlot(slot.id)}
              >
                <Text style={[styles.slotTime, selectedSlot === slot.id && styles.slotTimeActive]}>
                  {slot.time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  emptyBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  docProfile: { backgroundColor: '#f0f9ff', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#bae6fd' },
  docName: { fontSize: 20, fontWeight: '900', color: '#0369a1', marginBottom: 4 },
  docEdu: { fontSize: 14, color: '#0284c7', marginBottom: 2 },
  feeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#e0f2fe', paddingTop: 12, marginTop: 12 },
  feeLabel: { fontSize: 14, color: '#0369a1', fontWeight: 'bold' },
  feeVal: { fontSize: 18, color: '#0284c7', fontWeight: '900' },

  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  slotCard: { width: '30%', backgroundColor: '#fff', borderRadius: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  slotCardActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  slotTime: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
  slotTimeActive: { color: '#fff' },
});
