// POST /api/chat
// Body: { history: MessageParam[], text: string, photos: number, hasSite: boolean, subscriptionId?: string }
// Returns: { messages: MessageParam[] (append these to history as-is), spec: object|null, reply: string }
//
// The server is stateless: the browser keeps the conversation and sends it back
// every turn. Model, system prompt and tools are fixed here and never taken from
// the request. History is append-only (thinking blocks are passed back unchanged).

import Anthropic from '@anthropic-ai/sdk';
import { SITE_SPEC_SCHEMA, normalizeSpec } from '../lib/site-spec.js';
import { isSubscriptionActive, paddleConfigured } from '../lib/paddle.js';
import { SYSTEM_PROMPT } from '../lib/prompt.js';

const MODEL = 'claude-opus-5-5';
const MAX_HISTORY = 160;
const MAX_HISTORY_BYTES = 600_000;
const MAX_TEXT = 4000;
const MAX_INTERVIEW_TURNS = 30;
const MAX_LOOPS = 4;

const TOOLS = [
  {
    name: 'update_site',
    description: 'Replace the whole site content with this version. Always send every field; use empty strings or empty arrays for anything unknown or not wanted.',
    strict: true,
    input_schema: SITE_SPEC_SCHEMA,
  },
];

const ALLOWED_USER_BLOCKS = new Set(['text', 'tool_result']);

// Only text and tool results may come from the browser on user/system turns:
// no images or documents (cost), and no unexpected shapes.
function validHistory(history) {
  if (!Array.isArray(history) || history.length > MAX_HISTORY) return false;
  if (JSON.stringify(history).length > MAX_HISTORY_BYTES) return false;
  for (const m of history) {
    if (!m || typeof m !== 'object') return false;
    if (!['user', 'assistant', 'system'].includes(m.role)) return false;
    if (m.role === 'assistant') {
      if (!Array.isArray(m.content)) return false;
      continue;
    }
    if (typeof m.content === 'string') continue;
    if (!Array.isArray(m.content)) return false;
    for (const b of m.content) {
      if (!b || !ALLOWED_USER_BLOCKS.has(b.type)) return false;
      if (b.type === 'tool_result' && typeof b.content !== 'string') return false;
    }
  }
  return true;
}

function countOwnerTurns(history) {
  return history.filter((m) => m.role === 'user' && typeof m.content === 'string').length;
}

function textOf(messages) {
  return messages
    .filter((m) => m.role === 'assistant')
    .flatMap((m) => m.content)
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n')
    .trim();
}

export function createHandler(getClient, deps = {}) {
  const checkSub = deps.isSubscriptionActive ?? isSubscriptionActive;
  const billingReady = deps.paddleConfigured ?? paddleConfigured;

  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    const { history = [], text, photos = 0, hasSite = false, subscriptionId } = req.body ?? {};
    if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT) {
      return res.status(400).json({ error: 'bad_text' });
    }
    if (!validHistory(history)) return res.status(400).json({ error: 'bad_history' });

    // A site exists once update_site has been called in this conversation. The
    // browser's flag is only a hint; the history decides (a client that strips
    // its history also loses the model's memory of the site).
    const builtInHistory = history.some((m) => m.role === 'assistant'
      && m.content.some((b) => b?.type === 'tool_use' && b.name === 'update_site'));
    const mode = hasSite || builtInHistory ? 'edit' : 'interview';
    if (mode === 'edit') {
      const freeEdits = process.env.ALLOW_FREE_EDITS === '1';
      if (!freeEdits) {
        if (!billingReady()) return res.status(402).json({ error: 'billing_not_configured' });
        let active = false;
        try {
          active = await checkSub(subscriptionId);
        } catch (err) {
          console.error('paddle check failed', err);
          return res.status(503).json({ error: 'billing_unavailable' });
        }
        if (!active) return res.status(402).json({ error: 'subscription_required' });
      }
    } else if (countOwnerTurns(history) >= MAX_INTERVIEW_TURNS) {
      return res.status(429).json({ error: 'interview_limit' });
    }

    const photoCount = Math.max(0, Math.min(20, Number(photos) || 0));
    const added = [
      { role: 'user', content: text.trim() },
      { role: 'system', content: `Context: mode=${mode}; photos uploaded=${photoCount}.` },
    ];

    const client = getClient();
    let spec = null;
    let stopReason = null;

    try {
      for (let i = 0; i < MAX_LOOPS; i++) {
        const response = await client.beta.messages.create({
          model: MODEL,
          max_tokens: 16000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'medium' },
          cache_control: { type: 'ephemeral' },
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: [...history, ...added],
        });
        stopReason = response.stop_reason;
        console.log('usage', JSON.stringify(response.usage));
        added.push({ role: 'assistant', content: response.content });

        if (stopReason === 'refusal') break;
        if (stopReason === 'pause_turn') continue;

        const toolUses = response.content.filter((b) => b.type === 'tool_use');
        if (toolUses.length === 0) break;

        const results = toolUses.map((tu) => {
          if (tu.name !== 'update_site') {
            return { type: 'tool_result', tool_use_id: tu.id, content: `Unknown tool ${tu.name}.`, is_error: true };
          }
          const normalized = normalizeSpec(tu.input);
          spec = normalized.spec;
          const note = normalized.warnings.length ? ` Notes: ${normalized.warnings.join('; ')}.` : '';
          return { type: 'tool_result', tool_use_id: tu.id, content: `Site updated and shown to the owner.${note}` };
        });
        added.push({ role: 'user', content: results });
      }
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'busy' });
      if (err instanceof Anthropic.BadRequestError) {
        console.error('bad request to Claude', err.message);
        return res.status(400).json({ error: 'model_bad_request' });
      }
      if (err instanceof Anthropic.APIError) {
        console.error('Claude API error', err.status, err.message);
        return res.status(502).json({ error: 'model_error' });
      }
      console.error(err);
      return res.status(500).json({ error: 'server_error' });
    }

    let reply = textOf(added);
    if (stopReason === 'refusal') reply = reply || 'לא הצלחתי לטפל בבקשה הזו. אפשר לנסח אותה אחרת?';
    if (!reply && spec) reply = 'עדכנתי את האתר.';

    return res.status(200).json({ messages: added, spec, reply });
  };
}

export default createHandler(() => new Anthropic());
