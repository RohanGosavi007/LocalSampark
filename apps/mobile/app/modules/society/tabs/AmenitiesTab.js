import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, Chips, DataState,
  useSocietyData, runAction, confirmAction, statusTone, titleCase, rupees, when,
} from '../../../../src/components/society/SocietyKit';

/**
 * Shared facilities and bookings. Nothing used to list what a society had, so
 * this tab was permanently empty. Booking checks overlap on the server, so two
 * residents cannot both hold the hall from 10 to 12.
 */
const nextDays = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(Date.now() + i * 86400000);
  return { value: d.toISOString().slice(0, 10), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) };
});
const SLOTS = ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];
const plus2h = (t) => `${String(Number(t.slice(0, 2)) + 2).padStart(2, '0')}:00`;

export default function AmenitiesTab({ role }) {
  const amenities = useSocietyData(`${SM}/amenities`);
  const bookings = useSocietyData(role === 'guard' ? null : `${SM}/my-bookings`);
  const [picking, setPicking] = useState(null);
  const [date, setDate] = useState(nextDays(1)[0].value);
  const [slot, setSlot] = useState('17:00');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: '', hourlyRate: '0', rules: '' });

  const book = async (a) => {
    setBusy(true);
    const res = await runAction('post', `${SM}/amenities/${a.id}/book`, {
      bookingDate: date, startTime: slot, endTime: plus2h(slot),
    });
    setBusy(false);
    if (res) {
      setPicking(null);
      bookings.reload();
      const charge = res.data?.total_charge;
      Alert.alert('Booked', `${a.name}, ${when(date, { time: false })} ${slot}–${plus2h(slot)}${charge ? ` · ${rupees(charge)}` : ''}`);
    }
  };

  const cancel = (b) => confirmAction('Cancel this booking?', `${b.amenity_name}, ${when(b.booking_date, { time: false })} ${b.start_time}`,
    () => runAction('put', `${SM}/bookings/${b.id}/cancel`, null, { onDone: () => bookings.reload() }), 'Cancel booking');

  const add = async () => {
    setBusy(true);
    const res = await runAction('post', `${SM}/amenities`, form, { success: 'Amenity added.' });
    setBusy(false);
    if (res) { setForm({ name: '', capacity: '', hourlyRate: '0', rules: '' }); amenities.reload(); }
  };

  return (
    <View>
      {role === 'admin' && (
        <Card title="Add an amenity">
          <Field label="Name" placeholder="e.g. Clubhouse" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
          <Field label="Capacity" keyboardType="number-pad" value={form.capacity} onChangeText={(capacity) => setForm({ ...form, capacity })} />
          <Field label="Charge per hour (₹)" keyboardType="decimal-pad" value={form.hourlyRate} onChangeText={(hourlyRate) => setForm({ ...form, hourlyRate })} />
          <Field label="Rules (optional)" multiline value={form.rules} onChangeText={(rules) => setForm({ ...form, rules })} />
          <Button label="Add amenity" onPress={add} busy={busy} disabled={!form.name.trim()} />
        </Card>
      )}

      <Card title="Amenities">
        <DataState state={amenities} empty="No amenities listed" emptyBody="Your committee has not published the shared facilities yet.">
          {(amenities.data || []).map((a, i) => (
            <Row key={a.id} first={i === 0} title={a.name}
              meta={[
                [a.capacity && `Up to ${a.capacity}`, Number(a.hourly_rate) ? `${rupees(a.hourly_rate)}/hr` : 'Free',
                  a.available_from && `${a.available_from}–${a.available_until}`].filter(Boolean).join(' · '),
                a.rules,
              ]}
              right={role !== 'guard' && picking !== a.id ? <Button label="Book" small onPress={() => setPicking(a.id)} /> : null}>
              {picking === a.id && (
                <View style={{ marginTop: 10 }}>
                  <Chips options={nextDays(5)} value={date} onChange={setDate} />
                  <Chips options={SLOTS.map((t) => ({ value: t, label: `${t}–${plus2h(t)}` }))} value={slot} onChange={setSlot} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button label="Confirm" onPress={() => book(a)} busy={busy} style={{ flex: 1 }} />
                    <Button label="Close" tone="secondary" onPress={() => setPicking(null)} style={{ flex: 1 }} />
                  </View>
                </View>
              )}
            </Row>
          ))}
        </DataState>
      </Card>

      {role !== 'guard' && (
        <Card title="My bookings">
          <DataState state={bookings} empty="No bookings yet">
            {(bookings.data || []).map((b, i) => (
              <Row key={b.id} first={i === 0} title={b.amenity_name || 'Amenity'}
                meta={[`${when(b.booking_date, { time: false })} · ${b.start_time}–${b.end_time}`, Number(b.total_charge) ? rupees(b.total_charge) : null]}
                right={b.status === 'confirmed' && b.booking_date >= new Date().toISOString().slice(0, 10)
                  ? <Button label="Cancel" tone="secondary" small onPress={() => cancel(b)} />
                  : <Badge label={titleCase(b.status)} tone={statusTone(b.status)} />} />
            ))}
          </DataState>
        </Card>
      )}
    </View>
  );
}
