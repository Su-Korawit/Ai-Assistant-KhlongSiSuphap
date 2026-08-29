// One-off schema migration for the Neon database. Run locally with:
//   DATABASE_URL=... npm run db:migrate
// Uses `pg` (plain TCP) rather than the @neondatabase/serverless HTTP driver
// on purpose — this only ever runs from a developer machine or CI, never
// inside a Vercel serverless function, so there's no connection-pooling
// constraint to design around, and `pg` runs the whole schema.sql as one
// multi-statement script without extra plumbing. The serverless HTTP driver
// is for the admin API routes' runtime queries (added alongside those).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy the Neon connection string from the Vercel project\'s Storage tab into your shell env (or .env) and re-run.');
  process.exit(1);
}

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
const client = new Client({ connectionString });

await client.connect();
try {
  await client.query(schema);
  console.log('Schema applied.');
} finally {
  await client.end();
}
