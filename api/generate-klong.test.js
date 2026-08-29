import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateKlong } from './generate-klong.js';

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
