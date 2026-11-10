// POST /api/publish  { action: "publish", slug }  or  { action: "unpublish" }
// Publishing needs an active subscription; the site is then served at /s/<slug>.

import { withRealDeps, requireUser, refreshEntitlement, publicView } from '../lib/server.js';

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set(['api', 'app', 'admin', 'www', 'mail', 'help', 'support', 'login', 'demo', 'terms', 'privacy',
  'accessibility', 'static', 'assets', 'billing', 'account', 'test', 'null', 'undefined']);

export function createPublish(deps) {
  const { store } = deps;
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req, res, store);
    if (!user) return;
    let site = await store.siteByOwner(user.id);
    if (!site?.spec) return res.status(409).json({ error: 'no_site_yet' });
    let active;
    ({ site, active } = await refreshEntitlement(site, deps));

    const action = req.body?.action;
    let patch;
    if (action === 'unpublish') {
      patch = { published: false };
    } else if (action === 'publish') {
      const slug = String(req.body?.slug || '').trim().toLowerCase();
      if (!SLUG_RE.test(slug) || slug.includes('--') || RESERVED.has(slug)) return res.status(400).json({ error: 'bad_slug' });
      if (!active) return res.status(402).json({ error: 'subscription_required' });
      if (slug !== site.slug) {
        const other = await store.siteBySlug(slug);
        if (other && other.id !== site.id) return res.status(409).json({ error: 'slug_taken' });
      }
      patch = { slug, published: true };
    } else {
      return res.status(400).json({ error: 'bad_action' });
    }

    let saved;
    try {
      saved = await store.updateSite(site, patch);
    } catch (err) {
      if (err.code === 'slug_taken') return res.status(409).json({ error: 'slug_taken' });
      throw err;
    }
    if (!saved) return res.status(409).json({ error: 'conflict' });
    return res.status(200).json({ site: publicView(saved, active, req, deps.now) });
  };
}

export default withRealDeps(createPublish);
