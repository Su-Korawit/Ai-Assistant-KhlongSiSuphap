import { describe, it, expect } from 'vitest';
import { splitThaiSyllables, isDeadWord, isEk, isTho, analyzeSyllable, compareRhyme, RhymeConfidence } from './thaiSyllable.js';

describe('splitThaiSyllables', () => {
  it('splits plain open/closed syllables', () => {
    expect(splitThaiSyllables('รักษ์')).toEqual(['รักษ์']);
    expect(splitThaiSyllables('คนดี')).toEqual(['คน', 'ดี']);
    expect(splitThaiSyllables('')).toEqual([]);
    expect(splitThaiSyllables('   ')).toEqual([]);
  });

  it('handles ห-นำ pairs without swallowing the next syllable (regression: pre-existing bug)', () => {
    expect(splitThaiSyllables('ไหล')).toEqual(['ไหล']);
    expect(splitThaiSyllables('หมา')).toEqual(['หมา']);
    expect(splitThaiSyllables('ใหญ่โต')).toEqual(['ใหญ่', 'โต']);
    expect(splitThaiSyllables('หรือไม่')).toEqual(['หรือ', 'ไม่']);
    expect(splitThaiSyllables('เหลือเชื่อ')).toEqual(['เหลือ', 'เชื่อ']);
  });

  it('handles a silenced trailing consonant (การันต์)', () => {
    expect(splitThaiSyllables('รมย์')).toEqual(['รมย์']);
  });

  it('ignores whitespace between clauses', () => {
    expect(splitThaiSyllables('สาย น้ำ')).toEqual(['สาย', 'น้ำ']);
  });

  it('emits non-Thai characters as their own unit rather than throwing', () => {
    expect(splitThaiSyllables('abc123')).toEqual(['a', 'b', 'c', '1', '2', '3']);
  });

  it('handles compound-vowel glides (เอีย/เอือ/อัว) as one syllable, not split off as a false extra one', () => {
    // เอีย — ย is part of the vowel, not a separate final
    expect(splitThaiSyllables('เพียง')).toEqual(['เพียง']);
    expect(splitThaiSyllables('เงียบ')).toEqual(['เงียบ']);
    expect(splitThaiSyllables('เขียน')).toEqual(['เขียน']);
    expect(splitThaiSyllables('เสีย')).toEqual(['เสีย']); // no final after the glide at all
    // เอือ — อ is part of the vowel
    expect(splitThaiSyllables('เรือน')).toEqual(['เรือน']);
    expect(splitThaiSyllables('เดือน')).toEqual(['เดือน']);
    // อัว / reduced ว-ลาก (no ั written) — ว is part of the vowel
    expect(splitThaiSyllables('ตัว')).toEqual(['ตัว']);
    expect(splitThaiSyllables('กลัว')).toEqual(['กลัว']);
    expect(splitThaiSyllables('ห่วง')).toEqual(['ห่วง']);
    // regression: already-working เอา pattern must stay working
    expect(splitThaiSyllables('เมา')).toEqual(['เมา']);
  });

  it('does not misapply the glide rule to a real final ว/ย that already has its own leading or trailing vowel', () => {
    expect(splitThaiSyllables('แมว')).toEqual(['แมว']);
    expect(splitThaiSyllables('ดาว')).toEqual(['ดาว']);
    expect(splitThaiSyllables('ขาว')).toEqual(['ขาว']);
    expect(splitThaiSyllables('สาย')).toEqual(['สาย']);
  });

  it('treats อย as a ห-นำ-style pair (อยู่, อยาก, อย่าง)', () => {
    expect(splitThaiSyllables('อยู่')).toEqual(['อยู่']);
    expect(splitThaiSyllables('อยาก')).toEqual(['อยาก']);
    expect(splitThaiSyllables('อย่าง')).toEqual(['อย่าง']);
  });

  it('handles สระออ — a bare อ right after the onset is the vowel, not a final consonant', () => {
    expect(splitThaiSyllables('ต้อง')).toEqual(['ต้อง']);
    expect(splitThaiSyllables('สอง')).toEqual(['สอง']);
    expect(splitThaiSyllables('ทอง')).toEqual(['ทอง']);
    expect(splitThaiSyllables('ห้อง')).toEqual(['ห้อง']);
    expect(splitThaiSyllables('กอ')).toEqual(['กอ']); // no final at all
    expect(splitThaiSyllables('อ่อน')).toEqual(['อ่อน']); // onset อ AND vowel อ in the same word
  });
});

describe('isDeadWord (คำตาย)', () => {
  it('is true for a dead-stop final consonant', () => {
    expect(isDeadWord('รัก')).toBe(true);
    expect(isDeadWord('จบ')).toBe(true);
    expect(isDeadWord('มด')).toBe(true);
  });

  it('is true for a short vowel with no final consonant', () => {
    expect(isDeadWord('จะ')).toBe(true);
  });

  it('is false for an open long-vowel syllable or a live final', () => {
    expect(isDeadWord('มา')).toBe(false);
    expect(isDeadWord('กิน')).toBe(false);
  });

  it('is false for a lone onset consonant carried by a leading vowel', () => {
    expect(isDeadWord('เก')).toBe(false);
  });
});

describe('isEk / isTho', () => {
  it('isEk accepts ไม้เอก or a dead word', () => {
    expect(isEk('ไม่')).toBe(true);
    expect(isEk('รัก')).toBe(true); // dead word substitute
    expect(isEk('มา')).toBe(false);
  });

  it('isTho accepts only ไม้โท', () => {
    expect(isTho('น้ำ')).toBe(true);
    expect(isTho('รัก')).toBe(false); // dead word is NOT a valid โท substitute
  });
});

describe('rhyme (สัมผัสสระ)', () => {
  it('EXACT: identical vowel and final consonant', () => {
    expect(compareRhyme('รัก', 'จัก')).toBe(RhymeConfidence.EXACT);
    expect(compareRhyme('มา', 'กา')).toBe(RhymeConfidence.EXACT);
  });

  it('LIKELY: same vowel and final sound class, different final letter', () => {
    // สุข (final ข) and ทุก (final ก) — both แม่กก, same vowel ุ — valid rhyme, different letter
    expect(compareRhyme('สุข', 'ทุก')).toBe(RhymeConfidence.LIKELY);
  });

  it('NO_MATCH: different vowel or final class', () => {
    expect(compareRhyme('มา', 'มี')).toBe(RhymeConfidence.NO_MATCH);
    expect(compareRhyme('เมฆ', 'โรค')).toBe(RhymeConfidence.NO_MATCH); // different vowel
  });

  it('UNCERTAIN: unparseable syllable never hard-fails', () => {
    expect(compareRhyme('มา', 'x1')).toBe(RhymeConfidence.UNCERTAIN);
    expect(compareRhyme('', 'มา')).toBe(RhymeConfidence.UNCERTAIN);
  });

  it('analyzeSyllable extracts the onset-agnostic vowel skeleton', () => {
    const a = analyzeSyllable('รัก');
    expect(a.ok).toBe(true);
    expect(a.vowelSkeleton).toBe('ั');
    expect(a.finalConsonant).toBe('ก');
    expect(a.finalClass).toBe('kok'); // แม่กก: ก ข ค ฆ
  });

  describe('compound-vowel glides (เอีย/เอือ/อัว)', () => {
    it('เอีย: analyzeSyllable finds the real final past the ย glide', () => {
      const a = analyzeSyllable('เพียง');
      expect(a.ok).toBe(true);
      expect(a.finalConsonant).toBe('ง');
      expect(a.finalClass).toBe('kong');
    });

    it('เอือ: analyzeSyllable finds the real final past the อ glide', () => {
      const a = analyzeSyllable('เรือน');
      expect(a.ok).toBe(true);
      expect(a.finalConsonant).toBe('น');
      expect(a.finalClass).toBe('kon');
    });

    it('อัว (explicit ั) and the reduced ว-ลาก spelling (no ั written) normalize to the same shape', () => {
      const explicit = analyzeSyllable('ทั่ง');
      const reduced = analyzeSyllable('ห่วง');
      expect(explicit.ok).toBe(true);
      expect(reduced.ok).toBe(true);
      expect(reduced.finalConsonant).toBe('ง');
      expect(reduced.finalClass).toBe('kong');
      expect(reduced.vowelSkeleton).toBe(explicit.vowelSkeleton);
    });

    it('a real final ว/ย (already preceded by its own vowel) is not treated as a glide', () => {
      const a = analyzeSyllable('ดาว');
      expect(a.finalConsonant).toBe('ว');
      expect(a.finalClass).toBe('kaao');
    });

    it('compareRhyme: ยาก vs เพียง is a real mismatch (regression for the reported bug)', () => {
      expect(compareRhyme('ยาก', 'เพียง')).toBe(RhymeConfidence.NO_MATCH);
    });

    it('compareRhyme: genuine เอีย/อัว rhymes are recognized despite the glide letter', () => {
      expect(compareRhyme('เสีย', 'เมีย')).toBe(RhymeConfidence.EXACT);
      expect(compareRhyme('ตัว', 'หัว')).toBe(RhymeConfidence.EXACT);
      expect(compareRhyme('ห่วง', 'ทั่ง')).toBe(RhymeConfidence.EXACT); // explicit vs reduced spelling
    });

    it('ออ: analyzeSyllable finds the real final past the bare อ glide', () => {
      const a = analyzeSyllable('ทอง');
      expect(a.ok).toBe(true);
      expect(a.finalConsonant).toBe('ง');
      expect(a.finalClass).toBe('kong');
    });

    it('ออ and อัว are kept distinct — they are different vowels and must not rhyme', () => {
      expect(compareRhyme('ต้อง', 'ทั่ง')).toBe(RhymeConfidence.NO_MATCH);
    });

    it('compareRhyme: genuine ออ rhymes are recognized', () => {
      expect(compareRhyme('ทอง', 'สอง')).toBe(RhymeConfidence.EXACT);
      expect(compareRhyme('ทอง', 'ห้อง')).toBe(RhymeConfidence.EXACT);
      expect(compareRhyme('กอ', 'ขอ')).toBe(RhymeConfidence.EXACT); // no final, open ออ
    });
  });
});

describe('irregular syllables (silent ร: ทร→ซ, จร-silent, ไซร้)', () => {
  it('splits each irregular word as exactly one syllable', () => {
    expect(splitThaiSyllables('ไซร้')).toEqual(['ไซร้']);
    expect(splitThaiSyllables('จริง')).toEqual(['จริง']);
    expect(splitThaiSyllables('ทรง')).toEqual(['ทรง']);
    expect(splitThaiSyllables('ทราย')).toEqual(['ทราย']);
    expect(splitThaiSyllables('ทราบ')).toEqual(['ทราบ']);
    expect(splitThaiSyllables('แทรก')).toEqual(['แทรก']);
    expect(splitThaiSyllables('ทรวง')).toEqual(['ทรวง']);
    expect(splitThaiSyllables('ทรุด')).toEqual(['ทรุด']);
    expect(splitThaiSyllables('โทรม')).toEqual(['โทรม']);
  });

  it('regression: real สร/ศร clusters already split correctly, dictionary must not touch them', () => {
    expect(splitThaiSyllables('สร้อย')).toEqual(['สร้อย']);
    expect(splitThaiSyllables('เศร้า')).toEqual(['เศร้า']);
    expect(splitThaiSyllables('สร้าง')).toEqual(['สร้าง']);
  });

  it('analyzeSyllable gives the real (silent-ร-stripped) rhyme signature', () => {
    expect(analyzeSyllable('จริง')).toMatchObject({ ok: true, vowelSkeleton: 'ิ', finalConsonant: 'ง', finalClass: 'kong' });
    expect(analyzeSyllable('ทราย')).toMatchObject({ ok: true, vowelSkeleton: 'า', finalConsonant: 'ย', finalClass: 'kloi' });
    expect(analyzeSyllable('ทราบ')).toMatchObject({ ok: true, vowelSkeleton: 'า', finalConsonant: 'บ', finalClass: 'kob' });
    expect(analyzeSyllable('แทรก')).toMatchObject({ ok: true, vowelSkeleton: 'แ', finalConsonant: 'ก', finalClass: 'kok' });
    expect(analyzeSyllable('ทรวง')).toMatchObject({ ok: true, vowelSkeleton: 'ั', finalConsonant: 'ง', finalClass: 'kong' });
    expect(analyzeSyllable('ทรุด')).toMatchObject({ ok: true, vowelSkeleton: 'ุ', finalConsonant: 'ด', finalClass: 'kot' });
    expect(analyzeSyllable('โทรม')).toMatchObject({ ok: true, vowelSkeleton: 'โ', finalConsonant: 'ม', finalClass: 'kom' });
  });

  it('ไซร้ already analyzes correctly via the normal path — no dictionary override needed', () => {
    expect(analyzeSyllable('ไซร้')).toMatchObject({ ok: true, finalConsonant: null, finalClass: 'NONE' });
  });

  it('ทรง has no written vowel mark — analyzeSyllable stays ok:false, same pre-existing limitation as คง/จง/ลง (not fixed by this dictionary)', () => {
    expect(analyzeSyllable('คง').ok).toBe(false); // baseline: unmarked-vowel closed syllable is already UNCERTAIN today
    expect(analyzeSyllable('ทรง').ok).toBe(false);
  });

  it('compareRhyme: ทราย rhymes with other real า+ย words despite the silent ร', () => {
    expect(compareRhyme('ทราย', 'ตาย')).toBe(RhymeConfidence.EXACT);
  });
});
