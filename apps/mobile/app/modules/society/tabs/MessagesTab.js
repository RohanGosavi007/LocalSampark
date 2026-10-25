import React, { useState } from 'react';
import { View } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, DataState,
  useSocietyData, useSocietyContext, useSocietyLive, runAction, when,
} from '../../../../src/components/society/SocietyKit';

/**
 * Notes to the gate — "leave my parcel with you", "expecting a plumber at 4".
 * Was a "Feature coming soon..." placeholder. Residents write; the guard's
 * inbox updates live and they mark each one read.
 */
export default function MessagesTab({ role }) {
  const { context } = useSocietyContext();
  const guard = role === 'guard';
  const inbox = useSocietyData(guard ? `${SM}/guard-messages` : `${SM}/my-guard-messages`);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useSocietyLive(context, { gate: guard }, { GUARD_MESSAGE: () => inbox.reload() });

  const send = async () => {
    setBusy(true);
    const res = await runAction('post', `${SM}/guard-message`, { message: text.trim() }, { success: 'Sent to the gate.' });
    setBusy(false);
    if (res) { setText(''); inbox.reload(); }
  };

  const markRead = (m) => runAction('put', `${SM}/guard-messages/${m.id}/read`, null, { onDone: () => inbox.reload() });
  const isRead = (m) => m.is_read === 1 || m.is_read === true || m.is_read === '1';
  const unread = (inbox.data || []).filter((m) => !isRead(m)).length;

  return (
    <View>
      {!guard && (
        <Card title="Message the gate" subtitle="The guard on duty sees it straight away.">
          <Field label="Message" placeholder="e.g. Please keep my Amazon parcel at the gate" multiline
            value={text} onChangeText={setText} maxLength={500} />
          <Button label="Send" onPress={send} busy={busy} disabled={!text.trim()} />
        </Card>
      )}

      <Card title={guard ? `Inbox${unread ? ` · ${unread} new` : ''}` : 'Sent messages'}>
        <DataState state={inbox} empty={guard ? 'No messages' : 'Nothing sent yet'}>
          {(inbox.data || []).map((m, i) => (
            <Row key={m.id} first={i === 0} title={m.message}
              meta={[guard && [m.flat_number && `Flat ${m.flat_number}`, m.sender_name].filter(Boolean).join(' · '), when(m.created_at)]}
              right={guard && !isRead(m)
                ? <Button label="Mark read" tone="secondary" small onPress={() => markRead(m)} />
                : <Badge label={isRead(m) ? 'Read' : 'Sent'} tone={isRead(m) ? 'success' : 'neutral'} />} />
          ))}
        </DataState>
      </Card>
    </View>
  );
}
