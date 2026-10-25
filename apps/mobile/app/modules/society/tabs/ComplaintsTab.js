import React, { useState } from 'react';
import { View, Text } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, Chips, DataState,
  useSocietyData, runAction, statusTone, titleCase, when, useKitStyles,
} from '../../../../src/components/society/SocietyKit';

/**
 * Helpdesk tickets. The form used to submit nothing and the list could never
 * fill, because no endpoint listed complaints back. Residents now file and
 * follow their own; the committee works the society's queue.
 */
const CATEGORIES = ['plumbing', 'electrical', 'lift', 'cleaning', 'security', 'parking', 'noise', 'other'];

export default function ComplaintsTab({ role }) {
  const s = useKitStyles();
  const office = role === 'admin';
  const list = useSocietyData(office ? `${SM}/complaints/all` : `${SM}/my-complaints`);
  const [form, setForm] = useState({ category: 'plumbing', title: '', description: '', priority: 'medium' });
  const [filter, setFilter] = useState('open');
  const [busy, setBusy] = useState(false);

  const file = async () => {
    setBusy(true);
    const res = await runAction('post', `${SM}/complaints`, {
      ...form, title: form.title.trim(), description: form.description.trim(),
    }, { success: 'Ticket raised. The committee has been notified.' });
    setBusy(false);
    if (res) { setForm({ category: 'plumbing', title: '', description: '', priority: 'medium' }); list.reload(); }
  };

  const move = (c, verb) => runAction('put', `${SM}/complaints/${c.id}/${verb}`, {}, { onDone: () => list.reload() });

  const rows = (list.data || []).filter((c) => !office || filter === 'all'
    || (filter === 'open' ? ['open', 'in_progress'].includes(c.status) : c.status === filter));

  return (
    <View>
      {!office && (
        <Card title="Raise a ticket">
          <Chips options={CATEGORIES} value={form.category} onChange={(category) => setForm({ ...form, category })} />
          <Field label="What's wrong?" placeholder="e.g. Kitchen tap leaking" value={form.title} maxLength={140}
            onChangeText={(title) => setForm({ ...form, title })} />
          <Field label="Details" multiline value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
          <Text style={s.label}>Priority</Text>
          <Chips options={['low', 'medium', 'high', 'urgent']} value={form.priority} onChange={(priority) => setForm({ ...form, priority })} />
          <Button label="Submit ticket" onPress={file} busy={busy} disabled={!form.title.trim()} />
        </Card>
      )}

      <Card title={office ? 'Society tickets' : 'My tickets'}>
        {office && <Chips options={['open', 'resolved', 'all']} value={filter} onChange={setFilter} />}
        <DataState state={{ ...list, data: rows }} empty={office ? 'No tickets here' : 'No tickets yet'}>
          {rows.map((c, i) => (
            <Row key={c.id} first={i === 0} title={c.title}
              meta={[
                [titleCase(c.category), c.flat_number && `Flat ${c.flat_number}`, office && c.full_name].filter(Boolean).join(' · '),
                c.description, c.admin_notes && `Committee: ${c.admin_notes}`, when(c.created_at),
              ]}
              right={<Badge label={titleCase(c.status)} tone={statusTone(c.status)} />}>
              {office && c.status !== 'resolved' && c.status !== 'closed' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  {c.status === 'open' && <Button label="Start work" small onPress={() => move(c, 'assign')} />}
                  <Button label="Mark resolved" tone="success" small onPress={() => move(c, 'resolve')} />
                </View>
              )}
            </Row>
          ))}
        </DataState>
      </Card>
    </View>
  );
}
