// Data access. One site per user. The browser never talks to the database:
// every read and write goes through the API with the service key, and the
// table has row-level security on with no policies (see supabase/schema.sql).
//
// updateSite() is optimistic: it only applies if the row's version is
// unchanged, and returns null otherwise, so two requests can't interleave
// writes to the same conversation.

import { createClient } from '@supabase/supabase-js';

const FIELDS = 'id, owner_id, slug, published, spec, photos, history, chat, free_turns, usage_month, month_turns, subscription_id, subscription_status, subscription_checked_at, version, created_at, updated_at';
const BUCKET = 'site-photos';
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export class SlugTakenError extends Error {
  constructor() { super('slug_taken'); this.code = 'slug_taken'; }
}

export function supabaseStore(url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (!url || !key) throw new Error('supabase_not_configured');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows = async (query) => {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const store = {
    async userFromToken(jwt) {
      const { data, error } = await sb.auth.getUser(jwt);
      if (error || !data?.user) return null;
      return { id: data.user.id, email: data.user.email || '' };
    },
    siteByOwner: (ownerId) => rows(sb.from('sites').select(FIELDS).eq('owner_id', ownerId).maybeSingle()),
    siteBySlug: (slug) => rows(sb.from('sites').select(FIELDS).eq('slug', slug).maybeSingle()),
    async createSite(ownerId) {
      const { data, error } = await sb.from('sites').insert({ owner_id: ownerId }).select(FIELDS).single();
      if (error?.code === '23505') return store.siteByOwner(ownerId); // created by a parallel request
      if (error) throw error;
      return data;
    },
    async updateSite(site, patch) {
      const { data, error } = await sb.from('sites')
        .update({ ...patch, version: site.version + 1, updated_at: new Date().toISOString() })
        .eq('id', site.id).eq('version', site.version)
        .select(FIELDS);
      if (error?.code === '23505') throw new SlugTakenError();
      if (error) throw error;
      return data[0] || null;
    },
    async uploadPhoto(ownerId, bytes, ext) {
      const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: MIME[ext], upsert: false });
      if (error) throw error;
      return { path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
    },
    async deletePhotos(paths) {
      if (!paths.length) return;
      const { error } = await sb.storage.from(BUCKET).remove(paths);
      if (error) throw error;
    },
    async deleteAccount(ownerId) {
      // The site row goes with the user (on delete cascade).
      const { error } = await sb.auth.admin.deleteUser(ownerId);
      if (error) throw error;
    },
  };
  return store;
}

// In-memory implementation with the same behavior, for tests and local runs.
export function memoryStore({ users = {}, publicBase = 'https://storage.test/' } = {}) {
  const sites = new Map();
  const files = new Map();
  const copy = (v) => (v == null ? v : structuredClone(v));
  const blank = (ownerId) => ({
    id: crypto.randomUUID(), owner_id: ownerId, slug: null, published: false, spec: null, photos: [], history: [], chat: [],
    free_turns: 0, usage_month: null, month_turns: 0, subscription_id: null, subscription_status: null,
    subscription_checked_at: null, version: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  const find = (pred) => [...sites.values()].find(pred) || null;

  return {
    users, sites, files,
    async userFromToken(jwt) { return users[jwt] ? { ...users[jwt] } : null; },
    async siteByOwner(ownerId) { return copy(find((s) => s.owner_id === ownerId)); },
    async siteBySlug(slug) { return copy(find((s) => s.slug === slug)); },
    async createSite(ownerId) {
      const existing = find((s) => s.owner_id === ownerId);
      if (existing) return copy(existing);
      const s = blank(ownerId);
      sites.set(s.id, s);
      return copy(s);
    },
    async updateSite(site, patch) {
      const cur = sites.get(site.id);
      if (!cur || cur.version !== site.version) return null;
      if (patch.slug && find((s) => s.slug === patch.slug && s.id !== site.id)) throw new SlugTakenError();
      Object.assign(cur, copy(patch), { version: cur.version + 1, updated_at: new Date().toISOString() });
      return copy(cur);
    },
    async uploadPhoto(ownerId, bytes, ext) {
      const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
      files.set(path, bytes);
      return { path, url: `${publicBase}${path}` };
    },
    async deletePhotos(paths) { paths.forEach((p) => files.delete(p)); },
    async deleteAccount(ownerId) {
      for (const [id, s] of sites) if (s.owner_id === ownerId) sites.delete(id);
      for (const [jwt, u] of Object.entries(users)) if (u.id === ownerId) delete users[jwt];
    },
  };
}
