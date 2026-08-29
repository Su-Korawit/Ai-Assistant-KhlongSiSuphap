import { getIronSession } from 'iron-session';
import { verifyPassword, getSessionOptions } from '../../auth.js';
import { sql } from '../../db/client.js';

// Written against raw Node http req/res, same dev/prod-parity reasoning as
// api/generate-klong.js (see that file's header comment and vite.config.js).

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

/**
 * authenticateAdmin(username, password)
 * DB lookup + password check, no HTTP/session concerns — kept separate from
 * the handler below so it's testable without faking req/res (same split as
 * generateKlong/handler in api/generate-klong.js).
 */
export async function authenticateAdmin(username, password) {
  if (!username || !password) return { ok: false };

  const rows = await sql`select id, username, password_hash from admin_accounts where username = ${username}`;
  const admin = rows[0];
  if (!admin) return { ok: false };

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) return { ok: false };

  return { ok: true, admin: { id: admin.id, username: admin.username } };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
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

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const result = await authenticateAdmin(username, password);
  if (!result.ok) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }));
    return;
  }

  const session = await getIronSession(req, res, getSessionOptions());
  session.adminId = result.admin.id;
  session.username = result.admin.username;
  await session.save();

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ username: result.admin.username }));
}
