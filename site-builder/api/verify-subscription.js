// POST /api/verify-subscription  Body: { transactionId: "txn_..." }
// Called by the browser right after Paddle checkout completes. Resolves the
// transaction to a subscription on the server and confirms it is active.

import { isSubscriptionActive, subscriptionFromTransaction } from '../lib/paddle.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const r = await subscriptionFromTransaction(req.body?.transactionId);
    if (r.error === 'not_configured') return res.status(503).json({ error: 'billing_not_configured' });
    if (r.error) return res.status(400).json({ error: r.error });
    if (r.pending) return res.status(202).json({ pending: true });
    const active = await isSubscriptionActive(r.subscriptionId);
    if (!active) return res.status(202).json({ pending: true });
    return res.status(200).json({ subscriptionId: r.subscriptionId });
  } catch (err) {
    console.error('verify failed', err);
    return res.status(503).json({ error: 'billing_unavailable' });
  }
}
