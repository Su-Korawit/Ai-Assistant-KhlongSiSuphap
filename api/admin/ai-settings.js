import { requireAdmin } from '../../auth.js';
import { sql } from '../../db/client.js';

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export async function getAiSettings() {
  const rows = await sql`select ai_enabled, ai_autofill_enabled, prompt_template from ai_settings where id = 1`;
  return rows[0];
}

export async function updateAiSettings({ ai_enabled, ai_autofill_enabled, prompt_template }) {
  const rows = await sql`
    update ai_settings
    set ai_enabled = ${ai_enabled},
        ai_autofill_enabled = ${ai_autofill_enabled},
        prompt_template = ${prompt_template},
        updated_at = now()
    where id = 1
    returning ai_enabled, ai_autofill_enabled, prompt_template
  `;
  return rows[0];
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const settings = await getAiSettings();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(settings));
    return;
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'คำขอไม่ถูกต้อง (invalid JSON)' }));
      return;
    }

    const promptTemplate = typeof body.prompt_template === 'string' ? body.prompt_template.trim() : '';
    const updated = await updateAiSettings({
      ai_enabled: Boolean(body.ai_enabled),
      ai_autofill_enabled: Boolean(body.ai_autofill_enabled),
      prompt_template: promptTemplate || null,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(updated));
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}
