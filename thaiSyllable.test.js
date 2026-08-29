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
});
