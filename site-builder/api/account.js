// DELETE /api/account  { confirm: "DELETE" }
// Deletes everything: stops billing immediately, removes photos, the site and the login.

import { withRealDeps, requireUser } from '../lib/server.js';

export function createAccount(deps) {
  const { store, paddle } = deps;
  return async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req, res, store);
    if (!user) return;
    if (req.body?.confirm !== 'DELETE') return res.status(400).json({ error: 'confirm_required' });

    const site = await store.siteByOwner(user.id);
    if (site?.subscription_id && site.subscription_status !== 'canceled') {
      // Never leave someone paying for an account that no longer exists.
      try {
        await paddle.cancelSubscription(site.subscription_id, 'immediately');
      } catch (err) {
        console.error('cancel on delete failed', err.message);
        return res.status(503).json({ error: 'billing_unavailable' });
      }
    }
    await store.deletePhotos((site?.photos || []).map((p) => p.path)).catch((e) => console.error('photo cleanup failed', e.message));
    await store.deleteAccount(user.id);
    return res.status(200).json({ ok: true });
  };
}

export default withRealDeps(createAccount);
