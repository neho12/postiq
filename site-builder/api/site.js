// GET /s/<slug>  (rewritten to /api/site?slug=<slug> in vercel.json)
// Serves a published site, rendered from its saved content. A site is live
// only while published AND its subscription is active (checked at most daily).

import { renderSite } from '../render.js';
import { withRealDeps, refreshEntitlement, baseUrl } from '../lib/server.js';
import { SLUG_RE } from './publish.js';

const DAY = 24 * 3600_000;

function notFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60');
  res.end('<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>האתר לא נמצא</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0E0D0B;color:#F2F3E5;font-family:system-ui,sans-serif;text-align:center"><div><h1 style="margin:0 0 8px">האתר לא נמצא</h1><p style="color:#A39F8A">ייתכן שהכתובת שגויה או שהאתר כבר לא פעיל.</p></div></body></html>');
}

export function createSite(deps) {
  return async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ error: 'method_not_allowed' });
    const slug = String(req.query?.slug || '').toLowerCase();
    if (!SLUG_RE.test(slug)) return notFound(res);

    let site = await deps.store.siteBySlug(slug);
    if (!site?.published || !site.spec) return notFound(res);
    let active;
    ({ site, active } = await refreshEntitlement(site, deps, DAY));
    if (!active || !site.published) return notFound(res);

    const base = baseUrl(req);
    const html = renderSite(site.spec, (site.photos || []).map((p) => p.url), {
      canonical: `${base}/s/${slug}`,
      credit: { label: process.env.BRAND_NAME || 'בונה האתרים', url: `${base}/?ref=${encodeURIComponent(slug)}` },
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.end(req.method === 'HEAD' ? '' : html);
  };
}

export default withRealDeps(createSite);
