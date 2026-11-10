// GET /api/me   Authorization: Bearer <token>
// The signed-in owner's site (or null before the first message) and limits.

import { withRealDeps, requireUser, refreshEntitlement, publicView, LIMITS } from '../lib/server.js';

export function createMe(deps) {
  return async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req, res, deps.store);
    if (!user) return;
    let site = await deps.store.siteByOwner(user.id);
    let active = false;
    if (site) ({ site, active } = await refreshEntitlement(site, deps));
    return res.status(200).json({
      user: { id: user.id, email: user.email },
      site: publicView(site, active, req, deps.now),
      limits: { free: LIMITS.free, paidPerMonth: LIMITS.paidPerMonth, photos: LIMITS.photos },
    });
  };
}

export default withRealDeps(createMe);
