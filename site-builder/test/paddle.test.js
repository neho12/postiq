import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaddle } from '../lib/paddle.js';

const PRICE = 'pri_builder000001';
const paddleWith = (data, status = 200, seen = []) => createPaddle({
  apiKey: 'test_key', priceId: PRICE, env: 'sandbox',
  fetchImpl: async (url, init) => { seen.push([url, init]); return { status, ok: status < 400, json: async () => ({ data }) }; },
});

test('active subscription for our price is live; past_due keeps the site up', async () => {
  assert.equal(await paddleWith({ status: 'active', items: [{ price: { id: PRICE } }] }).subscriptionStatus('sub_abcdefghij01'), 'active');
  assert.equal(await paddleWith({ status: 'past_due', items: [{ price: { id: PRICE } }] }).subscriptionStatus('sub_abcdefghij01'), 'active');
});
test('another product (PostIQ), canceled, missing or malformed ids are not live', async () => {
  assert.equal(await paddleWith({ status: 'active', items: [{ price: { id: 'pri_01krxttvpt1e38da5a0zt0pasq' } }] }).subscriptionStatus('sub_abcdefghij01'), 'wrong_product');
  assert.equal(await paddleWith({ status: 'canceled', items: [{ price: { id: PRICE } }] }).subscriptionStatus('sub_abcdefghij01'), 'canceled');
  assert.equal(await paddleWith(null, 404).subscriptionStatus('sub_abcdefghij01'), 'missing');
  assert.equal(await paddleWith({}).subscriptionStatus('../../admin'), 'invalid');
});
test('transaction must be paid, ours, and started by the same user', async () => {
  const good = { status: 'completed', subscription_id: 'sub_abcdefghij01', items: [{ price: { id: PRICE } }], custom_data: { user_id: 'u1' } };
  assert.deepEqual(await paddleWith(good).subscriptionForTransaction('txn_abcdefghij01', 'u1'), { subscriptionId: 'sub_abcdefghij01' });
  assert.deepEqual(await paddleWith(good).subscriptionForTransaction('txn_abcdefghij01', 'u2'), { error: 'not_yours' });
  assert.deepEqual(await paddleWith({ ...good, status: 'ready', subscription_id: null }).subscriptionForTransaction('txn_abcdefghij01', 'u1'), { pending: true });
  assert.deepEqual(await paddleWith({ ...good, items: [{ price: { id: 'pri_other' } }] }).subscriptionForTransaction('txn_abcdefghij01', 'u1'), { error: 'wrong_product' });
});
test('cancel posts the requested timing to the sandbox API', async () => {
  const seen = [];
  await paddleWith({ id: 'sub_abcdefghij01' }, 200, seen).cancelSubscription('sub_abcdefghij01', 'immediately');
  assert.equal(seen[0][0], 'https://sandbox-api.paddle.com/subscriptions/sub_abcdefghij01/cancel');
  assert.equal(seen[0][1].method, 'POST');
  assert.deepEqual(JSON.parse(seen[0][1].body), { effective_from: 'immediately' });
});
