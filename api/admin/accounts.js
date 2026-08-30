import { requireAdmin, hashPassword } from '../../auth.js';
import { sql } from '../../db/client.js';

// Admin-only on every method, including GET — account management is
// internal, never public. Deleting a session's own account isn't blocked
// specially: the only hard rule is never deleting the last remaining
// account (that would permanently lock everyone out with no way back in
// short of a manual DB edit). Known limitation, not fixed here: an
// existing session for a since-deleted account stays valid until its
// cookie naturally expires — requireAdmin() only checks the signed
// cookie, not that the account still exists, matching auth.js's
// deliberate no-DB-dependency design (see its own header comment).

const POSTGRES_UNIQUE_VIOLATION = '23505';

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export async function listAccounts() {
  return sql`select id, username, created_at from admin_accounts order by id`;
}

export async function createAccount({ username, password }) {
  const password_hash = await hashPassword(password);
  const rows = await sql`insert into admin_accounts (username, password_hash) values (${username}, ${password_hash}) returning id, username, created_at`;
  return rows[0];
}

export async function updateAccount({ id, username, password }) {
  if (password) {
    const password_hash = await hashPassword(password);
    const rows = await sql`update admin_accounts set username = ${username}, password_hash = ${password_hash} where id = ${id} returning id, username, created_at`;
    return rows[0] ?? null;
  }
  const rows = await sql`update admin_accounts set username = ${username} where id = ${id} returning id, username, created_at`;
  return rows[0] ?? null;
}

export async function deleteAccount(id) {
  const [{ count }] = await sql`select count(*)::int as count from admin_accounts`;
  if (count <= 1) {
    return { ok: false, error: 'ต้องมีบัญชีแอดมินอย่างน้อย 1 บัญชีเสมอ ลบบัญชีสุดท้ายไม่ได้' };
  }
  await sql`delete from admin_accounts where id = ${id}`;
  return { ok: true };
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
    const accounts = await listAccounts();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(accounts));
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
    const result = await deleteAccount(body.id);
    if (!result.ok) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: result.error }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (req.method === 'POST') {
    if (!username || !password) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'ต้องระบุ username และ password' }));
      return;
    }
    try {
      const created = await createAccount({ username, password });
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(created));
    } catch (err) {
      if (err.code === POSTGRES_UNIQUE_VIOLATION) {
        res.statusCode = 409;
        res.end(JSON.stringify({ error: `ชื่อผู้ใช้ "${username}" มีอยู่แล้ว` }));
        return;
      }
      throw err;
    }
    return;
  }

  // PUT
  if (!body.id || !username) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'ต้องระบุ id และ username' }));
    return;
  }
  try {
    const updated = await updateAccount({ id: body.id, username, password: password || undefined });
    if (!updated) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'ไม่พบบัญชีนี้' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(updated));
  } catch (err) {
    if (err.code === POSTGRES_UNIQUE_VIOLATION) {
      res.statusCode = 409;
      res.end(JSON.stringify({ error: `ชื่อผู้ใช้ "${username}" มีอยู่แล้ว` }));
      return;
    }
    throw err;
  }
}
