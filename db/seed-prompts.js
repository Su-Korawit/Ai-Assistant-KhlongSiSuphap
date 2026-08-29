// One-off: seeds the 3 original hardcoded prompt categories/themes
// (previously THEMES in klongPrompts.js). Run locally with:
//   node --env-file=.env db/seed-prompts.js
// Idempotent — skips entirely if prompt_categories already has any rows,
// so it never overwrites an admin's edits.

import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const THEMES = [
  {
    category: 'สิ่งแวดล้อม',
    prompts: [
      'ฝุ่น PM2.5 กับลมหายใจคนเมือง',
      'ขยะพลาสติกในทะเลไทย',
      'ป่าไม้ที่หายไปกับน้ำท่วมที่มาเยือน',
      'โลกร้อน ฤดูกาลที่แปรปรวน',
    ],
  },
  {
    category: 'โลกออนไลน์',
    prompts: [
      'ชีวิตที่ถูกวัดด้วยยอดไลก์',
      'ข่าวปลอมที่แชร์เร็วกว่าความจริง',
      'มิตรภาพในหน้าจอกับความเหงาที่แท้จริง',
      'เวลาที่หายไปกับสไลด์นิ้วไม่รู้จบ',
    ],
  },
  {
    category: 'สุขภาพจิตวัยรุ่น',
    prompts: [
      'ความเครียดจากการเปรียบเทียบตัวเองกับผู้อื่น',
      'แรงกดดันเรื่องคะแนนและอนาคต',
      'การพูดคุยกับคนในบ้านที่ห่างไกลกันขึ้นทุกวัน',
      'คุณค่าของตัวเองที่ไม่ต้องรอใครมายืนยัน',
    ],
  },
];

const client = new Client({ connectionString });
await client.connect();
try {
  const { rows } = await client.query('select count(*)::int as count from prompt_categories');
  if (rows[0].count > 0) {
    console.log(`prompt_categories already has ${rows[0].count} row(s) — not touching it.`);
  } else {
    for (let i = 0; i < THEMES.length; i++) {
      const theme = THEMES[i];
      const { rows: [category] } = await client.query(
        'insert into prompt_categories (name, sort_order) values ($1, $2) returning id',
        [theme.category, i],
      );
      for (const text of theme.prompts) {
        await client.query('insert into prompts (category_id, text) values ($1, $2)', [category.id, text]);
      }
    }
    console.log(`Seeded ${THEMES.length} categories, ${THEMES.reduce((n, t) => n + t.prompts.length, 0)} prompts.`);
  }
} finally {
  await client.end();
}
