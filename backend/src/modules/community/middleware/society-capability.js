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
        WHERE user_id = $1 AND society_id = $2 AND is_active = true
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
  const named = req.params?.societyId || req.body?.societyId || req.query?.societyId || null;
  if (named) return named;

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
  resolveSocietyId,
  societyContextFor,
};
