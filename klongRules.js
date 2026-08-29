/**
 * ฉันทลักษณ์โคลงสี่สุภาพ (1 บท = 4 บาท = 30 คำ ไม่รวมคำสร้อย)
 *
 * Positions verified against the canonical example (ลิลิตพระลอ):
 *   "เสียงลือเสียงเล่าอ้าง อันใด" — เล่า (คำที่ 4) carries ไม้เอก, อ้าง (คำที่ 5)
 *   carries ไม้โท, confirming เอก@4 / โท@5 for บาทที่ ๑'s วรรคหน้า.
 *
 * The app's own prior BAAT_CONFIG had เอก/โท swapped and at wrong positions
 * for บาท 2-4 — this file corrects that against the verified scheme.
 */

// Each baht: total word count, where the front/back clause split falls
// (1-indexed, inclusive of the last front-clause word), and which
// 1-indexed positions (counted across the whole baht) require เอก/โท.
export const BAHT_SCHEME = [
  { label: 'บาทที่ ๑', wordCount: 7, vakSplit: 5, ek: [4], tho: [5], soiAfter: true },
  { label: 'บาทที่ ๒', wordCount: 7, vakSplit: 5, ek: [2, 6], tho: [7], soiAfter: false },
  { label: 'บาทที่ ๓', wordCount: 7, vakSplit: 5, ek: [3, 7], tho: [], soiAfter: true },
  { label: 'บาทที่ ๔', wordCount: 9, vakSplit: 5, ek: [2, 6], tho: [5, 7], soiAfter: false },
];

// สัมผัสระหว่างบท: groups of {baht, pos} (0-indexed baht, 1-indexed pos)
// that must all rhyme with each other.
export const RHYME_GROUPS = [
  [{ baht: 0, pos: 7 }, { baht: 1, pos: 5 }, { baht: 2, pos: 5 }],
  [{ baht: 1, pos: 7 }, { baht: 3, pos: 5 }],
];

export const TOTAL_WORDS = BAHT_SCHEME.reduce((sum, b) => sum + b.wordCount, 0); // 30

// Below this, generateKlong() must not present its best attempt as a
// finished poem — see api/generate-klong.js's meetsThreshold. Chosen
// alongside raising thinkingConfig.thinkingBudget to 2048: measured
// avg best-of-3 score was 61.7 at thinkingBudget 0 (would fail this often)
// vs 79.3 at 2048 (clears it comfortably). Re-measure before changing
// either value independently — they were tuned together.
export const MIN_ACCEPTABLE_SCORE = 70;
