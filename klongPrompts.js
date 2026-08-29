/**
 * คลังโจทย์ประเด็นร่วมสมัย — ported from the static-HTML prototype's
 * js/prompts.js. Pure data + helpers, no React/DOM dependency (same rule
 * as thaiSyllable.js/klongRules.js/klongValidator.js — see CLAUDE.md).
 */

export const THEMES = [
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

export function getAllCategories() {
  return THEMES.map((t) => t.category);
}

export function getPromptsByCategory(category) {
  const found = THEMES.find((t) => t.category === category);
  return found ? found.prompts.slice() : [];
}

export function getRandomPrompt(category) {
  const pool = category ? getPromptsByCategory(category) : THEMES.flatMap((t) => t.prompts);
  if (!pool.length) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRandomTheme() {
  const t = THEMES[Math.floor(Math.random() * THEMES.length)];
  return { category: t.category, prompt: getRandomPrompt(t.category) };
}
