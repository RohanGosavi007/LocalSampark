import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import {
  SM, Card, Row, Badge, Button, Field, Stats, DataState,
  useSocietyData, runAction, confirmAction, statusTone, titleCase, rupees, when, useKitStyles,
} from '../../../../src/components/society/SocietyKit';

/**
 * Maintenance bills.
 *
 * This tab read `amount` and `status`, fields the ledger does not have — it
 * stores total_amount and payment_status — so every real bill showed as ₹0 and
 * "Unpaid", including the ones already paid. A resident now sees their flat's
 * bills with the breakdown and records a payment; the committee sees the whole
 * ledger and raises the month's bills in one step.
 */
const thisMonth = () => new Date().toISOString().slice(0, 7);
const dueOn = (day = 10) => { const d = new Date(); d.setDate(day); if (d < new Date()) d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); };

function BillRow({ b, first, onPay, showFlat }) {
  const s = useKitStyles();
  const paid = b.payment_status === 'paid';
  const parts = [
    ['Maintenance', b.base_amount], ['Water', b.water_charges], ['Parking', b.parking_charges],
    ['Other', b.other_charges], ['Late fee', b.late_fee],
  ].filter(([, v]) => Number(v) > 0);
  return (
    <Row first={first} title={`${showFlat ? `${b.flat_number} · ` : ''}${b.month}`}
      meta={[paid ? `Paid ${when(b.paid_at, { time: false })}${b.payment_reference ? ` · ${b.payment_reference}` : ''}` : `Due ${when(b.due_date, { time: false })}`,
        showFlat && b.full_name]}
      right={(
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={s.rowTitle}>{rupees(b.total_amount)}</Text>
          <Badge label={titleCase(b.payment_status)} tone={statusTone(b.payment_status)} />
        </View>
      )}>
      {!showFlat && parts.length > 1 && (
        <Text style={[s.rowMeta, { marginTop: 4 }]}>{parts.map(([k, v]) => `${k} ${rupees(v)}`).join(' · ')}</Text>
      )}
      {onPay && !paid && (
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <Button label={`Pay ${rupees(b.total_amount)}`} small onPress={() => onPay(b)} />
        </View>
      )}
    </Row>
  );
}

function ResidentBills() {
  const bills = useSocietyData(`${SM}/my-bills`);
  const due = (bills.data || []).filter((b) => b.payment_status !== 'paid');
  const pay = (b) => confirmAction(`Pay ${rupees(b.total_amount)}?`, `Maintenance for ${b.month}, flat ${b.flat_number}.`,
    () => runAction('put', `${SM}/bills/${b.id}/pay`, { paymentReference: `APP-${Date.now()}` },
      { success: 'Payment recorded. Your receipt is in the bill.', onDone: () => bills.reload() }), 'Pay');
  return (
    <View>
      <Stats items={[
        { label: 'Outstanding', value: rupees(due.reduce((s, b) => s + Number(b.total_amount || 0), 0)) },
        { label: 'Bills due', value: due.length },
      ]} />
      <Card title="My bills">
        <DataState state={bills} empty="No bills yet" emptyBody="Bills your society raises for your flat appear here.">
          {(bills.data || []).map((b, i) => <BillRow key={b.id} b={b} first={i === 0} onPay={pay} />)}
        </DataState>
      </Card>
    </View>
  );
}

function OfficeBills() {
  const bills = useSocietyData(`${SM}/bills`);
  const summary = useSocietyData(`${SM}/bills/summary`, { initial: null });
  const [form, setForm] = useState({ month: thisMonth(), baseAmount: '', waterCharges: '0', parkingCharges: '0', dueDate: dueOn() });
  const [busy, setBusy] = useState(false);
  const sm = summary.data || {};

  const generate = async () => {
    setBusy(true);
    const res = await runAction('post', `${SM}/bills/generate`, form);
    setBusy(false);
    if (res) {
      Alert.alert('Bills raised', `${res.data?.created ?? 0} new bills for ${form.month}. Flats already billed were skipped.`);
      bills.reload(); summary.reload();
    }
  };

  const markPaid = (b) => confirmAction(`Mark ${b.flat_number} paid?`, `Records ${rupees(b.total_amount)} received for ${b.month}.`,
    () => runAction('put', `${SM}/bills/${b.id}/pay`, { paymentReference: `OFFICE-${Date.now()}` },
      { onDone: () => { bills.reload(); summary.reload(); } }), 'Mark paid');

  return (
    <View>
      <Stats items={[
        { label: 'Collected', value: rupees(sm.collectedAmount) },
        { label: 'Pending', value: sm.pendingCount ?? '—' },
        { label: 'Overdue', value: sm.overdueCount ?? '—' },
      ]} />
      <Card title="Raise the month's bills" subtitle="One bill per occupied flat. Running it again only bills flats it missed.">
        <Field label="Month (YYYY-MM)" value={form.month} onChangeText={(month) => setForm({ ...form, month })} />
        <Field label="Maintenance (₹)" keyboardType="decimal-pad" value={form.baseAmount} onChangeText={(baseAmount) => setForm({ ...form, baseAmount })} />
        <Field label="Water (₹)" keyboardType="decimal-pad" value={form.waterCharges} onChangeText={(waterCharges) => setForm({ ...form, waterCharges })} />
        <Field label="Parking (₹)" keyboardType="decimal-pad" value={form.parkingCharges} onChangeText={(parkingCharges) => setForm({ ...form, parkingCharges })} />
        <Field label="Due date (YYYY-MM-DD)" value={form.dueDate} onChangeText={(dueDate) => setForm({ ...form, dueDate })} />
        <Button label="Generate bills" onPress={generate} busy={busy} disabled={!(Number(form.baseAmount) > 0)} />
      </Card>
      <Card title="Ledger">
        <DataState state={bills} empty="No bills raised yet">
          {(bills.data || []).map((b, i) => <BillRow key={b.id} b={b} first={i === 0} showFlat onPay={markPaid} />)}
        </DataState>
      </Card>
    </View>
  );
}

export default function BillsTab({ role }) {
  return role === 'admin' ? <OfficeBills /> : <ResidentBills />;
}
