// POST /api/chat   Authorization: Bearer <Supabase access token>   Body: { text }
// Runs one turn of the owner's conversation. The conversation, site content and
// usage counters live in the database; the browser only sends its new message.

import Anthropic from '@anthropic-ai/sdk';
import { runTurn } from '../lib/conversation.js';
import { LIMITS, withRealDeps, requireUser, refreshEntitlement, monthKey, publicView } from '../lib/server.js';

const MAX_TEXT = 4000;
const MAX_HISTORY_BYTES = 400_000; // past this, start a fresh conversation (the site content carries over)

export function createChat(deps) {
  const { store, claude, now } = deps;
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await requireUser(req, res, store);
    if (!user) return;

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > MAX_TEXT) return res.status(400).json({ error: 'bad_text' });

    let site = (await store.siteByOwner(user.id)) || (await store.createSite(user.id));
    let active;
    ({ site, active } = await refreshEntitlement(site, deps));

    const month = monthKey(now);
    const monthTurns = site.usage_month === month ? site.month_turns : 0;
    if (active && monthTurns >= LIMITS.paidPerMonth) return res.status(429).json({ error: 'monthly_limit' });
    if (!active && site.free_turns >= LIMITS.free) return res.status(402).json({ error: 'free_limit' });

    let history = site.history || [];
    if (JSON.stringify(history).length > MAX_HISTORY_BYTES) history = [];

    let turn;
    try {
      turn = await runTurn({
        claude, history, text,
        mode: site.spec ? 'edit' : 'interview',
        photoCount: (site.photos || []).length,
        currentSpec: site.spec,
      });
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return res.status(503).json({ error: 'busy' });
      if (err instanceof Anthropic.APIError) {
        console.error('Claude API error', err.status, err.message);
        return res.status(502).json({ error: 'model_error' });
      }
      console.error(err);
      return res.status(500).json({ error: 'server_error' });
    }

    const chat = [...(site.chat || []), { who: 'me', text }];
    if (turn.reply) chat.push({ who: 'bot', text: turn.reply });
    const saved = await store.updateSite(site, {
      history: [...history, ...turn.added],
      chat: chat.slice(-300),
      spec: turn.spec ?? site.spec,
      usage_month: month,
      month_turns: monthTurns + 1,
      free_turns: active ? site.free_turns : site.free_turns + 1,
    });
    // Another request changed the site meanwhile (e.g. two tabs). Nothing is half-written.
    if (!saved) return res.status(409).json({ error: 'conflict' });

    return res.status(200).json({ reply: turn.reply, site: publicView(saved, active, req, now) });
  };
}

export default withRealDeps(createChat);
