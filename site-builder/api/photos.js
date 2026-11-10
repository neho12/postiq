// POST   /api/photos  { data: "data:image/jpeg;base64,..." }  add a photo
// DELETE /api/photos  { path }                                remove one of the owner's photos
// The browser shrinks photos before upload; the server re-checks type and size.

import { withRealDeps, requireUser, refreshEntitlement, publicView, LIMITS } from '../lib/server.js';

const MAX_BYTES = 1_500_000;
const SIGNATURES = {
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  webp: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};
const EXT = { jpeg: 'jpg', jpg: 'jpg', png: 'png', webp: 'webp' };

export function createPhotos(deps) {
  const { store } = deps;
  return async function handler(req, res) {
    if (!['POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req, res, store);
    if (!user) return;
    let site = (await store.siteByOwner(user.id)) || (await store.createSite(user.id));

    if (req.method === 'POST') {
      const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.data || ''));
      if (!m) return res.status(400).json({ error: 'bad_image' });
      const ext = EXT[m[1]];
      const bytes = Buffer.from(m[2], 'base64');
      if (bytes.length > MAX_BYTES) return res.status(413).json({ error: 'too_large' });
      if (!SIGNATURES[ext](bytes)) return res.status(400).json({ error: 'bad_image' });
      if ((site.photos || []).length >= LIMITS.photos) return res.status(409).json({ error: 'too_many' });

      const photo = await store.uploadPhoto(user.id, bytes, ext);
      const saved = await store.updateSite(site, { photos: [...(site.photos || []), photo] });
      if (!saved) {
        await store.deletePhotos([photo.path]).catch(() => {});
        return res.status(409).json({ error: 'conflict' });
      }
      site = saved;
    } else {
      const path = String(req.body?.path || '');
      const photos = site.photos || [];
      if (!photos.some((p) => p.path === path)) return res.status(404).json({ error: 'not_found' });
      const saved = await store.updateSite(site, { photos: photos.filter((p) => p.path !== path) });
      if (!saved) return res.status(409).json({ error: 'conflict' });
      await store.deletePhotos([path]).catch((e) => console.error('photo delete failed', e.message));
      site = saved;
    }

    const { site: fresh, active } = await refreshEntitlement(site, deps);
    return res.status(200).json({ site: publicView(fresh, active, req, deps.now) });
  };
}

export default withRealDeps(createPhotos);
