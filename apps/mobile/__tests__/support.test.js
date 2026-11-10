/**
 * C14 in the app: raising a support ticket or a formal grievance, seeing the
 * support team's answer, and asking for help from an order.
 *
 * The module under test (src/services/support.js) is what app/support
 * renders; the API is replaced by a recording fake so the requests the app
 * makes are checked exactly.
 */
const fs = require('fs');
const path = require('path');
const {
  validateTicket, raiseTicket, listMyTickets, groupTickets, grievanceOfficer, ticketRef, CATEGORIES,
} = require('../src/services/support');

const fakeApi = (reply) => {
  const calls = [];
  return {
    calls,
    apiGet: async (endpoint) => { calls.push(['GET', endpoint]); return reply; },
    apiPost: async (endpoint, body) => { calls.push(['POST', endpoint, body]); return reply; },
  };
};

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('support tickets in the app', () => {
  test('[C14.15] an empty or over-long ticket is refused before anything is sent', async () => {
    expect(validateTicket({ subject: '', description: 'x' })).toMatch(/subject/);
    expect(validateTicket({ subject: 'x', description: '   ' })).toMatch(/describe/);
    expect(validateTicket({ subject: 'x'.repeat(201), description: 'd' })).toMatch(/200/);
    expect(validateTicket({ subject: 's', description: 'd', category: 'nonsense' })).toMatch(/choose/);
    const api = fakeApi({});
    await expect(raiseTicket({ subject: '', description: '' }, api)).rejects.toThrow(/subject/);
    expect(api.calls).toHaveLength(0);
  });

  test('[C14.16] a ticket about an order is sent with that order and the formal-grievance flag', async () => {
    const api = fakeApi({ ticket: { id: 'abc12345-0000', isStatutory: true } });
    const ticket = await raiseTicket({
      category: 'order', subject: '  Milk leaking  ', description: ' Packet split ', orderId: 'ord-1', isStatutory: true,
    }, api);
    expect(ticket.id).toBe('abc12345-0000');
    expect(api.calls).toEqual([['POST', '/support/tickets', {
      category: 'order', subject: 'Milk leaking', description: 'Packet split', isStatutory: true, orderId: 'ord-1',
    }]]);
  });

  test('[C14.17] a reply without a ticket id is not treated as registered', async () => {
    await expect(raiseTicket({ subject: 's', description: 'd' }, fakeApi({ success: true }))).rejects.toThrow(/not registered/);
  });

  test('[C14.18] tickets split into open and resolved, newest first, with the support answer kept', async () => {
    const api = fakeApi({
      tickets: [
        { id: '1', status: 'resolved', createdAt: '2026-11-01T10:00:00Z', resolution: 'Refunded' },
        { id: '2', status: 'open', createdAt: '2026-11-03T10:00:00Z' },
        { id: '3', status: 'in_progress', createdAt: '2026-11-04T10:00:00Z' },
      ],
    });
    const { open, resolved } = groupTickets(await listMyTickets(api));
    expect(api.calls).toEqual([['GET', '/support/tickets/my']]);
    expect(open.map((t) => t.id)).toEqual(['3', '2']);
    expect(resolved).toEqual([expect.objectContaining({ id: '1', resolution: 'Refunded' })]);
  });

  test('[C14.19] the Grievance Officer comes from the API, and references are short and stable', async () => {
    const api = fakeApi({ grievanceOfficer: { name: 'Officer', slaHoursAcknowledgement: 48 } });
    expect(await grievanceOfficer(api)).toMatchObject({ name: 'Officer', slaHoursAcknowledgement: 48 });
    expect(api.calls).toEqual([['GET', '/support/grievance-officer']]);
    expect(ticketRef('e2e00000-0000-4000')).toBe('#E2E00000');
    expect(CATEGORIES.map(([v]) => v)).toContain('order');
  });

  test('[C14.20] the support screen uses this module, and an order links to help for itself', () => {
    const screen = read('app/support/index.js');
    for (const fn of ['raiseTicket', 'listMyTickets', 'groupTickets', 'validateTicket', 'grievanceOfficer']) {
      expect(screen).toContain(fn);
    }
    expect(screen).toMatch(/useLocalSearchParams\(\)/);
    expect(read('app/orders/track/[id].js')).toMatch(/router\.push\(`\/support\?order=\$\{encodeURIComponent\(String\(id\)\)\}`\)/);
    // The order list now opens an order (it pushed /orders/:id, which matched no route).
    expect(read('app/orders/index.js')).toMatch(/router\.push\(`\/orders\/track\/\$\{item\.id\}`\)/);
    expect(fs.existsSync(path.join(ROOT, 'app/orders/[id].js'))).toBe(false);
  });
});
