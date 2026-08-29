import { requireAdmin } from '../auth.js';
import { sql } from '../db/client.js';

// One combined handler, not a public+admin split like ai-settings.js —
// there's nothing sensitive in this table (a single flag, no prompt-style
// internal text) to hide from the public GET, so a separate admin-only
// read endpoint would just be an extra file with no real purpose.

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export async function getValidatorSettings() {
  const rows = await sql`select allow_tone_penalty from validator_settings where id = 1`;
  return { allow_tone_penalty: rows[0] ? rows[0].allow_tone_penalty : false };
}

export async function updateValidatorSettings({ allow_tone_penalty }) {
  const rows = await sql`
    update validator_settings
    set allow_tone_penalty = ${allow_tone_penalty}, updated_at = now()
    where id = 1
    returning allow_tone_penalty
  `;
  return rows[0];
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const settings = await getValidatorSettings();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(settings));
    return;
  }

  if (req.method === 'PUT') {
    const session = await requireAdmin(req, res);
    if (!session) return;

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'คำขอไม่ถูกต้อง (invalid JSON)' }));
      return;
    }

    const updated = await updateValidatorSettings({ allow_tone_penalty: Boolean(body.allow_tone_penalty) });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(updated));
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}
