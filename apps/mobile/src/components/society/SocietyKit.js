import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';
import { useThemedStyles, useThemeColors } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { socketService } from '../../services/socket';

/**
 * Shared pieces for the society tabs.
 *
 * Sixteen tabs each grew their own loading flag, their own error handling (or
 * none), and their own copy of the same card styles in literal light-mode
 * colours. Every tab now loads through `useSocietyData`, acts through
 * `runAction`, and renders with these components, so an empty list, a failed
 * request and a refused action look and behave the same everywhere — and
 * follow the app theme.
 */

export const SM = '/society-management';

const rowsOf = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return res?.data ?? res ?? null;
};

/**
 * Loads one endpoint. `data` is whatever the server's `data` field held (a list
 * for every list endpoint). Pass `null` as the path to skip loading — a tab
 * that has nothing to fetch for this role.
 */
export function useSocietyData(path, { initial = [] } = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(Boolean(path));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  useEffect(() => () => { alive.current = false; }, []);

  const load = useCallback(async (asRefresh = false) => {
    if (!path) { setLoading(false); return; }
    if (asRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiGet(path);
      if (!alive.current) return;
      setData(rowsOf(res) ?? initial);
      setError(null);
    } catch (err) {
      if (!alive.current) return;
      setError(err?.message || 'Could not reach the society service.');
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
    // `initial` is a default for an empty response, not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => { load(); }, [load]);

  return { data, setData, loading, refreshing, error, reload: load, refresh: () => load(true) };
}

/** Pull-to-refresh wired to a `useSocietyData` result. */
export function refreshControl(state) {
  return <RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} />;
}

const METHODS = { get: apiGet, post: apiPost, put: apiPut, delete: apiDelete };

/**
 * Performs a write and reports the outcome. Returns the response, or null when
 * it failed — the server's message is shown as is, because it says why
 * ("That slot overlaps an existing booking", "You have already voted").
 */
export async function runAction(method, path, body, { success, onDone } = {}) {
  try {
    const fn = METHODS[method];
    const res = method === 'get' || method === 'delete' ? await fn(path) : await fn(path, body);
    if (success) Alert.alert('Done', success);
    if (onDone) await onDone(res);
    return res || {};
  } catch (err) {
    Alert.alert('Could not complete that', err?.message || 'Please try again.');
    return null;
  }
}

/** Asks first, for anything that cannot be undone. */
export function confirmAction(title, message, onConfirm, confirmLabel = 'Confirm') {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * The caller's place in their society: flat, role, what they may do.
 *
 * Cached per signed-in user, not per app session: switching from the resident
 * to the guard persona must not keep showing the resident's flat and tabs.
 */
const contextCache = new Map();

export function useSocietyContext() {
  const { user } = useAuth();
  const key = user?.id || 'anonymous';
  const cached = contextCache.get(key);
  const [ctx, setCtx] = useState(cached?.value || null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    let entry = contextCache.get(key);
    if (entry?.value) { setCtx(entry.value); return undefined; }
    setCtx(null);
    if (!entry) {
      entry = { promise: apiGet(`${SM}/context`).then((r) => { entry.value = rowsOf(r); return entry.value; }) };
      contextCache.set(key, entry);
    }
    entry.promise
      .then((c) => { if (alive) setCtx(c); })
      .catch((err) => { contextCache.delete(key); if (alive) setError(err?.message || 'No society found for this account.'); });
    return () => { alive = false; };
  }, [key]);
  return { context: ctx, error };
}

/**
 * Live society events over the app's one authenticated socket.
 *
 * `rooms` is what to join, from the caller's context: the flat room (visitor
 * and parcel alerts for a resident), the gate room (a guard hears residents'
 * answers and messages) and the society room (SOS, new events). Rooms are
 * re-joined on every (re)connect, because a socket that dropped in the
 * background comes back in no rooms at all.
 *
 *   useSocietyLive(context, { flat: true }, { VISITOR_ALERT: () => visitors.reload() });
 */
export function useSocietyLive(context, rooms, events) {
  const { isConnected } = useSocket();
  const handlers = useRef(events);
  handlers.current = events;
  const societyId = context?.societyId;
  const flat = context?.flatNumber;
  const eventNames = Object.keys(events || {}).join('|');

  useEffect(() => {
    if (!isConnected || !societyId) return;
    if (rooms.society) socketService.emit('join_society_room', { societyId });
    if (rooms.flat && flat) socketService.emit('join_flat_room', { societyId, flatNo: flat });
    if (rooms.gate) socketService.emit('join_gatekeeper_room', { societyId });
  }, [isConnected, societyId, flat, rooms.society, rooms.flat, rooms.gate]);

  useEffect(() => {
    if (!eventNames) return undefined;
    const bound = eventNames.split('|').map((name) => {
      const fn = (payload) => handlers.current?.[name]?.(payload);
      socketService.on(name, fn);
      return [name, fn];
    });
    return () => bound.forEach(([name, fn]) => socketService.off(name, fn));
    // Re-bind when the socket (re)connects: `on` is a no-op before it exists.
  }, [eventNames, isConnected]);
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export const rupees = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function when(value, { time = true } = {}) {
  if (!value) return '';
  const d = new Date(String(value).includes('T') || String(value).length > 10 ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, time
    ? { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

export const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ─── Components ─────────────────────────────────────────────────────────────

const makeStyles = (t) => ({
  card: {
    backgroundColor: t.colors.surface, padding: t.spacing.md + 4, borderRadius: 16,
    borderWidth: 1, borderColor: t.colors.border, marginBottom: t.spacing.md, ...t.elevation(1),
  },
  title: { color: t.colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: t.colors.textMuted, fontSize: 13, marginBottom: t.spacing.md, lineHeight: 18 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: t.colors.border, gap: 12,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { color: t.colors.text, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: t.colors.textMuted, fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '800' },
  btn: {
    minHeight: 44, minWidth: 44, paddingHorizontal: 16, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
  },
  btnText: { fontWeight: '800', fontSize: 14 },
  label: { color: t.colors.text, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    minHeight: 44, backgroundColor: t.colors.sunken, borderWidth: 1, borderColor: t.colors.border,
    borderRadius: 12, color: t.colors.text, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    marginBottom: t.spacing.md,
  },
  state: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12 },
  stateTitle: { color: t.colors.text, fontSize: 15, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  stateBody: { color: t.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: t.spacing.md },
  chip: {
    minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1,
    borderColor: t.colors.border, justifyContent: 'center',
  },
  chipOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  chipText: { color: t.colors.text, fontWeight: '700', fontSize: 13 },
  chipTextOn: { color: t.colors.onAccent },
  stats: { flexDirection: 'row', gap: 10, marginBottom: t.spacing.md },
  stat: {
    flex: 1, backgroundColor: t.colors.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: t.colors.border,
  },
  statValue: { color: t.colors.text, fontSize: 20, fontWeight: '900' },
  statLabel: { color: t.colors.textMuted, fontSize: 12, marginTop: 2 },
});

export function useKitStyles() { return useThemedStyles(makeStyles); }

export function Card({ title, subtitle, children, style }) {
  const s = useKitStyles();
  return (
    <View style={[s.card, style]}>
      {title ? <Text style={s.title} accessibilityRole="header">{title}</Text> : null}
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function Row({ title, meta, right, first, children }) {
  const s = useKitStyles();
  return (
    <View style={[s.row, first && s.rowFirst]}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {(Array.isArray(meta) ? meta : [meta]).filter(Boolean).map((m, i) => (
          <Text key={i} style={s.rowMeta}>{m}</Text>
        ))}
        {children}
      </View>
      {right}
    </View>
  );
}

const TONES = {
  success: ['successQuiet', 'success'], warning: ['warningQuiet', 'warning'], danger: ['dangerQuiet', 'danger'],
  info: ['infoQuiet', 'info'], neutral: ['sunken', 'textMuted'],
};

export function Badge({ label, tone = 'neutral' }) {
  const s = useKitStyles();
  const c = useThemeColors();
  const [bg, fg] = TONES[tone] || TONES.neutral;
  return (
    <View style={[s.badge, { backgroundColor: c[bg] }]}>
      <Text style={[s.badgeText, { color: c[fg] }]}>{label}</Text>
    </View>
  );
}

/** Tones for the statuses the society API returns. */
export function statusTone(status) {
  const v = String(status || '').toLowerCase();
  if (['paid', 'approved', 'resolved', 'collected', 'checked_out', 'confirmed', 'going', 'active_ok'].includes(v)) return 'success';
  if (['pending', 'open', 'expected', 'received', 'in_progress', 'checked_in', 'maybe'].includes(v)) return 'warning';
  if (['overdue', 'denied', 'declined', 'cancelled', 'urgent', 'high', 'active'].includes(v)) return 'danger';
  return 'neutral';
}

export function Button({ label, onPress, tone = 'primary', disabled, busy, small, style, accessibilityLabel }) {
  const s = useKitStyles();
  const c = useThemeColors();
  const palette = {
    primary: [c.accent, c.onAccent], secondary: [c.sunken, c.text],
    danger: [c.danger, '#ffffff'], success: [c.success, '#ffffff'],
  }[tone] || [c.accent, c.onAccent];
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: palette[0], opacity: disabled || busy ? 0.55 : 1 }, small && { paddingHorizontal: 12 }, style]}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: Boolean(disabled || busy), busy: Boolean(busy) }}
    >
      {busy ? <ActivityIndicator color={palette[1]} /> : <Text style={[s.btnText, { color: palette[1] }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function Field({ label, style, multiline, ...props }) {
  const s = useKitStyles();
  const c = useThemeColors();
  return (
    <View>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        style={[s.input, multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
        placeholderTextColor={c.textSubtle}
        accessibilityLabel={label}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

export function Chips({ options, value, onChange }) {
  const s = useKitStyles();
  return (
    <View style={s.chips}>
      {options.map((o) => {
        const id = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? titleCase(o) : o.label;
        const on = id === value;
        return (
          <TouchableOpacity
            key={id} style={[s.chip, on && s.chipOn]} onPress={() => onChange(id)}
            accessibilityRole="radio" accessibilityState={{ selected: on }}
          >
            <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Stats({ items }) {
  const s = useKitStyles();
  return (
    <View style={s.stats}>
      {items.map((it) => (
        <View key={it.label} style={s.stat}>
          <Text style={s.statValue}>{it.value}</Text>
          <Text style={s.statLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Loading, failed and empty, in that order. Renders `children` only when there
 * is something to show. A failed load is never presented as an empty list.
 */
export function DataState({ state, empty, emptyBody, children }) {
  const s = useKitStyles();
  const c = useThemeColors();
  if (state.loading) {
    return <View style={s.state}><ActivityIndicator color={c.accent} /></View>;
  }
  if (state.error) {
    return (
      <View style={s.state}>
        <Text style={s.stateTitle}>Could not load this</Text>
        <Text style={[s.stateBody, { marginBottom: 12 }]}>{state.error}</Text>
        <Button label="Try again" tone="secondary" onPress={() => state.reload()} />
      </View>
    );
  }
  const list = state.data;
  if (!list || (Array.isArray(list) && list.length === 0)) {
    return (
      <View style={s.state}>
        <Text style={s.stateTitle}>{empty || 'Nothing here yet'}</Text>
        {emptyBody ? <Text style={s.stateBody}>{emptyBody}</Text> : null}
      </View>
    );
  }
  return children;
}
