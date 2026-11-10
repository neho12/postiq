// One owner turn of the site-building conversation with Claude.
// History is append-only: every message Claude returns (thinking blocks,
// tool calls, fallback blocks) is stored and sent back unchanged.

import { SITE_SPEC_SCHEMA, normalizeSpec } from './site-spec.js';
import { SYSTEM_PROMPT } from './prompt.js';

export const MODEL = 'claude-opus-5-5';
const MAX_LOOPS = 4;

const TOOLS = [
  {
    name: 'update_site',
    description: 'Replace the whole site content with this version. Always send every field; use empty strings or empty arrays for anything unknown or not wanted.',
    strict: true,
    input_schema: SITE_SPEC_SCHEMA,
  },
];

// Returns { added, spec, reply, refused }. `added` is what to append to history.
// Errors from the Claude API propagate to the caller.
export async function runTurn({ claude, history, text, mode, photoCount, currentSpec }) {
  let context = `Context: mode=${mode}; photos uploaded=${photoCount}.`;
  // A fresh conversation about an existing site (history was reset): give Claude the current content.
  if (history.length === 0 && currentSpec) context += `\nThe site content right now (JSON): ${JSON.stringify(currentSpec)}`;

  const added = [
    { role: 'user', content: text },
    { role: 'system', content: context },
  ];
  let spec = null;
  let stopReason = null;

  for (let i = 0; i < MAX_LOOPS; i++) {
    const response = await claude.beta.messages.create({
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

    added.push({
      role: 'user',
      content: toolUses.map((tu) => {
        if (tu.name !== 'update_site') {
          return { type: 'tool_result', tool_use_id: tu.id, content: `Unknown tool ${tu.name}.`, is_error: true };
        }
        const normalized = normalizeSpec(tu.input);
        spec = normalized.spec;
        const note = normalized.warnings.length ? ` Notes: ${normalized.warnings.join('; ')}.` : '';
        return { type: 'tool_result', tool_use_id: tu.id, content: `Site updated and shown to the owner.${note}` };
      }),
    });
  }

  let reply = added
    .filter((m) => m.role === 'assistant')
    .flatMap((m) => m.content)
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n')
    .trim();
  const refused = stopReason === 'refusal';
  if (refused) reply = reply || 'לא הצלחתי לטפל בבקשה הזו. אפשר לנסח אותה אחרת?';
  if (!reply && spec) reply = 'עדכנתי את האתר.';
  return { added, spec, reply, refused };
}
