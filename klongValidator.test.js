import { describe, it, expect } from 'vitest';
import { validateKlong } from './klongValidator.js';
import { isEk, isTho } from './thaiSyllable.js';
import { BAHT_SCHEME } from './klongRules.js';

// A synthetic but fully rule-compliant poem: filler 'ตา' everywhere except
// the required เอก/โท/rhyme positions, which are hand-picked to satisfy
// the scheme. Not real poetry — a fixture for the deterministic validator.
const VALID_POEM = [
  ['ตา', 'ตา', 'ตา', 'ไม่', 'น้ำ', 'ตา', 'กา'],
  ['ตา', 'จิต', 'ตา', 'ตา', 'มา', 'จบ', 'ฟ้า'],
  ['ตา', 'ตา', 'จิต', 'ตา', 'ตา', 'ตา', 'จบ'],
  ['ตา', 'จบ', 'ตา', 'ตา', 'หน้า', 'จบ', 'ฟ้า', 'ตา', 'ตา'],
];

const clone = (poem) => poem.map(row => [...row]);

describe('validateKlong — canonical scheme regression', () => {
  it('matches the verified position scheme (เสียงลือเสียงเล่าอ้าง): บาท 1 เอก@4 โท@5', () => {
    expect(BAHT_SCHEME[0].ek).toEqual([4]);
    expect(BAHT_SCHEME[0].tho).toEqual([5]);
    // เล่า carries ไม้เอก, อ้าง carries ไม้โท
    expect(isEk('เล่า')).toBe(true);
    expect(isTho('อ้าง')).toBe(true);
  });

  it('accepts a fully compliant poem as valid with score 100', () => {
    const result = validateKlong(VALID_POEM);
    expect(result.complete).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.score).toBe(100);
  });
});

describe('validateKlong — structure', () => {
  it('is incomplete (not an error) while slots are still empty', () => {
    const partial = clone(VALID_POEM);
    partial[3][8] = '';
    const result = validateKlong(partial);
    expect(result.complete).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.score).toBeNull();
    expect(result.errors).toEqual([]);
  });
});

describe('validateKlong — เอก/โท', () => {
  it('flags a wrong เอก position as an error', () => {
    const bad = clone(VALID_POEM);
    bad[0][3] = 'ตา'; // บาท1 คำ4 must be เอก
    const result = validateKlong(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'TONE_EK_FAIL' && e.baht === 0 && e.pos === 4)).toBe(true);
  });

  it('flags a wrong โท position as an error', () => {
    const bad = clone(VALID_POEM);
    bad[0][4] = 'ตา'; // บาท1 คำ5 must be โท
    const result = validateKlong(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'TONE_THO_FAIL' && e.baht === 0 && e.pos === 5)).toBe(true);
  });

  it('accepts a dead word (คำตาย) as a valid เอก substitute', () => {
    const poem = clone(VALID_POEM);
    poem[0][3] = 'จบ'; // dead word, not ไม้เอก
    const result = validateKlong(poem);
    expect(result.errors.some(e => e.baht === 0 && e.pos === 4)).toBe(false);
  });

  describe('เอกโทษ/โทโทษ (allowTonePenalty option)', () => {
    it('by default (no options), a ไม้โท word at a เอก slot still fails', () => {
      const poem = clone(VALID_POEM);
      poem[0][3] = 'น้ำ'; // บาท1 คำ4 needs เอก — น้ำ is ไม้โท
      const result = validateKlong(poem);
      expect(result.errors.some(e => e.code === 'TONE_EK_FAIL' && e.baht === 0 && e.pos === 4)).toBe(true);
    });

    it('with { allowTonePenalty: true }, a ไม้โท word at a เอก slot is accepted (เอกโทษ)', () => {
      const poem = clone(VALID_POEM);
      poem[0][3] = 'น้ำ';
      const result = validateKlong(poem, { allowTonePenalty: true });
      expect(result.errors.some(e => e.baht === 0 && e.pos === 4)).toBe(false);
    });

    it('with { allowTonePenalty: true }, a ไม้เอก word at a โท slot is accepted (โทโทษ)', () => {
      const poem = clone(VALID_POEM);
      poem[0][4] = 'ไม่'; // บาท1 คำ5 needs โท — ไม่ is ไม้เอก
      const result = validateKlong(poem, { allowTonePenalty: true });
      expect(result.errors.some(e => e.baht === 0 && e.pos === 5)).toBe(false);
    });

    it('the option does not affect rhyme or MULTI_SYLLABLE checks', () => {
      const bad = clone(VALID_POEM);
      bad[2][4] = 'มี'; // breaks rhyme regardless
      const result = validateKlong(bad, { allowTonePenalty: true });
      expect(result.errors.some(e => e.code === 'RHYME_FAIL')).toBe(true);
    });
  });
});

describe('validateKlong — rhyme', () => {
  it('flags a broken rhyme group as an error', () => {
    const bad = clone(VALID_POEM);
    bad[2][4] = 'มี'; // บาท3 คำ5 must rhyme with บาท1 คำ7 / บาท2 คำ5 (สระ า)
    const result = validateKlong(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'RHYME_FAIL')).toBe(true);
  });

  it('treats an unparseable rhyme syllable as a warning, not an error', () => {
    const uncertain = clone(VALID_POEM);
    uncertain[2][4] = 'x1';
    const result = validateKlong(uncertain);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.code === 'RHYME_UNCERTAIN')).toBe(true);
  });

  it('does not flag a rhyme group that is still only partially filled', () => {
    const partial = clone(VALID_POEM);
    partial[2][4] = '';
    const result = validateKlong(partial);
    expect(result.errors.some(e => e.code === 'RHYME_FAIL')).toBe(false);
  });

  it('flags a broken rhyme through a compound-vowel word (regression: เอีย glide bug)', () => {
    const bad = clone(VALID_POEM);
    bad[1][4] = 'เพียง'; // บาท2 คำ5 — single syllable, but genuinely doesn't rhyme with อา here
    const result = validateKlong(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'RHYME_FAIL')).toBe(true);
    expect(result.errors.some(e => e.code === 'MULTI_SYLLABLE')).toBe(false); // เพียง must not be misread as 2 syllables
  });

  it('does not falsely break a rhyme group of genuinely-rhyming compound-vowel (เอีย) words', () => {
    const good = clone(VALID_POEM);
    good[0][6] = 'เพียง'; // บาท1 คำ7
    good[1][4] = 'เคียง'; // บาท2 คำ5
    good[2][4] = 'เสียง'; // บาท3 คำ5
    const result = validateKlong(good);
    expect(result.errors.some(e => e.code === 'RHYME_FAIL')).toBe(false);
    expect(result.errors.some(e => e.code === 'MULTI_SYLLABLE')).toBe(false);
  });

  it('does not falsely flag สระออ words (ทอง/ห้อง) as MULTI_SYLLABLE or a broken rhyme', () => {
    const good = clone(VALID_POEM);
    good[0][6] = 'ทอง'; // บาท1 คำ7
    good[1][4] = 'ห้อง'; // บาท2 คำ5
    good[2][4] = 'สอง'; // บาท3 คำ5
    const result = validateKlong(good);
    expect(result.errors.some(e => e.code === 'RHYME_FAIL')).toBe(false);
    expect(result.errors.some(e => e.code === 'MULTI_SYLLABLE')).toBe(false);
  });
});

describe('validateKlong — single-syllable-per-slot', () => {
  it('flags a slot whose word splits into more than one Thai syllable', () => {
    const bad = clone(VALID_POEM);
    bad[1][0] = 'ปฐพี'; // บาท2 คำ1 — real word, but 2 syllables, not a valid slot filler
    const result = validateKlong(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MULTI_SYLLABLE' && e.baht === 1 && e.pos === 1)).toBe(true);
  });

  it('does not flag non-Thai placeholder text as multi-syllable (unparseable, not wrong)', () => {
    const uncertain = clone(VALID_POEM);
    uncertain[2][4] = 'x1';
    const result = validateKlong(uncertain);
    expect(result.errors.some(e => e.code === 'MULTI_SYLLABLE')).toBe(false);
  });
});
