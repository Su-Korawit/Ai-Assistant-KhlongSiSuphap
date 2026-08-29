/**
 * Admin auth primitives: password hashing and the iron-session config both
 * consumed by the api/admin/* handlers. No HTTP/DB dependency on purpose —
 * same "pure logic, thin handler" split as validateKlong/generateKlong.
 */
import bcrypt from 'bcryptjs';
import { getIronSession } from 'iron-session';

const SALT_ROUNDS = 10;

export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

export const ADMIN_SESSION_COOKIE = 'admin_session';

// A function, not a static object: `password` (the cookie-encryption key,
// not a user password) comes from SESSION_SECRET — same not-VITE_-prefixed
// / process.env.* treatment as GEMINI_API_KEY and DATABASE_URL (see
// CLAUDE.md's env var section) — and must be read at call time. A plain
// object literal would capture process.env.SESSION_SECRET once at
// whatever moment this module first happens to be imported, which is
// fragile: anything that imports auth.js transitively before the env var
// is loaded (a different import order, a test importing it indirectly)
// would silently freeze in an empty password forever.
export const getSessionOptions = () => ({
  password: process.env.SESSION_SECRET,
  cookieName: ADMIN_SESSION_COOKIE,
  cookieOptions: {
    // iron-session defaults `secure: true`, which drops the cookie over
    // plain http:// — Vite's local dev server isn't HTTPS, so this must be
    // false there. Vercel sets NODE_ENV=production at runtime for deployed
    // functions; `vite dev` sets it to "development".
    secure: process.env.NODE_ENV === 'production',
  },
});

/**
 * requireAdmin(req, res)
 * Guard for every protected api/admin/* route beyond login/logout/session
 * itself. Writes a 401 and returns null when there's no valid session —
 * the caller's handler should `if (!session) return;` right after calling
 * this and do nothing else. Returns the live session object (not just a
 * boolean) so callers that need session.adminId/username don't have to
 * call getIronSession a second time.
 */
export async function requireAdmin(req, res) {
  const session = await getIronSession(req, res, getSessionOptions());
  if (!session.adminId) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'ต้องเข้าสู่ระบบแอดมิน' }));
    return null;
  }
  return session;
}
