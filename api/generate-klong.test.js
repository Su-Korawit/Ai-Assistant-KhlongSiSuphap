import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fakeReq, fakeRes } from '../httpTestUtils.js';

vi.mock('../db/client.js', () => ({ sql: vi.fn() }));

const { sql } = await import('../db/client.js');
const { generateKlong, default: handler } = await import('./generate-klong.js');

// A real captured Gemini output (score 23 against validateKlong) — reused
// here as a deterministic "always low-scoring" mock response.
const LOW_SCORE_BAHT = [
  ['พระ', 'คุณ', 'แม่', 'ยิ่ง', 'ใหญ่', 'เหลือ', 'ใจ'],
  ['รัก', 'ลูก', 'แก้ว', 'ป้อง', 'ภัย', 'ทุก', 'สิ่ง'],
  ['ท่าน', 'เลี้ยง', 'ดู', 'จริง', 'เปี่ยม', 'น้ำ', 'ใจ'],
  ['มิ', 'เคย', 'ทอด', 'ทิ้ง', 'รัก', 'แท้', 'ยั่ง', 'ยืน', 'นาน'],
];

function mockGeminiResponse(baht) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ baht }) }] } }],
    }),
  };
}

describe('generateKlong — minimum score threshold', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => mockGeminiResponse(LOW_SCORE_BAHT)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('flags meetsThreshold: false when every refine attempt stays below MIN_ACCEPTABLE_SCORE', async () => {
    const result = await generateKlong('ทดสอบ', 'fake-api-key');
    expect(result.meetsThreshold).toBe(false);
    expect(result.attempts).toBe(3); // exhausts every refine attempt, never reaches valid
    expect(result.validation.score).toBeLessThan(70);
  });

  it('still returns the best attempt and its errors, not an empty result', async () => {
    const result = await generateKlong('ทดสอบ', 'fake-api-key');
    expect(result.baht).toEqual(LOW_SCORE_BAHT);
    expect(result.validation.errors.length).toBeGreaterThan(0);
  });
});

describe('generateKlong — admin prompt_template override', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = vi.fn(async () => mockGeminiResponse(LOW_SCORE_BAHT));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('substitutes {topic} into a custom template and sends that as the prompt', async () => {
    await generateKlong('ฤดูฝน', 'fake-api-key', 'เขียนโคลงสนุกๆ เกี่ยวกับ {topic} หน่อย');
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const promptText = sentBody.contents[0].parts[0].text;
    expect(promptText).toContain('เขียนโคลงสนุกๆ เกี่ยวกับ ฤดูฝน หน่อย');
  });

  it('falls back to the default intro when no template is given', async () => {
    await generateKlong('ฤดูฝน', 'fake-api-key');
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const promptText = sentBody.contents[0].parts[0].text;
    expect(promptText).toContain('ทำหน้าที่เป็นกวีเอก');
  });

  it('falls back to the default intro when the template has no {topic} placeholder', async () => {
    await generateKlong('ฤดูฝน', 'fake-api-key', 'พรอมต์ที่ไม่มี placeholder เลย');
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const promptText = sentBody.contents[0].parts[0].text;
    expect(promptText).toContain('ทำหน้าที่เป็นกวีเอก');
  });

  it('never drops the structural scheme instructions, even with a custom template', async () => {
    await generateKlong('ฤดูฝน', 'fake-api-key', 'เขียนโคลงเกี่ยวกับ {topic}');
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const promptText = sentBody.contents[0].parts[0].text;
    expect(promptText).toContain('โครงสร้างฉันทลักษณ์ที่ต้องปฏิบัติตามอย่างเคร่งครัด');
  });
});

describe('generate-klong handler — ai_enabled gate', () => {
  beforeEach(() => {
    sql.mockReset();
    vi.stubEnv('GEMINI_API_KEY', 'fake-api-key');
    vi.stubGlobal('fetch', vi.fn(async () => mockGeminiResponse(LOW_SCORE_BAHT)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('403s and never calls Gemini when ai_enabled is false', async () => {
    sql.mockResolvedValue([{ ai_enabled: false, ai_autofill_enabled: true, prompt_template: null }]);
    const res = fakeRes();
    await handler(fakeReq('POST', { topic: 'ฤดูฝน' }), res);
    expect(res.statusCode).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('proceeds normally when ai_enabled is true', async () => {
    sql.mockResolvedValue([{ ai_enabled: true, ai_autofill_enabled: true, prompt_template: null }]);
    const res = fakeRes();
    await handler(fakeReq('POST', { topic: 'ฤดูฝน' }), res);
    expect(res.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalled();
  });
});
