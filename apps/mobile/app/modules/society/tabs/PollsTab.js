import React, { useState } from 'react';
import { View, Text } from 'react-native';
import {
  SM, Card, Badge, Button, Field, DataState,
  useSocietyData, runAction, confirmAction, when, useKitStyles,
} from '../../../../src/components/society/SocietyKit';
import { useThemeColors } from '../../../../src/context/ThemeContext';

/**
 * Society votes. One invented poll with invented counts (45 / 20) used to show
 * for everyone, and voting only displayed "recorded securely" — nothing was.
 * Votes are now one per person, enforced by the server, and results are the
 * real tally.
 */
function Results({ pollId }) {
  const s = useKitStyles();
  const c = useThemeColors();
  const res = useSocietyData(`${SM}/polls/${pollId}/results`);
  if (res.loading || res.error) return null;
  return (
    <View style={{ marginTop: 8 }}>
      {(res.data || []).map((r) => (
        <View key={r.option} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.rowMeta}>{r.option}</Text>
            <Text style={s.rowMeta}>{r.percentage}% · {r.votes}</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.sunken, overflow: 'hidden', marginTop: 4 }}>
            <View style={{ width: `${r.percentage}%`, height: 8, backgroundColor: c.accent }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function PollsTab({ role }) {
  const s = useKitStyles();
  const polls = useSocietyData(`${SM}/polls`);
  const [form, setForm] = useState({ title: '', options: ['', ''] });
  const [busy, setBusy] = useState(null);
  const office = role === 'admin';

  const vote = async (p, i) => {
    setBusy(`${p.id}:${i}`);
    await runAction('post', `${SM}/polls/${p.id}/vote`, { selectedOption: i }, { onDone: () => polls.reload() });
    setBusy(null);
  };

  const create = async () => {
    setBusy('create');
    const res = await runAction('post', `${SM}/polls`, {
      title: form.title.trim(), options: form.options.map((o) => o.trim()).filter(Boolean),
    }, { success: 'Poll published.' });
    setBusy(null);
    if (res) { setForm({ title: '', options: ['', ''] }); polls.reload(); }
  };

  const close = (p) => confirmAction('Close this poll?', 'No more votes will be accepted.',
    () => runAction('put', `${SM}/polls/${p.id}/close`, null, { onDone: () => polls.reload() }), 'Close poll');

  return (
    <View>
      {office && (
        <Card title="Create a poll">
          <Field label="Question" value={form.title} onChangeText={(title) => setForm({ ...form, title })} maxLength={200} />
          {form.options.map((o, i) => (
            <Field key={i} label={`Option ${i + 1}`} value={o}
              onChangeText={(v) => setForm({ ...form, options: form.options.map((x, j) => (j === i ? v : x)) })} />
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {form.options.length < 6 && (
              <Button label="+ Option" tone="secondary" onPress={() => setForm({ ...form, options: [...form.options, ''] })} style={{ flex: 1 }} />
            )}
            <Button label="Publish" onPress={create} busy={busy === 'create'} style={{ flex: 1 }}
              disabled={!form.title.trim() || form.options.filter((o) => o.trim()).length < 2} />
          </View>
        </Card>
      )}

      <DataState state={polls} empty="No polls yet" emptyBody="Polls the committee opens appear here.">
        {(polls.data || []).map((p) => {
          const closed = p.status === 'closed';
          const voted = p.myVote !== null && p.myVote !== undefined;
          return (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[s.title, { flex: 1 }]}>{p.title}</Text>
                <Badge label={closed ? 'Closed' : 'Open'} tone={closed ? 'neutral' : 'success'} />
              </View>
              <Text style={s.subtitle}>
                {[p.total_votes === 1 ? '1 vote' : `${p.total_votes} votes`, p.ends_at && `${closed ? 'Ended' : 'Ends'} ${when(p.ends_at)}`, p.creator_name].filter(Boolean).join(' · ')}
              </Text>
              {voted || closed ? (
                <>
                  {voted && <Text style={s.rowMeta}>You voted: {p.options[p.myVote]}</Text>}
                  <Results pollId={`${p.id}`} key={`${p.id}-${p.total_votes}`} />
                </>
              ) : (
                <View style={{ gap: 8 }}>
                  {p.options.map((o, i) => (
                    <Button key={o + i} label={o} tone="secondary" busy={busy === `${p.id}:${i}`}
                      disabled={Boolean(busy)} onPress={() => vote(p, i)} accessibilityLabel={`Vote ${o}`} />
                  ))}
                </View>
              )}
              {office && !closed && (
                <Button label="Close poll" tone="secondary" small style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => close(p)} />
              )}
            </Card>
          );
        })}
      </DataState>
    </View>
  );
}
