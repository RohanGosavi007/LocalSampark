import React, { useState } from 'react';
import { View, Text } from 'react-native';
import {
  Card, Row, Badge, Button, Field, Chips, DataState,
  useSocietyData, useSocietyContext, useSocietyLive, runAction, when, useKitStyles,
} from '../../../../src/components/society/SocietyKit';

/**
 * The notice board. Three hardcoded notices used to show in every society;
 * these are the society's own. "+ Draft New Notice" had no handler — the
 * committee now publishes from here, and open apps pick it up live.
 */
export default function NoticesTab({ role }) {
  const s = useKitStyles();
  const { context } = useSocietyContext();
  const notices = useSocietyData('/society/notices');
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal' });
  const [busy, setBusy] = useState(false);

  useSocietyLive(context, { society: true }, { SOCIETY_NOTICE: () => notices.reload() });

  const publish = async () => {
    setBusy(true);
    const res = await runAction('post', '/society/notices', {
      title: form.title.trim(), content: form.content.trim(), priority: form.priority,
    }, { success: 'Notice published to every resident.' });
    setBusy(false);
    if (res) { setForm({ title: '', content: '', priority: 'normal' }); notices.reload(); }
  };

  return (
    <View>
      {role === 'admin' && (
        <Card title="Publish a notice" subtitle="Every member sees it on their notice board.">
          <Field label="Title" value={form.title} onChangeText={(title) => setForm({ ...form, title })} maxLength={120} />
          <Field label="Details" value={form.content} onChangeText={(content) => setForm({ ...form, content })}
            multiline numberOfLines={4} />
          <Chips options={['normal', 'high', 'urgent']} value={form.priority} onChange={(priority) => setForm({ ...form, priority })} />
          <Button label="Publish" onPress={publish} busy={busy} disabled={!form.title.trim() || !form.content.trim()} />
        </Card>
      )}

      <Card title="Notice board">
        <DataState state={notices} empty="No notices yet" emptyBody="Notices your committee publishes appear here.">
          {(notices.data || []).map((n, i) => (
            <Row key={n.id} first={i === 0} title={n.title}
              meta={[[when(n.created_at, { time: false }), n.posted_by_name].filter(Boolean).join(' · ')]}
              right={n.priority && n.priority !== 'normal'
                ? <Badge label={n.priority === 'urgent' ? 'Urgent' : 'Important'} tone="danger" /> : null}>
              <Text style={[s.rowMeta, { marginTop: 6, lineHeight: 20 }]}>{n.content}</Text>
            </Row>
          ))}
        </DataState>
      </Card>
    </View>
  );
}
