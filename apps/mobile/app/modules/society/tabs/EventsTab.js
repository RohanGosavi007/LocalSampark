import React, { useState } from 'react';
import { View, Text } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, Chips, DataState,
  useSocietyData, useSocietyContext, useSocietyLive, runAction, confirmAction, titleCase, when, useKitStyles,
} from '../../../../src/components/society/SocietyKit';

/**
 * The society's own events.
 *
 * This tab listed the platform-wide /events catalogue and "RSVP" bought a
 * ticket through /events/:id/book, so a resident saw city events instead of
 * their society's, and RSVPing to the AGM was not possible. It now lists this
 * society's events, RSVP is going / maybe / not going, and the committee
 * creates and cancels them.
 */
const nextDays = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(Date.now() + (i + 1) * 86400000);
  return { value: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) };
});

export default function EventsTab({ role }) {
  const s = useKitStyles();
  const { context } = useSocietyContext();
  const events = useSocietyData(`${SM}/events`);
  const office = role === 'admin';
  const [form, setForm] = useState({ title: '', description: '', eventDate: nextDays(1)[0].value, startTime: '18:00', venue: '', eventType: 'general' });
  const [busy, setBusy] = useState(null);

  useSocietyLive(context, { society: true }, { SOCIETY_EVENT_CREATED: () => events.reload() });

  const rsvp = async (e, status) => {
    setBusy(`${e.id}:${status}`);
    await runAction('post', `${SM}/events/${e.id}/rsvp`, { status }, { onDone: () => events.reload() });
    setBusy(null);
  };

  const create = async () => {
    setBusy('create');
    const res = await runAction('post', `${SM}/events`, form, { success: 'Event published.' });
    setBusy(null);
    if (res) { setForm({ ...form, title: '', description: '', venue: '' }); events.reload(); }
  };

  const cancel = (e) => confirmAction(`Cancel ${e.title}?`, 'It is removed for everyone.',
    () => runAction('delete', `${SM}/events/${e.id}`, null, { onDone: () => events.reload() }), 'Cancel event');

  return (
    <View>
      {office && (
        <Card title="Create an event">
          <Field label="Title" value={form.title} onChangeText={(title) => setForm({ ...form, title })} maxLength={120} />
          <Chips options={nextDays(7)} value={form.eventDate} onChange={(eventDate) => setForm({ ...form, eventDate })} />
          <Field label="Start time (HH:MM)" value={form.startTime} keyboardType="numbers-and-punctuation"
            onChangeText={(startTime) => setForm({ ...form, startTime })} />
          <Field label="Venue" placeholder="e.g. Clubhouse" value={form.venue} onChangeText={(venue) => setForm({ ...form, venue })} />
          <Chips options={['general', 'meeting', 'festival', 'sports', 'kids']} value={form.eventType}
            onChange={(eventType) => setForm({ ...form, eventType })} />
          <Field label="Details (optional)" multiline value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
          <Button label="Publish event" onPress={create} busy={busy === 'create'} disabled={!form.title.trim()} />
        </Card>
      )}

      <Card title="Upcoming in your society">
        <DataState state={events} empty="Nothing scheduled" emptyBody="Events your committee schedules appear here.">
          {(events.data || []).map((e, i) => (
            <Row key={e.id} first={i === 0} title={e.title}
              meta={[
                `${when(e.event_date, { time: false })}${e.start_time ? ` · ${e.start_time}` : ''}${e.venue ? ` · ${e.venue}` : ''}`,
                `${e.going_count} going${e.max_attendees ? ` of ${e.max_attendees}` : ''}${e.organizer_name ? ` · by ${e.organizer_name}` : ''}`,
              ]}
              right={<Badge label={titleCase(e.event_type)} tone="info" />}>
              {e.description ? <Text style={[s.rowMeta, { marginTop: 4 }]}>{e.description}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {['going', 'maybe', 'not_going'].map((st) => (
                  <Button key={st} small label={st === 'not_going' ? "Can't go" : titleCase(st)}
                    tone={e.myRsvp === st ? 'primary' : 'secondary'} busy={busy === `${e.id}:${st}`}
                    onPress={() => rsvp(e, st)} accessibilityLabel={`RSVP ${st.replace('_', ' ')} to ${e.title}`} />
                ))}
                {office && <Button small label="Cancel" tone="danger" onPress={() => cancel(e)} />}
              </View>
            </Row>
          ))}
        </DataState>
      </Card>
    </View>
  );
}
