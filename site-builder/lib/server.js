// Shared server helpers: real dependencies, auth, entitlement, limits, and the
// public view of a site that the browser receives.

import Anthropic from '@anthropic-ai/sdk';
import { supabaseStore } from './store.js';
import { createPaddle } from './paddle.js';

export const LIMITS = {
  free: Number(process.env.FREE_MESSAGES || 30),             // total, before subscribing
  paidPerMonth: Number(process.env.PAID_MESSAGES_PER_MONTH || 200),
  photos: 8,
};

let real;
function realDeps() {
  if (!real) real = { store: supabaseStore(), claude: new Anthropic(), paddle: createPaddle(), now: Date.now };
  return real;
}

// Wraps a handler factory with production dependencies. Missing configuration
// answers 503 instead of crashing, so a half-configured deploy fails safely.
export function withRealDeps(factory) {
  return async (req, res) => {
    let deps;
    try {
      deps = realDeps();
    } catch (err) {
      console.error('server not configured:', err.message);
      return res.status(503).json({ error: 'server_not_configured' });
    }
    return factory(deps)(req, res);
  };
}

export async function requireUser(req, res, store) {
  const m = /^Bearer ([\w.-]+)$/.exec(req.headers?.authorization || '');
  const user = m ? await store.userFromToken(m[1]).catch(() => null) : null;
  if (!user) res.status(401).json({ error: 'auth_required' });
  return user;
}

const HOUR = 3600_000;

// Is the subscription live? Paddle is asked at most once per maxAgeMs per site;
// the answer is cached on the row. If Paddle is unreachable, the last known
// status stands, so an outage there doesn't take every site down.
export async function refreshEntitlement(site, { store, paddle, now }, maxAgeMs = HOUR) {
  if (!site?.subscription_id) return { site, active: false };
  const checked = site.subscription_checked_at ? Date.parse(site.subscription_checked_at) : 0;
  if (now() - checked < maxAgeMs) return { site, active: site.subscription_status === 'active' };
  let status;
  try {
    status = await paddle.subscriptionStatus(site.subscription_id);
  } catch (err) {
    console.error('paddle status check failed', err.message);
    return { site, active: site.subscription_status === 'active' };
  }
  const updated = await store.updateSite(site, { subscription_status: status, subscription_checked_at: new Date(now()).toISOString() });
  return { site: updated || site, active: status === 'active' };
}

export function monthKey(now) {
  return new Date(now()).toISOString().slice(0, 7);
}

export function baseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'localhost';
  const proto = req.headers?.['x-forwarded-proto'] || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

// What the browser may see. Never the raw conversation (thinking blocks, tool
// calls): only the chat bubbles, the content and the photo URLs.
export function publicView(site, active, req, now) {
  if (!site) return null;
  const monthTurns = site.usage_month === monthKey(now) ? site.month_turns : 0;
  return {
    spec: site.spec,
    photos: (site.photos || []).map((p) => ({ url: p.url, path: p.path })),
    chat: site.chat || [],
    slug: site.slug,
    published: Boolean(site.published && active),
    subscribed: active,
    liveUrl: site.slug && site.published && active ? `${baseUrl(req)}/s/${site.slug}` : null,
    freeLeft: Math.max(0, LIMITS.free - (site.free_turns || 0)),
    monthLeft: active ? Math.max(0, LIMITS.paidPerMonth - monthTurns) : null,
  };
}
