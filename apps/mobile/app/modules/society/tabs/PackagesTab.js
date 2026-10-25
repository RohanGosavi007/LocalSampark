import React, { useState } from 'react';
import { View } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, DataState,
  useSocietyData, useSocietyContext, useSocietyLive, runAction, statusTone, titleCase, when,
} from '../../../../src/components/society/SocietyKit';

/**
 * Parcels held at the gate.
 *
 * Residents were sent to the guard-only queue (/packages/pending) and refused,
 * and the guard's queue filtered on a status the seeded parcels did not have,
 * so both sides saw nothing. "+ Log New Package" had no handler. Now the guard
 * logs a parcel and the flat hears about it live; either side marks it
 * collected.
 */
export default function PackagesTab({ role }) {
  const { context } = useSocietyContext();
  const desk = role === 'guard' || role === 'admin';
  const list = useSocietyData(desk ? `${SM}/packages/pending` : `${SM}/my-packages`);
  const [form, setForm] = useState({ flatNumber: '', courierName: '', packageDescription: '' });
  const [busy, setBusy] = useState(false);

  useSocietyLive(context, { flat: !desk }, { PACKAGE_ARRIVED: () => list.reload() });

  const log = async () => {
    setBusy(true);
    const res = await runAction('post', `${SM}/packages`, {
      ...form, flatNumber: form.flatNumber.trim().toUpperCase(),
    }, { success: 'Logged. The flat has been told.' });
    setBusy(false);
    if (res) { setForm({ flatNumber: '', courierName: '', packageDescription: '' }); list.reload(); }
  };

  const collect = (p) => runAction('put', `${SM}/packages/${p.id}/collect`, null, { onDone: () => list.reload() });
  const waiting = (p) => p.status !== 'collected';

  return (
    <View>
      {desk && (
        <Card title="Log a parcel">
          <Field label="Flat" placeholder="e.g. C-203" autoCapitalize="characters" value={form.flatNumber}
            onChangeText={(flatNumber) => setForm({ ...form, flatNumber })} />
          <Field label="Courier" placeholder="e.g. Blue Dart" value={form.courierName} onChangeText={(courierName) => setForm({ ...form, courierName })} />
          <Field label="Description (optional)" value={form.packageDescription}
            onChangeText={(packageDescription) => setForm({ ...form, packageDescription })} />
          <Button label="Log parcel" onPress={log} busy={busy} disabled={!form.flatNumber.trim()} />
        </Card>
      )}

      <Card title={desk ? 'Waiting at the gate' : 'My parcels'}>
        <DataState state={list} empty="Nothing at the gate" emptyBody={desk ? null : 'The guard logs parcels for your flat here.'}>
          {(list.data || []).map((p, i) => (
            <Row key={p.id} first={i === 0} title={`${desk ? `${p.flat_number} · ` : ''}${p.courier_name || 'Parcel'}`}
              meta={[p.package_description, `Arrived ${when(p.created_at)}`, p.collected_at && `Collected ${when(p.collected_at)}`]}
              right={waiting(p)
                ? <Button label={desk ? 'Handed over' : 'Collected'} small onPress={() => collect(p)} />
                : <Badge label={titleCase(p.status)} tone={statusTone(p.status)} />} />
          ))}
        </DataState>
      </Card>
    </View>
  );
}
