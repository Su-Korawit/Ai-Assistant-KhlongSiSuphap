import { requireAdmin } from '../auth.js';
import { sql } from '../db/client.js';

// No GET here — categories are read as part of the nested shape
// /api/prompts.js's GET already returns; this file is purely the admin
// mutation surface (create/rename/reorder/delete a category). Deleting a
// category cascades to its prompts (prompts.category_id references
// prompt_categories(id) on delete cascade — db/schema.sql).

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export async function createCategory({ name, sort_order }) {
  const rows = await sql`insert into prompt_categories (name, sort_order) values (${name}, ${sort_order ?? 0}) returning id, name, sort_order`;
  return rows[0];
}

export async function updateCategory({ id, name, sort_order }) {
  const rows = await sql`update prompt_categories set name = ${name}, sort_order = ${sort_order ?? 0} where id = ${id} returning id, name, sort_order`;
  return rows[0] ?? null;
}

export async function deleteCategory(id) {
  await sql`delete from prompt_categories where id = ${id}`;
}

export default async function handler(req, res) {
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
    await deleteCategory(body.id);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'ต้องระบุ name' }));
    return;
  }
  const sortOrder = Number.isFinite(body.sort_order) ? body.sort_order : 0;

  if (req.method === 'POST') {
    const created = await createCategory({ name, sort_order: sortOrder });
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(created));
    return;
  }

  // PUT
  if (!body.id) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'ต้องระบุ id' }));
    return;
  }
  const updated = await updateCategory({ id: body.id, name, sort_order: sortOrder });
  if (!updated) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'ไม่พบหมวดนี้' }));
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(updated));
}
