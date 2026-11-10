// Server-side subscription checks against the Paddle Billing API.
// Env: PADDLE_API_KEY (server key, never exposed to the browser),
//      PADDLE_ENV = "sandbox" | "production" (default production),
//      PADDLE_PRICE_ID = the site-builder subscription price (pri_...).
// The price check matters: the same Paddle account also sells PostIQ, and a
// PostIQ subscription must not unlock the site builder.

const ACTIVE = new Set(['active', 'trialing']);

function apiBase() {
  return process.env.PADDLE_ENV === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
}

export function paddleConfigured() {
  return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_PRICE_ID);
}

async function paddleGet(path, fetchImpl = fetch) {
  const res = await fetchImpl(apiBase() + path, {
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`paddle_http_${res.status}`);
  const body = await res.json();
  return body?.data ?? null;
}

function hasOurPrice(items) {
  const want = process.env.PADDLE_PRICE_ID;
  return Array.isArray(items) && items.some((it) => it?.price?.id === want);
}

export async function isSubscriptionActive(subscriptionId, fetchImpl) {
  if (!paddleConfigured()) return false;
  if (typeof subscriptionId !== 'string' || !/^sub_[a-z0-9]{10,60}$/i.test(subscriptionId)) return false;
  const sub = await paddleGet(`/subscriptions/${subscriptionId}`, fetchImpl);
  return Boolean(sub && ACTIVE.has(sub.status) && hasOurPrice(sub.items));
}

// After checkout the browser only knows the transaction id. Resolve it to a
// subscription id here, so the browser never has to be trusted with one.
export async function subscriptionFromTransaction(transactionId, fetchImpl) {
  if (!paddleConfigured()) return { error: 'not_configured' };
  if (typeof transactionId !== 'string' || !/^txn_[a-z0-9]{10,60}$/i.test(transactionId)) return { error: 'bad_id' };
  const txn = await paddleGet(`/transactions/${transactionId}`, fetchImpl);
  if (!txn) return { error: 'not_found' };
  if (!['paid', 'completed'].includes(txn.status) || !txn.subscription_id) return { pending: true };
  if (!hasOurPrice(txn.items)) return { error: 'wrong_product' };
  return { subscriptionId: txn.subscription_id };
}
