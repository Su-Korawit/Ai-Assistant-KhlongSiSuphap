import { sql } from '../db/client.js';

/**
 * getPublicAiSettings()
 * Only the toggle flags the public app needs to decide whether to show the
 * AI-assist button and the autofill button — never prompt_template, which
 * is internal to how the server builds the Gemini prompt.
 */
export async function getPublicAiSettings() {
  const rows = await sql`select ai_enabled, ai_autofill_enabled from ai_settings where id = 1`;
  const row = rows[0];
  return {
    ai_enabled: row ? row.ai_enabled : true,
    ai_autofill_enabled: row ? row.ai_autofill_enabled : true,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const settings = await getPublicAiSettings();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(settings));
}
