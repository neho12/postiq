// Paddle Billing API, server side only.
// Env: PADDLE_API_KEY (server key), PADDLE_PRICE_ID (this product's monthly
// price), PADDLE_ENV ("sandbox" | "production", default production).
// Every check also confirms the subscription is for THIS product's price: the
// same Paddle account sells PostIQ, and that must not unlock the builder.

const SUB_RE = /^sub_[a-z0-9]{10,60}$/i;
const TXN_RE = /^txn_[a-z0-9]{10,60}$/i;
// past_due: a renewal payment failed and Paddle is retrying; keep the site up meanwhile.
const LIVE = new Set(['active', 'trialing', 'past_due']);

export function createPaddle({
  apiKey = process.env.PADDLE_API_KEY,
  priceId = process.env.PADDLE_PRICE_ID,
  env = process.env.PADDLE_ENV,
  fetchImpl = (...a) => fetch(...a),
} = {}) {
  const base = env === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
  const configured = Boolean(apiKey && priceId);

  async function call(method, path, body) {
    if (!configured) throw new Error('paddle_not_configured');
    const res = await fetchImpl(base + path, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`paddle_http_${res.status}`);
    return (await res.json())?.data ?? null;
  }
  const ours = (items) => Array.isArray(items) && items.some((it) => it?.price?.id === priceId);

  return {
    configured,

    // 'active' when the site should be live, otherwise a short reason.
    async subscriptionStatus(subscriptionId) {
      if (!SUB_RE.test(String(subscriptionId))) return 'invalid';
      const sub = await call('GET', `/subscriptions/${subscriptionId}`);
      if (!sub) return 'missing';
      if (!ours(sub.items)) return 'wrong_product';
      return LIVE.has(sub.status) ? 'active' : String(sub.status);
    },

    // After checkout the browser reports a transaction id. Accept it only if it
    // is paid, for this product, and was started by this same user (custom_data).
    async subscriptionForTransaction(transactionId, userId) {
      if (!TXN_RE.test(String(transactionId))) return { error: 'bad_id' };
      const txn = await call('GET', `/transactions/${transactionId}`);
      if (!txn) return { error: 'not_found' };
      if (txn.custom_data?.user_id !== userId) return { error: 'not_yours' };
      if (!ours(txn.items)) return { error: 'wrong_product' };
      if (!['paid', 'completed'].includes(txn.status) || !txn.subscription_id) return { pending: true };
      return { subscriptionId: txn.subscription_id };
    },

    // when: 'next_billing_period' (owner cancels; site stays up until the paid
    // period ends) or 'immediately' (account deletion).
    async cancelSubscription(subscriptionId, when = 'next_billing_period') {
      if (!SUB_RE.test(String(subscriptionId))) return false;
      const sub = await call('POST', `/subscriptions/${subscriptionId}/cancel`, { effective_from: when });
      return Boolean(sub);
    },
  };
}
