import { requireAdmin } from '../auth.js';
import { sql } from '../db/client.js';

// One combined handler, same reasoning as validator-settings.js: nothing
// here is sensitive, so GET is public and only the mutating methods need
// requireAdmin(). No dynamic [id].js route — id travels in the request
// body for PUT/DELETE instead, so the same file works identically under
// Vite's dev middleware (prefix-matched) and Vercel's exact-file routing
// in production (see vite.config.js's API_ROUTES comment).

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export async function listChallenges() {
  return sql`select id, title, description, segments, badge, sort_order from challenges order by sort_order, id`;
}

export async function createChallenge({ title, description, segments, badge, sort_order }) {
  const rows = await sql`
    insert into challenges (title, description, segments, badge, sort_order)
    values (${title}, ${description ?? null}, ${JSON.stringify(segments)}, ${badge ?? null}, ${sort_order ?? 0})
    returning id, title, description, segments, badge, sort_order
  `;
  return rows[0];
}

export async function updateChallenge({ id, title, description, segments, badge, sort_order }) {
  const rows = await sql`
    update challenges
    set title = ${title}, description = ${description ?? null}, segments = ${JSON.stringify(segments)},
        badge = ${badge ?? null}, sort_order = ${sort_order ?? 0}, updated_at = now()
    where id = ${id}
    returning id, title, description, segments, badge, sort_order
  `;
  return rows[0] ?? null;
}

export async function deleteChallenge(id) {
  await sql`delete from challenges where id = ${id}`;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const challenges = await listChallenges();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(challenges));
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
    await deleteChallenge(body.id);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const segments = Array.isArray(body.segments) ? body.segments : null;
  if (!title || !segments) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'ต้องระบุ title และ segments (array)' }));
    return;
  }
  const payload = {
    title,
    description: typeof body.description === 'string' ? body.description : null,
    segments,
    badge: typeof body.badge === 'string' ? body.badge : null,
    sort_order: Number.isFinite(body.sort_order) ? body.sort_order : 0,
  };

  if (req.method === 'POST') {
    const created = await createChallenge(payload);
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
  const updated = await updateChallenge({ id: body.id, ...payload });
  if (!updated) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'ไม่พบด่านนี้' }));
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(updated));
}
