import React, { useState } from 'react';
import { View } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, Chips, Stats, DataState,
  useSocietyData, runAction, confirmAction, titleCase,
} from '../../../../src/components/society/SocietyKit';

/**
 * Parking slots. Two vehicles were hardcoded as the resident's own — a Honda
 * City and a Royal Enfield in slot A-42 — for every resident. A resident now
 * sees their flat's slots; the gate searches the register by plate; the
 * committee allocates.
 */
export default function ParkingTab({ role }) {
  const resident = role === 'resident';
  const slots = useSocietyData(resident ? `${SM}/my-parking` : `${SM}/parking`);
  const [plate, setPlate] = useState('');
  const [form, setForm] = useState({ slotNumber: '', slotType: 'car', flatNumber: '', vehicleNumber: '' });
  const [busy, setBusy] = useState(false);

  const norm = (v) => String(v || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const rows = (slots.data || []).filter((s) => !plate || norm(s.vehicle_number).includes(norm(plate)) || norm(s.flat_number).includes(norm(plate)));
  const occupied = (slots.data || []).filter((s) => s.is_occupied === 1 || s.is_occupied === true || s.flat_number).length;

  const add = async () => {
    setBusy(true);
    const res = await runAction('post', `${SM}/parking`, {
      ...form, slotNumber: form.slotNumber.trim().toUpperCase(), flatNumber: form.flatNumber.trim().toUpperCase() || undefined,
      vehicleNumber: form.vehicleNumber.trim().toUpperCase() || undefined,
    }, { success: 'Slot saved.' });
    setBusy(false);
    if (res) { setForm({ slotNumber: '', slotType: 'car', flatNumber: '', vehicleNumber: '' }); slots.reload(); }
  };

  const remove = (s) => confirmAction(`Delete slot ${s.slot_number}?`, 'The allocation is removed.',
    () => runAction('delete', `${SM}/parking/${s.id}`, null, { onDone: () => slots.reload() }), 'Delete');

  return (
    <View>
      {!resident && (
        <Stats items={[
          { label: 'Slots', value: (slots.data || []).length },
          { label: 'Allocated', value: occupied },
          { label: 'Free', value: (slots.data || []).length - occupied },
        ]} />
      )}

      {role === 'admin' && (
        <Card title="Allocate a slot">
          <Field label="Slot number" placeholder="e.g. P-12" autoCapitalize="characters" value={form.slotNumber}
            onChangeText={(slotNumber) => setForm({ ...form, slotNumber })} />
          <Chips options={['car', 'bike', 'ev', 'visitor']} value={form.slotType} onChange={(slotType) => setForm({ ...form, slotType })} />
          <Field label="Flat (optional)" autoCapitalize="characters" value={form.flatNumber} onChangeText={(flatNumber) => setForm({ ...form, flatNumber })} />
          <Field label="Vehicle number (optional)" autoCapitalize="characters" value={form.vehicleNumber}
            onChangeText={(vehicleNumber) => setForm({ ...form, vehicleNumber })} />
          <Button label="Save slot" onPress={add} busy={busy} disabled={!form.slotNumber.trim()} />
        </Card>
      )}

      <Card title={resident ? 'My parking' : 'Parking register'}>
        {!resident && (
          <Field placeholder="Search plate or flat, e.g. MH12AB" autoCapitalize="characters" value={plate}
            onChangeText={setPlate} accessibilityLabel="Search parking register" />
        )}
        <DataState state={{ ...slots, data: rows }}
          empty={plate ? 'Not registered in this society' : resident ? 'No slot allocated' : 'No slots yet'}
          emptyBody={plate ? 'Treat it as a visitor vehicle.' : resident ? 'Ask the society office to allocate one.' : null}>
          {rows.map((s, i) => (
            <Row key={s.id} first={i === 0} title={`Slot ${s.slot_number}`}
              meta={[[titleCase(s.slot_type), s.flat_number && `Flat ${s.flat_number}`].filter(Boolean).join(' · '), s.vehicle_number]}
              right={role === 'admin'
                ? <Button label="Delete" tone="secondary" small onPress={() => remove(s)} />
                : <Badge label={s.flat_number ? 'Allocated' : 'Free'} tone={s.flat_number ? 'info' : 'success'} />} />
          ))}
        </DataState>
      </Card>
    </View>
  );
}
