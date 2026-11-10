import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSubscriptionActive, subscriptionFromTransaction } from '../lib/paddle.js';

process.env.PADDLE_API_KEY = 'test_key';
process.env.PADDLE_PRICE_ID = 'pri_builder000001';

const reply = (data, status = 200) => async () => ({ status, ok: status < 400, json: async () => ({ data }) });

test('active subscription for our price unlocks', async () => {
  const f = reply({ status: 'active', items: [{ price: { id: 'pri_builder000001' } }] });
  assert.equal(await isSubscriptionActive('sub_abcdefghij01', f), true);
});
test('a subscription to another product (PostIQ) does not unlock', async () => {
  const f = reply({ status: 'active', items: [{ price: { id: 'pri_01krxttvpt1e38da5a0zt0pasq' } }] });
  assert.equal(await isSubscriptionActive('sub_abcdefghij01', f), false);
});
test('canceled, unknown or malformed ids do not unlock', async () => {
  assert.equal(await isSubscriptionActive('sub_abcdefghij01', reply({ status: 'canceled', items: [{ price: { id: 'pri_builder000001' } }] })), false);
  assert.equal(await isSubscriptionActive('sub_abcdefghij01', reply(null, 404)), false);
  assert.equal(await isSubscriptionActive('../../admin', reply({})), false);
});
test('transaction resolves to subscription only when paid and for our price', async () => {
  const paid = reply({ status: 'completed', subscription_id: 'sub_abcdefghij01', items: [{ price: { id: 'pri_builder000001' } }] });
  assert.deepEqual(await subscriptionFromTransaction('txn_abcdefghij01', paid), { subscriptionId: 'sub_abcdefghij01' });
  const draft = reply({ status: 'ready', subscription_id: null, items: [] });
  assert.deepEqual(await subscriptionFromTransaction('txn_abcdefghij01', draft), { pending: true });
  const other = reply({ status: 'completed', subscription_id: 'sub_x', items: [{ price: { id: 'pri_other' } }] });
  assert.deepEqual(await subscriptionFromTransaction('txn_abcdefghij01', other), { error: 'wrong_product' });
});
