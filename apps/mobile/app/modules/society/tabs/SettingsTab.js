import React, { useEffect, useState } from 'react';
import { View, Switch, Text } from 'react-native';
import {
  SM, Card, Row, Button, Field, DataState, useSocietyData, runAction, useKitStyles,
} from '../../../../src/components/society/SocietyKit';

/**
 * Gate and billing rules for the society. Was a "Feature coming soon..."
 * placeholder. Residents see the rules; the committee edits them.
 */
const FLAGS = [
  ['visitor_photo_required', 'Visitor photo required at the gate'],
  ['id_card_required', 'ID card required at the gate'],
  ['auto_approve_expected', 'Auto-approve pre-approved visitors'],
  ['patrol_enabled', 'Guard patrol rounds'],
];
const NUMBERS = [
  ['overstay_timeout_minutes', 'Overstay alert after (minutes)'],
  ['max_visitors_per_flat', 'Max visitors per flat per day'],
  ['maintenance_due_day', 'Maintenance due on day of month'],
  ['late_fee_percentage', 'Late fee (%)'],
];
const TIMES = [['guard_shift_start', 'Guard shift starts (HH:MM)'], ['guard_shift_end', 'Guard shift ends (HH:MM)']];

const on = (v) => v === 1 || v === true || v === '1';

export default function SettingsTab({ role }) {
  const s = useKitStyles();
  const settings = useSocietyData(`${SM}/settings`, { initial: null });
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const office = role === 'admin';

  useEffect(() => { if (settings.data) setDraft(settings.data); }, [settings.data]);

  const save = async () => {
    setBusy(true);
    const body = {};
    for (const [k] of [...FLAGS, ...NUMBERS, ...TIMES]) if (draft[k] !== undefined && draft[k] !== null) body[k] = draft[k];
    await runAction('put', `${SM}/settings`, body, { success: 'Settings saved.', onDone: () => settings.reload() });
    setBusy(false);
  };

  return (
    <DataState state={settings} empty="No settings yet">
      <View>
        <Card title="Gate rules">
          {FLAGS.map(([key, label], i) => (
            <Row key={key} first={i === 0} title={label}
              right={(
                <Switch value={on(draft[key])} disabled={!office} accessibilityLabel={label}
                  onValueChange={(v) => setDraft({ ...draft, [key]: v ? 1 : 0 })} />
              )} />
          ))}
        </Card>
        <Card title="Limits & billing">
          {office ? (
            <>
              {[...NUMBERS, ...TIMES].map(([key, label]) => (
                <Field key={key} label={label} value={draft[key] == null ? '' : String(draft[key])}
                  keyboardType={TIMES.some(([k]) => k === key) ? 'numbers-and-punctuation' : 'decimal-pad'}
                  onChangeText={(v) => setDraft({ ...draft, [key]: v })} />
              ))}
              <Button label="Save settings" onPress={save} busy={busy} />
            </>
          ) : (
            [...NUMBERS, ...TIMES].map(([key, label], i) => (
              <Row key={key} first={i === 0} title={label}
                right={<Text style={s.rowTitle}>{draft[key] ?? '—'}</Text>} />
            ))
          )}
        </Card>
      </View>
    </DataState>
  );
}
