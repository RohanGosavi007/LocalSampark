import React, { useState } from 'react';
import { View } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, Chips, DataState,
  useSocietyData, runAction, statusTone, titleCase, when,
} from '../../../../src/components/society/SocietyKit';

/**
 * Timed jobs for the gate — the water tanker at 7, the lift technician at 11.
 * Was a "Feature coming soon..." placeholder. Anyone in the society can set
 * one; the guard sees them in time order and dismisses each when done.
 */
const IN = [
  { value: '30', label: 'In 30 min' }, { value: '60', label: 'In 1 hour' },
  { value: '180', label: 'In 3 hours' }, { value: '1440', label: 'Tomorrow' },
];

export default function RemindersTab({ role }) {
  const guard = role === 'guard' || role === 'admin';
  const reminders = useSocietyData(guard ? `${SM}/guard-reminders` : null);
  const [form, setForm] = useState({ title: '', description: '', inMinutes: '60', priority: 'normal' });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const res = await runAction('post', `${SM}/guard-reminder`, {
      title: form.title.trim(), description: form.description.trim() || undefined, priority: form.priority,
      reminderTime: new Date(Date.now() + Number(form.inMinutes) * 60000).toISOString(),
    }, { success: 'Reminder set for the gate.' });
    setBusy(false);
    if (res) { setForm({ title: '', description: '', inMinutes: '60', priority: 'normal' }); if (guard) reminders.reload(); }
  };

  const dismiss = (r) => runAction('put', `${SM}/guard-reminders/${r.id}/dismiss`, null, { onDone: () => reminders.reload() });
  const overdue = (r) => r.reminder_time && Date.parse(r.reminder_time) < Date.now();

  return (
    <View>
      <Card title="Remind the gate" subtitle="For something the guard needs to do at a set time.">
        <Field label="What" placeholder="e.g. Let the water tanker in" value={form.title} maxLength={120}
          onChangeText={(title) => setForm({ ...form, title })} />
        <Field label="Details (optional)" value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
        <Chips options={IN} value={form.inMinutes} onChange={(inMinutes) => setForm({ ...form, inMinutes })} />
        <Chips options={['normal', 'high', 'urgent']} value={form.priority} onChange={(priority) => setForm({ ...form, priority })} />
        <Button label="Set reminder" onPress={create} busy={busy} disabled={!form.title.trim()} />
      </Card>

      {guard && (
        <Card title="Upcoming">
          <DataState state={reminders} empty="No reminders" emptyBody="Reminders residents set for the gate appear here.">
            {(reminders.data || []).map((r, i) => (
              <Row key={r.id} first={i === 0} title={r.title}
                meta={[r.description, `${overdue(r) ? 'Due ' : ''}${when(r.reminder_time)}${r.created_by_name ? ` · ${r.created_by_name}` : ''}`]}
                right={(
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    {r.priority && r.priority !== 'normal' && <Badge label={titleCase(r.priority)} tone={statusTone(r.priority)} />}
                    <Button label="Done" tone={overdue(r) ? 'primary' : 'secondary'} small onPress={() => dismiss(r)} />
                  </View>
                )} />
            ))}
          </DataState>
        </Card>
      )}
    </View>
  );
}
