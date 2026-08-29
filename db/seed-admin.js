// One-off: seeds the initial admin account. Run locally with:
//   node --env-file=.env db/seed-admin.js
// Idempotent and safe to re-run: if the username already exists, it's left
// untouched (never overwrites a password the admin has since changed).
// Uses `pg`, same reasoning as db/migrate.js — a dev-machine/CI-only script.

import { Client } from 'pg';
import { hashPassword } from '../auth.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const username = process.env.SEED_ADMIN_USERNAME || 'admin';
const password = process.env.SEED_ADMIN_PASSWORD || '1234';

const client = new Client({ connectionString });
await client.connect();
try {
  const { rows } = await client.query('select id from admin_accounts where username = $1', [username]);
  if (rows.length > 0) {
    console.log(`Admin "${username}" already exists (id=${rows[0].id}) — not touching password.`);
  } else {
    const passwordHash = await hashPassword(password);
    await client.query(
      'insert into admin_accounts (username, password_hash) values ($1, $2)',
      [username, passwordHash],
    );
    console.log(`Seeded admin account "${username}".`);
  }
} finally {
  await client.end();
}
