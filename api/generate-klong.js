import { validateKlong } from '../klongValidator.js';
import { BAHT_SCHEME, RHYME_GROUPS } from '../klongRules.js';

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

function buildPrompt(topic) {
  return `ทำหน้าที่เป็นกวีเอกผู้เชี่ยวชาญด้านภาษาไทยและฉันทลักษณ์โคลงสี่สุภาพ
จงแต่งโคลงสี่สุภาพ 1 บท (4 บาท) ในหัวข้อ: "${topic}"

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

function buildRefinePrompt(topic, previousBaht, errors) {
  const errorList = errors.map(e => `- ${e.message}`).join('\n');
  return `${buildPrompt(topic)}

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
            // Structural/tonal/rhyme correctness is enforced deterministically
            // by validateKlong, not by the model — so spending time on
            // extended reasoning here only adds latency, not reliability.
            thinkingConfig: { thinkingBudget: 0 },
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
 * generateKlong(topic, apiKey)
 * Generate → validate → (if invalid) send targeted feedback → regenerate,
 * up to MAX_REFINE_ATTEMPTS. Always returns the best-scoring attempt seen,
 * never loops unbounded (Section 15).
 */
export async function generateKlong(topic, apiKey) {
  let best = null;
  let attempts = 0;
  let baht = await callGemini(apiKey, buildPrompt(topic));

  while (attempts < MAX_REFINE_ATTEMPTS) {
    attempts++;
    const validation = validateKlong(baht);
    if (!best || (validation.score ?? -1) > (best.validation.score ?? -1)) {
      best = { baht, validation };
    }
    if (validation.valid) break;
    if (attempts >= MAX_REFINE_ATTEMPTS) break;
    baht = await callGemini(apiKey, buildRefinePrompt(topic, baht, validation.errors));
  }

  return { baht: best.baht, validation: best.validation, attempts };
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
    const result = await generateKlong(topic, apiKey);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'เกิดข้อผิดพลาดในการสร้างโคลง' }));
  }
}
