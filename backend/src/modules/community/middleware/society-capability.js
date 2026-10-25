/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Society capabilities — what a person may do, in which society
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The platform already stores society membership the right way: `society_members`
 * carries (society_id, user_id, flat_number, role, status) and
 * `society_admin_roles` carries a permission set per society. A person's base
 * `users.role` is a separate thing, and it stays `user` — being a guard is
 * something you are *in a society*, not instead of being a citizen.
 *
 * What was missing was anything that read that model. Endpoints either checked
 * a global role string, which cannot express "guard at Green Acres but a
 * customer everywhere else", or checked nothing at all and let any member of a
 * society act on any record in it.
 *
 * ── The capabilities ───────────────────────────────────────────────────────
 *
 *   approveVisitor   decide whether a visitor may come up. The resident being
 *                    visited, or a society admin. Explicitly NOT the guard:
 *                    the point of the approval step is that someone upstairs
 *                    agrees, and a gate that can approve its own entries is
 *                    the approval step deleted.
 *
 *   logGateEntry     record arrivals, departures and vehicles. The guard on
 *                    duty, or a society admin covering the desk.
 *
 *   manageSociety    roster, onboarding, notices, ledger. Society admins.
 *
 * ── Scoping ────────────────────────────────────────────────────────────────
 *
 * Every check takes a societyId and is answered against membership *in that
 * society*. A guard at one society has no capability at another, which is the
 * property that makes cross-society IDOR uninteresting: tampering with the id
 * in a request moves you to a society where you hold nothing.
 */

const { queryOne } = require('../../../config/database');
const logger = require('../../../config/logger');

/** Platform staff, who are unscoped by design. */
const PLATFORM_ROLES = ['admin', 'super_admin'];

const CAPABILITIES = Object.freeze({
  APPROVE_VISITOR: 'approveVisitor',
  LOG_GATE_ENTRY: 'logGateEntry',
  MANAGE_SOCIETY: 'manageSociety',
});

/** Membership roles that grant each capability. */
const ROLE_CAPABILITIES = Object.freeze({
  resident: [CAPABILITIES.APPROVE_VISITOR],
  owner: [CAPABILITIES.APPROVE_VISITOR],
  tenant: [CAPABILITIES.APPROVE_VISITOR],
  member: [CAPABILITIES.APPROVE_VISITOR],
  guard: [CAPABILITIES.LOG_GATE_ENTRY],
  security_guard: [CAPABILITIES.LOG_GATE_ENTRY],
  admin: [CAPABILITIES.APPROVE_VISITOR, CAPABILITIES.LOG_GATE_ENTRY, CAPABILITIES.MANAGE_SOCIETY],
  society_admin: [CAPABILITIES.APPROVE_VISITOR, CAPABILITIES.LOG_GATE_ENTRY, CAPABILITIES.MANAGE_SOCIETY],
  secretary: [CAPABILITIES.APPROVE_VISITOR, CAPABILITIES.LOG_GATE_ENTRY, CAPABILITIES.MANAGE_SOCIETY],
});

function isPlatformStaff(req) {
  return PLATFORM_ROLES.includes(String(req.user?.role || '').toLowerCase());
}

/**
 * A person's membership of one society, or null.
 *
 * Only active memberships count. A former resident keeps the row for the
 * history it anchors, and must not keep the ability to approve visitors.
 */
async function membershipOf(userId, societyId) {
  if (!userId || !societyId) return null;
  try {
    return await queryOne(
      `SELECT id, role, flat_number, is_active, status
         FROM society_members
        WHERE user_id = $1 AND society_id = $2
        LIMIT 1`,
      [userId, societyId]
    );
  } catch (err) {
    logger.warn('Society membership lookup failed: ' + err.message);
    return null;
  }
}

function membershipIsActive(membership) {
  if (!membership) return false;
  const active = membership.is_active;
  if (active === 0 || active === false || active === '0') return false;
  const status = String(membership.status || 'active').toLowerCase();
  return !['removed', 'suspended', 'rejected', 'pending'].includes(status);
}

/** The admin permission set for a society, or null. */
async function adminRoleOf(userId, societyId) {
  if (!userId || !societyId) return null;
  try {
    return await queryOne(
      `SELECT permissions FROM society_admin_roles
        WHERE user_id = $1 AND society_id = $2 AND is_active = '1'
        LIMIT 1`,
      [userId, societyId]
    );
  } catch (err) {
    logger.warn('Society admin role lookup failed: ' + err.message);
    return null;
  }
}

/**
 * Whether the caller holds a capability in a society.
 *
 * `flatNumber`, when given, narrows approveVisitor to the flat being visited:
 * a resident decides about their own guests, not their neighbour's. A society
 * admin is not narrowed, because covering the desk is part of the job.
 */
async function hasSocietyCapability(req, societyId, capability, flatNumber = null) {
  if (!capability) return false;
  if (isPlatformStaff(req)) return true;

  const userId = req.user?.id;
  if (!userId || !societyId) return false;

  const adminRole = await adminRoleOf(userId, societyId);
  if (adminRole) {
    let perms = {};
    try {
      perms = JSON.parse(adminRole.permissions || '{}');
    } catch {
      perms = {};
    }
    if (perms.all === true || perms[capability] === true) return true;
    // An admin row with a narrower permission set still counts as running the
    // society for the purposes of the desk.
    if (perms.members === true && capability !== CAPABILITIES.MANAGE_SOCIETY) return true;
  }

  const membership = await membershipOf(userId, societyId);
  if (!membershipIsActive(membership)) return false;

  const granted = ROLE_CAPABILITIES[String(membership.role || '').toLowerCase()] || [];
  if (!granted.includes(capability)) return false;

  // Residents decide about their own flat's visitors only.
  if (
    capability === CAPABILITIES.APPROVE_VISITOR
    && flatNumber
    && membership.flat_number
    && String(membership.flat_number).trim().toLowerCase() !== String(flatNumber).trim().toLowerCase()
  ) {
    return false;
  }

  return true;
}

/**
 * Which society a request is about.
 *
 * Two mechanisms used to answer this and they did not agree.
 * `requireSocietyPermission` validated the id the *request named*
 * (body/query/params); the controllers behind it then called their own
 * `getSocietyIdForUser`, which returned the caller's first active membership
 * with no ordering at all. So the society that was authorised and the society
 * that was written to were resolved independently.
 *
 * For anyone in a single society that is invisible. For a committee member who
 * also lives somewhere else it is a privilege escalation: name the society you
 * administer, pass the check, and have the write land in whichever society the
 * database happened to return first.
 *
 * One resolution, used by the guard and the handler alike:
 *
 *   - A named society wins. It is not trusted — the capability check that
 *     follows is answered against *that* society, so naming one you do not
 *     belong to buys nothing.
 *   - Otherwise the caller's memberships decide, and only when there is exactly
 *     one. Two memberships and no stated society is genuinely ambiguous, and
 *     picking one is how the original bug worked; it asks instead.
 */
async function resolveSocietyId(req) {
      // Both spellings, in all three places: the older society routes send
  // society_id. If a request names more than one society it is refused. The
  // check below is answered against one id, and a handler reading the id from
  // a different field would otherwise act on the other: authorised for the
  // society you run, executed on the one you named second.
  const candidates = [
    req.params?.societyId, req.body?.societyId, req.query?.societyId,
    req.params?.society_id, req.body?.society_id, req.query?.society_id,
  ].filter((value) => value !== undefined && value !== null && value !== '').map(String);
  const distinct = [...new Set(candidates)];
  if (distinct.length > 1) {
    const err = new Error('The request names more than one society.');
    err.statusCode = 400;
    throw err;
  }
  if (distinct.length === 1) return distinct[0];

  const userId = req.user?.id;
  if (!userId) return null;

  const { query } = require('../../../config/database');
  try {
    const result = await query(
      `SELECT society_id, role, flat_number, is_active, status
         FROM society_members
        WHERE user_id = $1`,
      [userId]
    );

    const active = (result.rows || result || []).filter(membershipIsActive);
    if (active.length === 1) return active[0].society_id;

    // Zero -> no society. More than one -> the caller has to say which.
    return null;
  } catch (err) {
    logger.warn('Society resolution failed: ' + err.message);
    return null;
  }
}

/**
 * Express guard for a capability.
 *
 * The society is resolved server-side by `resolveSocietyId` rather than read
 * from the request, so a tampered id cannot widen what the caller reaches — it
 * can only point at a society where they hold nothing.
 */
function requireCapability(capability, resolveSocietyIdFn) {
  return async (req, res, next) => {
    try {
      const resolver = typeof resolveSocietyIdFn === 'function' ? resolveSocietyIdFn : resolveSocietyId;
      const societyId = await resolver(req);

      if (!societyId) {
        // Distinguish "you belong to none" from "you belong to several and did
        // not say which", because the second is the caller's to fix.
        const contexts = await societyContextFor(req);
        if (contexts.length > 1) {
          return res.status(400).json({
            success: false,
            message: 'You belong to more than one society. Include societyId to say which.',
            code: 'SOCIETY_AMBIGUOUS',
            societies: contexts.map((c) => ({ societyId: c.societyId, name: c.societyName, role: c.role })),
          });
        }

        return res.status(403).json({
          success: false,
          message: 'No society is associated with this account.',
        });
      }

      if (!(await hasSocietyCapability(req, societyId, capability))) {
        return res.status(403).json({
          success: false,
          message: 'This account does not have that permission in this society.',
          code: 'CAPABILITY_REQUIRED',
          capability,
        });
      }

            req.societyId = societyId;
      pinSociety(req, societyId);
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Makes the checked society the one a handler will read.
 *
 * Many handlers take `societyId` from the request body. When the society was
 * resolved from the caller's membership rather than named, the body has none,
 * and the handler would write a row with no society. The body is given the
 * resolved id. (A GET handler reads req.societyId: the query string cannot be
 * rewritten.)
 */
function pinSociety(req, societyId) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    if (req.body.society_id !== undefined) req.body.society_id = societyId;
    req.body.societyId = societyId;
  }
}

/**
 * Resolver for routes that name a record rather than a society: the society
 * is the one the record belongs to. `idOf(req)` returns the record's id.
 *
 *   requireCapability(MANAGE_SOCIETY, societyOfRow('society_gates', (req) => req.body.gateId))
 *
 * Without this, "pin topic 42" has no society to check a role against — which
 * is how those routes came to check nothing. The table name is from the fixed
 * list below, never from a request.
 */
const ROW_TABLES = new Set([
  'society_maintenance_bills', 'society_forum_topics', 'society_gates', 'society_guard_shifts',
    'move_passes', 'society_patrol_logs', 'society_agm',
]);
function societyOfRow(table, idOf) {
  if (!ROW_TABLES.has(table)) throw new Error(`societyOfRow: ${table} is not a society-scoped table on the list`);
  return async (req) => {
    const id = idOf(req);
    if (id === undefined || id === null || id === '') return null;
    const row = await queryOne(`SELECT society_id FROM ${table} WHERE id = $1`, [id]);
    return row ? row.society_id : null;
  };
}

/**
 * After a capability check: a resident acts for their own flat.
 *
 * Replaces any flatNumber in the body with the one on the caller's membership.
 * The society office (manageSociety) may act for any flat and is left alone.
 * Without it, a resident of flat 101 could issue a gate pass "for" flat 502.
 */
async function pinOwnFlat(req, res, next) {
  try {
    if (await hasSocietyCapability(req, req.societyId, CAPABILITIES.MANAGE_SOCIETY)) return next();
    const membership = await membershipOf(req.user?.id, req.societyId);
    if (!membershipIsActive(membership) || !membership.flat_number) {
      return res.status(403).json({ success: false, message: 'Your membership has no flat recorded; ask the society office.' });
    }
    if (req.body && typeof req.body === 'object') {
      req.body.flatNumber = membership.flat_number;
      if (req.body.flat_number !== undefined) req.body.flat_number = membership.flat_number;
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Express guard for "is an active member of this society", in any role.
 *
 * For what every member may do — raise an alarm, book the hall, read the
 * notice board — where no particular capability applies but the society must
 * still be the caller's own. Sets req.societyId and req.societyMembership
 * (null for platform staff and for an admin-role holder with no member row).
 */
function requireMembership(resolveSocietyIdFn) {
  return async (req, res, next) => {
    try {
      const resolver = typeof resolveSocietyIdFn === 'function' ? resolveSocietyIdFn : resolveSocietyId;
      const societyId = await resolver(req);

      if (!societyId) {
        const contexts = await societyContextFor(req);
        if (contexts.length > 1) {
          return res.status(400).json({
            success: false,
            message: 'You belong to more than one society. Include societyId to say which.',
            code: 'SOCIETY_AMBIGUOUS',
            societies: contexts.map((c) => ({ societyId: c.societyId, name: c.societyName, role: c.role })),
          });
        }
        return res.status(403).json({ success: false, message: 'No society is associated with this account.' });
      }

      const membership = await membershipOf(req.user?.id, societyId);
      const member = membershipIsActive(membership);
      if (!member && !isPlatformStaff(req) && !(await adminRoleOf(req.user?.id, societyId))) {
        return res.status(403).json({
          success: false,
          message: 'This account is not a member of that society.',
          code: 'MEMBERSHIP_REQUIRED',
        });
      }

            req.societyId = societyId;
      req.societyMembership = member ? membership : null;
      pinSociety(req, societyId);
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Every society a person belongs to, with what they may do in each.
 *
 * This is what the client needs to offer context switching — "Guard Gate Mode"
 * beside "Personal Citizen Mode" — without a second login or a role that
 * replaces their own.
 */
async function societyContextFor(req) {
  const userId = req.user?.id;
  if (!userId) return [];

  const { query } = require('../../../config/database');
  try {
    const result = await query(
      `SELECT sm.society_id, sm.role, sm.flat_number, sm.is_active, sm.status, s.name AS society_name
         FROM society_members sm
         LEFT JOIN societies s ON s.id = sm.society_id
        WHERE sm.user_id = $1`,
      [userId]
    );

    const rows = result.rows || result || [];
    const contexts = [];

    for (const row of rows) {
      if (!membershipIsActive(row)) continue;

      const roleKey = String(row.role || '').toLowerCase();
      const granted = new Set(ROLE_CAPABILITIES[roleKey] || []);

      const adminRole = await adminRoleOf(userId, row.society_id);
      if (adminRole) {
        let perms = {};
        try { perms = JSON.parse(adminRole.permissions || '{}'); } catch { perms = {}; }
        if (perms.all === true) Object.values(CAPABILITIES).forEach((c) => granted.add(c));
        else Object.values(CAPABILITIES).forEach((c) => { if (perms[c] === true) granted.add(c); });
      }

      contexts.push({
        societyId: row.society_id,
        societyName: row.society_name || null,
        role: roleKey || 'member',
        flatId: row.flat_number || null,
        status: String(row.status || 'active').toLowerCase(),
        capabilities: [...granted],
      });
    }

    return contexts;
  } catch (err) {
    logger.warn('Society context lookup failed: ' + err.message);
    return [];
  }
}

module.exports = {
  CAPABILITIES,
  ROLE_CAPABILITIES,
  membershipOf,
  membershipIsActive,
  hasSocietyCapability,
    requireCapability,
    requireMembership,
  societyOfRow,
  pinOwnFlat,
  isPlatformStaff,
  resolveSocietyId,
  societyContextFor,
};
