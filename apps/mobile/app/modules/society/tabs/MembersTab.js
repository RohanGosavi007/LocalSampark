import React, { useState } from 'react';
import { View } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, Chips, DataState,
  useSocietyData, runAction, confirmAction, titleCase,
} from '../../../../src/components/society/SocietyKit';

/**
 * The society roll. Was a "Feature coming soon..." placeholder; the committee
 * now adds residents by the phone number they signed up with, moves them
 * between flats, and removes them (deactivated, so their history stays).
 */
const ROLES = ['resident', 'owner', 'tenant', 'guard', 'secretary'];

export default function MembersTab({ role }) {
  const members = useSocietyData(`${SM}/members`);
  const [form, setForm] = useState({ phone: '', flatNumber: '', role: 'resident' });
  const [busy, setBusy] = useState(false);
  const office = role === 'admin';

  const add = async () => {
    setBusy(true);
    const res = await runAction('post', `${SM}/members`, {
      ...form, flatNumber: form.flatNumber.trim().toUpperCase(),
    }, { success: 'Member added.' });
    setBusy(false);
    if (res) { setForm({ phone: '', flatNumber: '', role: 'resident' }); members.reload(); }
  };

  const remove = (m) => confirmAction(
    `Remove ${m.full_name || 'this member'}?`,
    'They lose access to the society. Their bills and history are kept.',
    () => runAction('delete', `${SM}/members/${m.id}`, null, { onDone: () => members.reload() }),
    'Remove',
  );

  return (
    <View>
      {office && (
        <Card title="Add a member" subtitle="They need a LocalSampark account on this phone number.">
          <Field label="Phone number" keyboardType="phone-pad" maxLength={13} value={form.phone}
            onChangeText={(phone) => setForm({ ...form, phone })} />
          <Field label="Flat" placeholder="e.g. A-101" autoCapitalize="characters" value={form.flatNumber}
            onChangeText={(flatNumber) => setForm({ ...form, flatNumber })} />
          <Chips options={ROLES} value={form.role} onChange={(r) => setForm({ ...form, role: r })} />
          <Button label="Add member" onPress={add} busy={busy}
            disabled={form.phone.replace(/\D/g, '').length < 10 || !form.flatNumber.trim()} />
        </Card>
      )}

      <Card title={`Members${members.data?.length ? ` (${members.data.length})` : ''}`}>
        <DataState state={members} empty="No members yet">
          {(members.data || []).map((m, i) => (
            <Row key={m.id} first={i === 0} title={m.full_name || 'Unnamed member'}
              meta={[`Flat ${m.flat_number || '—'} · ${titleCase(m.occupancy_type || m.role)}`, m.phone_number]}
              right={office
                ? <Button label="Remove" tone="secondary" small onPress={() => remove(m)} accessibilityLabel={`Remove ${m.full_name}`} />
                : <Badge label={titleCase(m.role)} />} />
          ))}
        </DataState>
      </Card>
    </View>
  );
}
