import { requireAdmin } from '../../auth.js';
import { sql } from '../../db/client.js';

// Admin-only on every method, including GET — unlike challenges.js/
// prompts.js, nothing here has a public consumer at all (this is an
// internal admin scratchpad for reporting words the segmenter/validator
// still gets wrong, not app content). `linked_irregular_syllable` is a
// free-text note, not a live link into irregularSyllables.js — that file
// is source code imported by thaiSyllable.js, not DB-backed, so nothing
// here can edit it directly; a developer (or Claude) still applies the fix
// as a code change, the same TDD process as Phase 1. This field just gives
// that report a place to land instead of living only in a comment body.

const VALID_STATUSES = ['open', 'resolved'];

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export async function listComments() {
  return sql`
    select c.id, c.body, c.linked_irregular_syllable, c.status, c.created_at, a.username as admin_username
    from algorithm_docs_comments c
    join admin_accounts a on a.id = c.admin_id
    order by c.created_at desc
  `;
}

export async function createComment({ admin_id, body, linked_irregular_syllable }) {
  const rows = await sql`
    insert into algorithm_docs_comments (admin_id, body, linked_irregular_syllable)
    values (${admin_id}, ${body}, ${linked_irregular_syllable ?? null})
    returning id, body, linked_irregular_syllable, status, created_at
  `;
  return rows[0];
}

export async function updateCommentStatus({ id, status }) {
  const rows = await sql`
    update algorithm_docs_comments set status = ${status} where id = ${id}
    returning id, body, linked_irregular_syllable, status, created_at
  `;
  return rows[0] ?? null;
}

export async function deleteComment(id) {
  await sql`delete from algorithm_docs_comments where id = ${id}`;
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const comments = await listComments();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(comments));
    return;
  }

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
    await deleteComment(body.id);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'PUT') {
    if (!body.id || !VALID_STATUSES.includes(body.status)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: `ต้องระบุ id และ status ที่ถูกต้อง (${VALID_STATUSES.join('/')})` }));
      return;
    }
    const updated = await updateCommentStatus({ id: body.id, status: body.status });
    if (!updated) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'ไม่พบความเห็นนี้' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(updated));
    return;
  }

  // POST — admin_id always comes from the verified session, never the
  // request body, so a caller can't attribute a comment to someone else.
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'ต้องระบุ body' }));
    return;
  }
  const linked = typeof body.linked_irregular_syllable === 'string' ? body.linked_irregular_syllable.trim() : '';
  const created = await createComment({
    admin_id: session.adminId,
    body: text,
    linked_irregular_syllable: linked || null,
  });
  res.statusCode = 201;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(created));
}
