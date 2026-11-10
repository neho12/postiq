// POST /api/verify-subscription  { transactionId }
// Called right after Paddle checkout. Links the subscription to the signed-in
// owner only if Paddle confirms it is paid, for this product, and was started
// by this same user (the checkout passes custom_data.user_id).

import { withRealDeps, requireUser, publicView } from '../lib/server.js';

export function createVerify(deps) {
  const { store, paddle, now } = deps;
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req, res, store);
    if (!user) return;
    if (!paddle.configured) return res.status(503).json({ error: 'billing_not_configured' });

    let r;
    try {
      r = await paddle.subscriptionForTransaction(req.body?.transactionId, user.id);
    } catch (err) {
      console.error('verify failed', err.message);
      return res.status(503).json({ error: 'billing_unavailable' });
    }
    if (r.error) return res.status(400).json({ error: r.error });
    if (r.pending) return res.status(202).json({ pending: true });

    const site = (await store.siteByOwner(user.id)) || (await store.createSite(user.id));
    const saved = await store.updateSite(site, {
      subscription_id: r.subscriptionId,
      subscription_status: 'active',
      subscription_checked_at: new Date(now()).toISOString(),
    });
    if (!saved) return res.status(409).json({ error: 'conflict' });
    return res.status(200).json({ site: publicView(saved, true, req, now) });
  };
}

export default withRealDeps(createVerify);
