// POST /api/subscription  { action: "cancel" }
// Cancels at the end of the paid period: the site stays live until then.
// (Israeli consumer law expects an online cancellation path as easy as signing up.)

import { withRealDeps, requireUser } from '../lib/server.js';

export function createSubscription(deps) {
  const { store, paddle, now } = deps;
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req, res, store);
    if (!user) return;
    if (req.body?.action !== 'cancel') return res.status(400).json({ error: 'bad_action' });
    const site = await store.siteByOwner(user.id);
    if (!site?.subscription_id) return res.status(404).json({ error: 'no_subscription' });
    try {
      await paddle.cancelSubscription(site.subscription_id, 'next_billing_period');
    } catch (err) {
      console.error('cancel failed', err.message);
      return res.status(503).json({ error: 'billing_unavailable' });
    }
    // Force a fresh status check on the next request.
    await store.updateSite(site, { subscription_checked_at: new Date(0).toISOString() });
    return res.status(200).json({ ok: true, at: new Date(now()).toISOString() });
  };
}

export default withRealDeps(createSubscription);
