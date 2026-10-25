import React, { useState } from 'react';
import { View, Text, Share, Alert } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, Chips, Stats, DataState,
  useSocietyData, useSocietyContext, useSocietyLive, runAction, statusTone, titleCase, when, useKitStyles,
} from '../../../../src/components/society/SocietyKit';

/**
 * The gate, from each side.
 *
 * Pre-approvals used to live in this component's state and were never sent
 * anywhere: a resident could "approve" a guest and the guard would never know,
 * and every pass showed the same invented PIN. They now go to
 * /society-preapproval, the guard verifies the code the server issued, and the
 * resident answers a guard's walk-in from here — live, over the flat room.
 */

const PURPOSES = ['guest', 'delivery', 'service', 'cab'];

function ResidentView() {
  const s = useKitStyles();
  const { context } = useSocietyContext();
  const visitors = useSocietyData(`${SM}/my-visitors`);
  const passes = useSocietyData('/society-preapproval/pre-approve/my');
  const [form, setForm] = useState({ visitorName: '', visitorPhone: '', purpose: 'guest' });
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(null);

  useSocietyLive(context, { flat: true }, {
    VISITOR_ALERT: () => visitors.reload(),
  });

  const create = async () => {
    setBusy(true);
    const validFrom = new Date().toISOString();
    const validUntil = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
    const res = await runAction('post', '/society-preapproval/pre-approve', {
      ...form, visitorName: form.visitorName.trim(), validFrom, validUntil,
    });
    setBusy(false);
    if (res) {
      setIssued({ name: form.visitorName.trim(), passcode: res.data?.passcode || res.passcode, validUntil });
      setForm({ visitorName: '', visitorPhone: '', purpose: 'guest' });
      passes.reload();
    }
  };

  const share = (pass) => Share.share({
    message: `You're expected at ${context?.societyName || 'our society'}, flat ${context?.flatNumber || ''}. `
      + `Show gate code ${pass.passcode} to security. Valid until ${when(pass.validUntil || pass.valid_until)}.`,
  });

  const answer = (v, verb) => runAction('put', `${SM}/visitors/${v.id}/${verb}`, null, {
    onDone: () => visitors.reload(),
  });

  const pending = (visitors.data || []).filter((v) => ['pending', 'expected'].includes(v.status));

  return (
    <View>
      {pending.length > 0 && (
        <Card title="Waiting at the gate" subtitle="The guard is holding these visitors for your answer.">
          {pending.map((v, i) => (
            <Row key={v.id} first={i === 0} title={v.visitor_name}
              meta={[titleCase(v.purpose), v.visitor_phone, when(v.created_at)]}>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Button label="Let in" tone="success" small onPress={() => answer(v, 'approve')} />
                <Button label="Turn away" tone="danger" small onPress={() => answer(v, 'decline')} />
              </View>
            </Row>
          ))}
        </Card>
      )}

      <Card title="Pre-approve a visitor" subtitle="The guard checks this code at the gate, so your guest skips the queue.">
        <Field label="Visitor name" placeholder="Who is coming?" value={form.visitorName}
          onChangeText={(visitorName) => setForm({ ...form, visitorName })} autoCapitalize="words" />
        <Field label="Phone (optional)" placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={13}
          value={form.visitorPhone} onChangeText={(visitorPhone) => setForm({ ...form, visitorPhone })} />
        <Text style={s.label}>Purpose</Text>
        <Chips options={PURPOSES} value={form.purpose} onChange={(purpose) => setForm({ ...form, purpose })} />
        <Button label="Create gate pass" onPress={create} busy={busy} disabled={!form.visitorName.trim()} />
      </Card>

      {issued && (
        <Card title={`Gate code for ${issued.name}`}>
          <Text style={[s.statValue, { fontSize: 34, letterSpacing: 6, textAlign: 'center', marginVertical: 12 }]}
            accessibilityLabel={`Gate code ${String(issued.passcode).split('').join(' ')}`}>
            {issued.passcode}
          </Text>
          <Text style={[s.subtitle, { textAlign: 'center' }]}>Valid until {when(issued.validUntil)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Share code" onPress={() => share(issued)} style={{ flex: 1 }} />
            <Button label="Done" tone="secondary" onPress={() => setIssued(null)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      <Card title="Active gate passes">
        <DataState state={passes} empty="No active passes" emptyBody="Passes you create appear here until they expire.">
          {(passes.data || []).map((p, i) => (
            <Row key={p.id} first={i === 0} title={p.visitor_name}
              meta={[`Code ${p.passcode}`, `Until ${when(p.valid_until)}`]}
              right={<Button label="Share" tone="secondary" small onPress={() => share(p)} />} />
          ))}
        </DataState>
      </Card>

      <Card title="Visitor history">
        <DataState state={visitors} empty="No visitors yet" emptyBody="Everyone the gate logs for your flat shows up here.">
          {(visitors.data || []).map((v, i) => (
            <Row key={v.id} first={i === 0} title={v.visitor_name}
              meta={[titleCase(v.purpose), when(v.checked_in_at || v.created_at)]}
              right={<Badge label={titleCase(v.status)} tone={statusTone(v.status)} />} />
          ))}
        </DataState>
      </Card>
    </View>
  );
}

function GuardView() {
  const { context } = useSocietyContext();
  const today = useSocietyData(`${SM}/visitors/today`);
  const [walkIn, setWalkIn] = useState({ name: '', phone: '', flat: '', purpose: 'guest' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null);

  useSocietyLive(context, { gate: true }, {
    VISITOR_RESPONSE: (e) => {
      today.reload();
      if (e?.status) Alert.alert('Resident answered', `Flat ${e.flat || ''}: ${e.status === 'approved' ? 'let them in' : 'turn them away'}.`);
    },
  });

  const logWalkIn = async () => {
    setBusy('walkin');
    const res = await runAction('post', `${SM}/visitors`, {
      ...walkIn, name: walkIn.name.trim(), flat: walkIn.flat.trim().toUpperCase(),
      // Lets the server drop a duplicate if this request is retried.
      clientId: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }, { success: 'Logged. The flat has been notified.' });
    setBusy(null);
    if (res) { setWalkIn({ name: '', phone: '', flat: '', purpose: 'guest' }); today.reload(); }
  };

  const verify = async () => {
    setBusy('code');
    const res = await runAction('post', '/society-preapproval/pre-approve/verify', { passcode: code.trim() });
    setBusy(null);
    if (res) {
      const v = res.data || res.visitor || {};
      setCode('');
      today.reload();
      Alert.alert('Code accepted', `${v.visitor_name || v.visitorName || 'Visitor'} for flat ${v.flat_number || v.flatNumber || ''} may enter.`);
    }
  };

  const move = (v, verb) => runAction('put', `${SM}/visitors/${v.id}/${verb}`, null, { onDone: () => today.reload() });

  const rows = today.data || [];
  return (
    <View>
      <Stats items={[
        { label: 'Inside now', value: rows.filter((v) => v.status === 'checked_in').length },
        { label: 'Waiting', value: rows.filter((v) => ['pending', 'expected', 'approved'].includes(v.status)).length },
        { label: 'Today', value: rows.length },
      ]} />

      <Card title="Check a gate code" subtitle="Residents share a 6-digit code with expected guests.">
        <Field label="Gate code" placeholder="6 digits" keyboardType="number-pad" maxLength={6}
          value={code} onChangeText={(t) => setCode(t.replace(/\D/g, ''))} />
        <Button label="Verify & admit" onPress={verify} busy={busy === 'code'} disabled={code.length !== 6} />
      </Card>

      <Card title="Log a walk-in" subtitle="The flat gets an alert on their phone straight away.">
        <Field label="Visitor name" value={walkIn.name} onChangeText={(name) => setWalkIn({ ...walkIn, name })} autoCapitalize="words" />
        <Field label="Flat" placeholder="e.g. B-404" value={walkIn.flat} autoCapitalize="characters"
          onChangeText={(flat) => setWalkIn({ ...walkIn, flat })} />
        <Field label="Phone (optional)" keyboardType="phone-pad" maxLength={13} value={walkIn.phone}
          onChangeText={(phone) => setWalkIn({ ...walkIn, phone })} />
        <Chips options={PURPOSES} value={walkIn.purpose} onChange={(purpose) => setWalkIn({ ...walkIn, purpose })} />
        <Button label="Log entry" onPress={logWalkIn} busy={busy === 'walkin'}
          disabled={!walkIn.name.trim() || !walkIn.flat.trim()} />
      </Card>

      <Card title="Today's register">
        <DataState state={today} empty="No visitors yet today">
          {rows.map((v, i) => (
            <Row key={v.id} first={i === 0} title={`${v.visitor_name} → ${v.flat_number || '—'}`}
              meta={[titleCase(v.purpose), v.vehicle_number, when(v.checked_in_at || v.created_at)]}
              right={<Badge label={titleCase(v.status)} tone={statusTone(v.status)} />}>
              {v.status === 'approved' && (
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <Button label="Check in" small onPress={() => move(v, 'check-in')} />
                </View>
              )}
              {v.status === 'checked_in' && (
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <Button label="Check out" tone="secondary" small onPress={() => move(v, 'check-out')} />
                </View>
              )}
            </Row>
          ))}
        </DataState>
      </Card>
    </View>
  );
}

function OfficeView() {
  const all = useSocietyData(`${SM}/visitors/all`);
  const stats = useSocietyData(`${SM}/visitors/analytics`, { initial: null });
  const [filter, setFilter] = useState('all');
  const a = stats.data || {};
  const rows = (all.data || []).filter((v) => filter === 'all' || v.status === filter);
  return (
    <View>
      <Stats items={[
        { label: 'Today', value: a.today ?? '—' },
        { label: 'Inside', value: a.inside ?? '—' },
        { label: 'Pending', value: a.pending ?? '—' },
      ]} />
      <Card title="Visitor register">
        <Chips options={['all', 'checked_in', 'approved', 'pending', 'denied', 'checked_out']} value={filter} onChange={setFilter} />
        <DataState state={{ ...all, data: rows }} empty="No visitors match">
          {rows.map((v, i) => (
            <Row key={v.id} first={i === 0} title={`${v.visitor_name} → ${v.flat_number || '—'}`}
              meta={[titleCase(v.purpose), when(v.created_at)]}
              right={<Badge label={titleCase(v.status)} tone={statusTone(v.status)} />} />
          ))}
        </DataState>
      </Card>
    </View>
  );
}

export default function VisitorsTab({ role }) {
  if (role === 'guard') return <GuardView />;
  if (role === 'admin') return <OfficeView />;
  return <ResidentView />;
}
