/**
 * Customer support and statutory grievances (C14), for the app.
 *
 * The app had no way to raise a ticket or see an answer: no screen called
 * /support. This module holds the rules and the API calls; app/support
 * renders them. Kept free of React so it can be tested without a device.
 */
import { apiGet, apiPost } from '../lib/api';

export const CATEGORIES = [
  ['order', 'Order problem'],
  ['delivery', 'Delivery'],
  ['payment', 'Payment'],
  ['refund', 'Refund'],
  ['quality', 'Product quality'],
  ['account', 'My account'],
  ['general', 'Something else'],
];

const OPEN = ['open', 'in_progress'];

/** Returns an error message, or null when the form can be sent. */
export function validateTicket(form) {
  const subject = String((form && form.subject) || '').trim();
  const description = String((form && form.description) || '').trim();
  if (!subject || !description) return 'Please add a subject and describe the problem.';
  if (subject.length > 200) return 'Please keep the subject under 200 characters.';
  if (description.length > 5000) return 'Please keep the details under 5000 characters.';
  if (form.category && !CATEGORIES.some(([v]) => v === form.category)) return 'Please choose what the ticket is about.';
  return null;
}

/** Raises a ticket; throws with the validation or server message. */
export async function raiseTicket(form, api = { apiPost }) {
  const problem = validateTicket(form);
  if (problem) throw new Error(problem);
  const res = await api.apiPost('/support/tickets', {
    category: form.category || 'general',
    subject: form.subject.trim(),
    description: form.description.trim(),
    isStatutory: Boolean(form.isStatutory),
    ...(form.orderId ? { orderId: String(form.orderId) } : {}),
  });
  if (!res || !res.ticket || !res.ticket.id) throw new Error('The ticket was not registered. Please try again.');
  return res.ticket;
}

export async function listMyTickets(api = { apiGet }) {
  const res = await api.apiGet('/support/tickets/my');
  return (res && res.tickets) || [];
}

/** Splits tickets into open and resolved, newest first. */
export function groupTickets(tickets) {
  const sorted = [...(tickets || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return {
    open: sorted.filter((t) => OPEN.includes(t.status)),
    resolved: sorted.filter((t) => !OPEN.includes(t.status)),
  };
}

export async function grievanceOfficer(api = { apiGet }) {
  const res = await api.apiGet('/support/grievance-officer');
  return res && res.grievanceOfficer;
}

/** Short, human ticket reference shown to the customer. */
export const ticketRef = (id) => `#${String(id || '').slice(0, 8).toUpperCase()}`;
