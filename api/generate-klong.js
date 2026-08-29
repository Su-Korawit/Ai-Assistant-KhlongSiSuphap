import { validateKlong } from '../klongValidator.js';
import { BAHT_SCHEME, RHYME_GROUPS, MIN_ACCEPTABLE_SCORE } from '../klongRules.js';
import { sql } from '../db/client.js';

// Written against raw Node http req/res (not Vercel-specific helpers) so the
// exact same handler runs under Vercel's Node runtime in production AND
// under a Vite dev-server middleware locally (see vite.config.js) — one
// code path, no drift between dev and prod behavior.

const MAX_REFINE_ATTEMPTS = 3;
const MAX_TOPIC_LENGTH = 200;

// Up to MAX_REFINE_ATTEMPTS sequential Gemini calls can be needed; Vercel's
// default Node function timeout (10s) isn't enough. 60s is the max
// available on the Hobby plan without upgrading.
export const config = { maxDuration: 60 };

function buildSchemeDescription() {
  return BAHT_SCHEME.map((b, i) => {
    const ek = b.ek.length ? `เอกที่คำ ${b.ek.join(',')}` : 'ไม่มีเอก';
    const tho = b.tho.length ? `โทที่คำ ${b.tho.join(',')}` : 'ไม่มีโท';
    return `- บาทที่ ${i + 1}: ${b.wordCount} คำ (วรรคหน้า ${b.vakSplit} คำ + วรรคหลัง ${b.wordCount - b.vakSplit} คำ), ${ek}, ${tho}`;
  }).join('\n');
}

function buildRhymeDescription() {
  return RHYME_GROUPS.map(
    (g) => g.map(p => `บาท${p.baht + 1} คำ${p.pos}`).join(' - ')
  ).join('\n');
}

const DEFAULT_INTRO = (topic) => `ทำหน้าที่เป็นกวีเอกผู้เชี่ยวชาญด้านภาษาไทยและฉันทลักษณ์โคลงสี่สุภาพ
จงแต่งโคลงสี่สุภาพ 1 บท (4 บาท) ในหัวข้อ: "${topic}"`;

// Admin-editable via ai_settings.prompt_template (api/admin/ai-settings.js).
// Only the intro/persona line is overridable — the structural scheme
// (below) always comes from klongRules.js regardless, since that's the
// single source of truth the deterministic validateKlong checks against
// (CLAUDE.md's "Pure logic modules" rule); letting a free-text admin
// prompt override it would let the AI and the validator disagree about
// what "correct" means.
function buildIntro(topic, promptTemplate) {
  if (promptTemplate && promptTemplate.includes('{topic}')) {
    return promptTemplate.replaceAll('{topic}', topic);
  }
  return DEFAULT_INTRO(topic);
}

function buildPrompt(topic, promptTemplate) {
  return `${buildIntro(topic, promptTemplate)}

โครงสร้างฉันทลักษณ์ที่ต้องปฏิบัติตามอย่างเคร่งครัด (นับพยางค์ที่ออกเสียงจริง ไม่ใช่จำนวนคำเขียน):
${buildSchemeDescription()}

(อนุญาตให้ใช้ "คำตาย" แทนคำเอกได้)

สัมผัสบังคับระหว่างบาท (คำต้องคล้องจองสระกัน):
${buildRhymeDescription()}

ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอธิบายหรือ Markdown โดยให้ "baht" เป็นอาร์เรย์ 4 แถว
แต่ละแถวเป็นอาร์เรย์ของคำ โดยแต่ละช่องมี "คำเดียว" (หนึ่งพยางค์) เท่านั้น ตรงตามจำนวนคำของบาทนั้น:
{
  "baht": [
    ["คำ1","คำ2","คำ3","คำ4","คำ5","คำ6","คำ7"],
    ["คำ1","คำ2","คำ3","คำ4","คำ5","คำ6","คำ7"],
    ["คำ1","คำ2","คำ3","คำ4","คำ5","คำ6","คำ7"],
    ["คำ1","คำ2","คำ3","คำ4","คำ5","คำ6","คำ7","คำ8","คำ9"]
  ]
}`;
}

function buildRefinePrompt(topic, previousBaht, errors, promptTemplate) {
  const errorList = errors.map(e => `- ${e.message}`).join('\n');
  return `${buildPrompt(topic, promptTemplate)}

ความพยายามครั้งก่อนของคุณคือ:
${JSON.stringify({ baht: previousBaht })}

แต่มีข้อผิดพลาดฉันทลักษณ์ดังนี้ที่ต้องแก้ไข (แก้เฉพาะจุดที่ผิด พยายามคงคำอื่นที่ถูกต้องไว้):
${errorList}

ส่งกลับ JSON รูปแบบเดิมที่แก้ไขแล้วเท่านั้น`;
}

async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  let response;
  let retries = 3;
  while (retries > 0) {
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            // Structural/tonal/rhyme correctness is still enforced
            // deterministically by validateKlong, never by the model — but
            // measured data showed thinkingBudget 0 wasn't reliable enough:
            // avg best-of-3 score was only 61.7 (frequently below
            // MIN_ACCEPTABLE_SCORE), worst-case total latency 6.1s. Budget
            // 2048 measured avg score 79.3, worst-case total 25.8s — still
            // well under Vercel's 60s cap. Re-measure if you revisit this;
            // don't assume these numbers hold across model versions.
            thinkingConfig: { thinkingBudget: 2048 },
          },
        }),
      });
      if (response.ok) break;
    } catch {
      // network error — fall through to retry
    }
    retries--;
    if (retries > 0) await new Promise(r => setTimeout(r, 1000));
  }

  if (!response || !response.ok) throw new Error('ไม่สามารถเชื่อมต่อกับ AI ได้ในขณะนี้');

  const data = await response.json();
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error('AI ไม่ได้ส่งข้อมูลกลับมา');

  const cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch {
    throw new Error('AI ส่งข้อมูลที่ไม่ใช่ JSON ที่ถูกต้อง');
  }

  if (!Array.isArray(parsed.baht) || parsed.baht.length !== 4) {
    throw new Error('รูปแบบโคลงที่ได้ไม่ถูกต้อง');
  }
  return parsed.baht;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

/**
 * generateKlong(topic, apiKey, promptTemplate)
 * Generate → validate → (if invalid) send targeted feedback → regenerate,
 * up to MAX_REFINE_ATTEMPTS. Always returns the best-scoring attempt seen,
 * never loops unbounded (Section 15).
 *
 * `promptTemplate` is the admin-editable intro override (ai_settings table,
 * see buildIntro's comment) — optional, falls back to the default persona
 * intro when omitted or missing a {topic} placeholder.
 *
 * `meetsThreshold` tells the caller whether that best attempt is good
 * enough to present as a finished poem (score >= MIN_ACCEPTABLE_SCORE) —
 * the attempt and its validation are still returned either way, so the
 * caller can show the user how close it got rather than just a bare
 * failure (Rule 3: the AI never overrides validateKlong's verdict).
 */
export async function generateKlong(topic, apiKey, promptTemplate) {
  let best = null;
  let attempts = 0;
  let baht = await callGemini(apiKey, buildPrompt(topic, promptTemplate));

  while (attempts < MAX_REFINE_ATTEMPTS) {
    attempts++;
    const validation = validateKlong(baht);
    if (!best || (validation.score ?? -1) > (best.validation.score ?? -1)) {
      best = { baht, validation };
    }
    if (validation.valid) break;
    if (attempts >= MAX_REFINE_ATTEMPTS) break;
    baht = await callGemini(apiKey, buildRefinePrompt(topic, baht, validation.errors, promptTemplate));
  }

  const meetsThreshold = (best.validation.score ?? 0) >= MIN_ACCEPTABLE_SCORE;
  return { baht: best.baht, validation: best.validation, attempts, meetsThreshold };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'ไม่พบ GEMINI_API_KEY บนเซิร์ฟเวอร์' }));
    return;
  }

  const [aiSettings] = await sql`select ai_enabled, prompt_template from ai_settings where id = 1`;
  if (aiSettings && !aiSettings.ai_enabled) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'ปิดใช้งานผู้ช่วย AI อยู่ในขณะนี้' }));
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

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (!topic || topic.length > MAX_TOPIC_LENGTH) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: `กรุณาระบุหัวข้อ (1-${MAX_TOPIC_LENGTH} ตัวอักษร)` }));
    return;
  }

  try {
    const result = await generateKlong(topic, apiKey, aiSettings?.prompt_template);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'เกิดข้อผิดพลาดในการสร้างโคลง' }));
  }
}
