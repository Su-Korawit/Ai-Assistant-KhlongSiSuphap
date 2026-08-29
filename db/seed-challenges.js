// One-off: seeds the 3 original hardcoded challenge levels (previously
// CHALLENGE_LEVELS in App.jsx). Run locally with:
//   node --env-file=.env db/seed-challenges.js
// Idempotent — skips entirely if the table already has any rows, so it
// never overwrites an admin's edits.

import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const LEVELS = [
  {
    title: 'ด่านที่ ๑ · แต่งวรรคเดียว',
    description: 'ฝึกกับวรรคหน้าของบาทที่ ๑ (๕ คำ) เริ่มจากจุดที่เล็กที่สุดก่อน',
    segments: [{ bahtIndex: 0, count: 5 }],
    badge: '🌱 นักฝึกวรรคแรก',
    sort_order: 0,
  },
  {
    title: 'ด่านที่ ๒ · แต่งครบหนึ่งบาท',
    description: 'ฝึกบาทที่ ๑ ให้ครบทั้ง ๗ คำ ทั้งวรรคหน้าและวรรคหลัง',
    segments: [{ bahtIndex: 0, count: 7 }],
    badge: '🪶 นักแต่งหนึ่งบาท',
    sort_order: 1,
  },
  {
    title: 'ด่านที่ ๓ · แต่งเต็มบท',
    description: 'ท้าทายที่สุด: แต่งครบทั้ง ๔ บาท พร้อมตรวจสัมผัสระหว่างบท',
    segments: [
      { bahtIndex: 0, count: 7 },
      { bahtIndex: 1, count: 7 },
      { bahtIndex: 2, count: 7 },
      { bahtIndex: 3, count: 9 },
    ],
    badge: '👑 เจ้าแห่งโคลงสี่สุภาพ',
    sort_order: 2,
  },
];

const client = new Client({ connectionString });
await client.connect();
try {
  const { rows } = await client.query('select count(*)::int as count from challenges');
  if (rows[0].count > 0) {
    console.log(`challenges table already has ${rows[0].count} row(s) — not touching it.`);
  } else {
    for (const level of LEVELS) {
      await client.query(
        'insert into challenges (title, description, segments, badge, sort_order) values ($1, $2, $3, $4, $5)',
        [level.title, level.description, JSON.stringify(level.segments), level.badge, level.sort_order],
      );
    }
    console.log(`Seeded ${LEVELS.length} challenge levels.`);
  }
} finally {
  await client.end();
}
