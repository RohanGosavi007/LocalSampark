import React, { useState } from 'react';
import { View } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, Chips, Stats, DataState,
  useSocietyData, runAction, titleCase, when,
} from '../../../../src/components/society/SocietyKit';

/**
 * Domestic staff: who works in the society, and who is in today. Was a
 * "Feature coming soon..." placeholder. The gate marks attendance; the office
 * registers staff; residents see who is assigned to their flat.
 */
const TYPES = ['maid', 'cook', 'driver', 'nanny', 'housekeeping', 'security', 'gardener'];

export default function StaffTab({ role }) {
  const staff = useSocietyData(`${SM}/staff`);
  const desk = role === 'guard' || role === 'admin';
  const attendance = useSocietyData(desk ? `${SM}/staff/attendance/today` : null);
  const [form, setForm] = useState({ staffName: '', staffPhone: '', staffType: 'maid', assignedFlats: '' });
  const [busy, setBusy] = useState(null);

  const mark = async (st, action) => {
    setBusy(st.id);
    await runAction('post', `${SM}/staff/${st.id}/attendance`, { action }, { onDone: () => attendance.reload() });
    setBusy(null);
  };

  const add = async () => {
    setBusy('add');
    const res = await runAction('post', `${SM}/staff`, {
      ...form, assignedFlats: form.assignedFlats.split(',').map((f) => f.trim().toUpperCase()).filter(Boolean),
    }, { success: 'Staff member registered.' });
    setBusy(null);
    if (res) { setForm({ staffName: '', staffPhone: '', staffType: 'maid', assignedFlats: '' }); staff.reload(); }
  };

  const today = attendance.data || [];
  const recordFor = (id) => today.find((a) => a.staff_id === id);
  const inside = today.filter((a) => a.check_in_time && !a.check_out_time).length;

  return (
    <View>
      {desk && (
        <Stats items={[
          { label: 'Registered', value: (staff.data || []).length },
          { label: 'In today', value: today.length },
          { label: 'Inside now', value: inside },
        ]} />
      )}

      {role === 'admin' && (
        <Card title="Register staff" subtitle="Maids, drivers and other help who enter the society daily.">
          <Field label="Name" value={form.staffName} autoCapitalize="words" onChangeText={(staffName) => setForm({ ...form, staffName })} />
          <Field label="Phone" keyboardType="phone-pad" maxLength={13} value={form.staffPhone}
            onChangeText={(staffPhone) => setForm({ ...form, staffPhone })} />
          <Field label="Flats (comma separated)" placeholder="A-101, B-404" autoCapitalize="characters"
            value={form.assignedFlats} onChangeText={(assignedFlats) => setForm({ ...form, assignedFlats })} />
          <Chips options={TYPES} value={form.staffType} onChange={(staffType) => setForm({ ...form, staffType })} />
          <Button label="Register" onPress={add} busy={busy === 'add'} disabled={!form.staffName.trim()} />
        </Card>
      )}

      <Card title={desk ? "Today's attendance" : 'Society staff'}>
        <DataState state={staff} empty="No staff registered" emptyBody="The society office registers domestic staff.">
          {(staff.data || []).map((st, i) => {
            const rec = recordFor(st.id);
            let right = <Badge label={titleCase(st.staff_type)} />;
            if (desk) {
              if (!rec) right = <Button label="Check in" small busy={busy === st.id} onPress={() => mark(st, 'check_in')} />;
              else if (!rec.check_out_time) right = <Button label="Check out" tone="secondary" small busy={busy === st.id} onPress={() => mark(st, 'check_out')} />;
              else right = <Badge label="Left" tone="neutral" />;
            }
            return (
              <Row key={st.id} first={i === 0} title={st.staff_name}
                meta={[
                  `${titleCase(st.staff_type)}${st.assigned_flats?.length ? ` · ${st.assigned_flats.join(', ')}` : ''}`,
                  rec?.check_in_time && `In ${when(rec.check_in_time)}${rec.check_out_time ? ` · Out ${when(rec.check_out_time)}` : ''}`,
                  !desk && st.staff_phone,
                ]}
                right={right} />
            );
          })}
        </DataState>
      </Card>
    </View>
  );
}
