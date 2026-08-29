import { requireAdmin } from '../auth.js';
import { sql } from '../db/client.js';

// GET is the public shape App.jsx's PromptLibrary/Challenge consume
// directly — categories with their prompts nested, matching the old
// klongPrompts.js THEMES shape closely so App.jsx's changes stay small.
// POST/PUT/DELETE operate on individual prompt rows and require an admin
// session; category management (create/rename/delete a category) lives in
// prompt-categories.js.

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export async function listPromptsGrouped() {
  const categories = await sql`select id, name, sort_order from prompt_categories order by sort_order, id`;
  const prompts = await sql`select id, category_id, text from prompts order by id`;
  return categories.map((c) => ({
    id: c.id,
    category: c.name,
    sort_order: c.sort_order,
    prompts: prompts.filter((p) => p.category_id === c.id).map((p) => ({ id: p.id, text: p.text })),
  }));
}

export async function createPrompt({ category_id, text }) {
  const rows = await sql`insert into prompts (category_id, text) values (${category_id}, ${text}) returning id, category_id, text`;
  return rows[0];
}

export async function updatePrompt({ id, text }) {
  const rows = await sql`update prompts set text = ${text} where id = ${id} returning id, category_id, text`;
  return rows[0] ?? null;
}

export async function deletePrompt(id) {
  await sql`delete from prompts where id = ${id}`;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const grouped = await listPromptsGrouped();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(grouped));
    return;
  }

  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

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

  if (req.method === 'DELETE') {
    if (!body.id) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'ต้องระบุ id' }));
      return;
    }
    await deletePrompt(body.id);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';

  if (req.method === 'POST') {
    if (!body.category_id || !text) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'ต้องระบุ category_id และ text' }));
      return;
    }
    const created = await createPrompt({ category_id: body.category_id, text });
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(created));
    return;
  }

  // PUT
  if (!body.id || !text) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'ต้องระบุ id และ text' }));
    return;
  }
  const updated = await updatePrompt({ id: body.id, text });
  if (!updated) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'ไม่พบโจทย์นี้' }));
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(updated));
}
