import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Vibration } from 'react-native';
import {
  SM, Card, Row, Button, Field, Chips, DataState,
  useSocietyData, useSocietyContext, useSocietyLive, runAction, titleCase, when, useKitStyles,
} from '../../../../src/components/society/SocietyKit';
import { useThemeColors } from '../../../../src/context/ThemeContext';

/**
 * SOS.
 *
 * The button used to show "Security is on the way to your location" and send
 * nothing — a resident in a real emergency would have waited for help nobody
 * had been asked for. It now raises an alert the gate and the committee see
 * immediately (socket) and on their active list, and only the gate can stand
 * it down.
 */
const TYPES = ['medical', 'fire', 'security', 'other'];

export default function EmergencyTab({ role }) {
  const s = useKitStyles();
  const c = useThemeColors();
  const { context } = useSocietyContext();
  const active = useSocietyData(`${SM}/emergency/active`);
  const [type, setType] = useState('medical');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const canResolve = role === 'guard' || role === 'admin';

  useSocietyLive(context, { society: true }, {
    SOCIETY_EMERGENCY: (e) => {
      active.reload();
      if (canResolve) {
        Vibration.vibrate([0, 400, 200, 400]);
        Alert.alert(`🚨 ${titleCase(e?.type)} emergency`, `${e?.flat ? `Flat ${e.flat}. ` : ''}${e?.description || ''}`);
      }
    },
    SOCIETY_EMERGENCY_RESOLVED: () => active.reload(),
  });

  const raise = () => Alert.alert(
    `Raise a ${type} alert?`,
    'The gate and the society committee are alerted immediately.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send SOS', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const res = await runAction('post', `${SM}/emergency`, { alertType: type, description: note.trim() || undefined });
          setBusy(false);
          if (res) {
            setNote('');
            active.reload();
            Alert.alert('Alert sent', 'The gate has your alert. Stay where you are if it is safe to.');
          }
        },
      },
    ],
  );

  const resolve = (e) => runAction('put', `${SM}/emergency/${e.id}/resolve`, null, { onDone: () => active.reload() });

  return (
    <View>
      <Card title="Emergency SOS" subtitle="Only for a real emergency. The gate and committee are alerted at once.">
        <Chips options={TYPES} value={type} onChange={setType} />
        <Field label="What's happening? (optional)" placeholder="e.g. Elderly resident fainted, 4th floor"
          value={note} onChangeText={setNote} maxLength={200} />
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <TouchableOpacity
            onPress={raise} disabled={busy}
            accessibilityRole="button" accessibilityLabel={`Send ${type} SOS`}
            style={{
              width: 140, height: 140, borderRadius: 70, backgroundColor: c.danger, opacity: busy ? 0.6 : 1,
              alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: c.dangerQuiet,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 38, fontWeight: '900' }}>SOS</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Card title="Active alerts">
        <DataState state={active} empty="No active alerts" emptyBody="All clear.">
          {(active.data || []).map((e, i) => (
            <Row key={e.id} first={i === 0} title={`🚨 ${titleCase(e.alert_type)}`}
              meta={[
                [e.flat_number && `Flat ${e.flat_number}`, e.triggered_by_name].filter(Boolean).join(' · '),
                e.description, when(e.created_at),
              ]}
              right={canResolve ? <Button label="Resolve" tone="success" small onPress={() => resolve(e)} /> : null} />
          ))}
        </DataState>
        {!canResolve && (active.data || []).length > 0 && (
          <Text style={[s.rowMeta, { marginTop: 8 }]}>The gate marks an alert resolved once it is handled.</Text>
        )}
      </Card>
    </View>
  );
}
