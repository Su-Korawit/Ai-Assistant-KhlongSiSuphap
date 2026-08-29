// Runtime DB access for the api/admin/* serverless functions — the HTTP-based
// driver, not `pg`'s TCP pool. Vercel serverless functions are short-lived
// and can spin up many concurrent instances; a TCP connection pool doesn't
// survive or share across invocations the way it would on a long-running
// server, so it either exhausts Neon's connection limit or reconnects on
// every call anyway. The HTTP driver has no connection to hold open in the
// first place. (db/migrate.js and db/seed-admin.js use `pg` instead — those
// only ever run once from a developer machine or CI, where this constraint
// doesn't apply.)
import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL);
