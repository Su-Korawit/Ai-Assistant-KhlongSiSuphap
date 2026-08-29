/**
 * Exception dictionary for Thai syllables whose written form the general
 * scanner in thaiSyllable.js cannot correctly resolve — a silent ร with no
 * การันต์ (์) mark (ไซร้, จริง) or the documented ทร→ซ pronunciation shift
 * (ทราย, ทราบ, แทรก, ทรง, ทรวง, ทรุด, โทรม). These are lexical irregularities
 * (which specific words are affected is not derivable from spelling rules —
 * see thaiSyllable.test.js for counter-examples like จรัส/จรวด, where ร is
 * NOT silent), so they're looked up here rather than pattern-matched.
 *
 * Each value is either:
 *   - the rhyme signature `{ vowelSkeleton, finalConsonant, finalClass }`
 *     analyzeSyllable() should return for the word once ร is stripped, or
 *   - `null`, meaning: this word only needs the split fixed (used as a
 *     dictionary key so splitThaiSyllables() treats it as one syllable);
 *     analyzeSyllable() already gives the right answer for it unassisted
 *     (ไซร้), or has a pre-existing, accepted limitation unrelated to the
 *     silent-ร bug (ทรง has no written vowel mark at all, same as คง/จง/ลง —
 *     analyzeSyllable() already returns ok:false for that whole class of
 *     word, and this dictionary doesn't attempt to fix it).
 */
export const IRREGULAR_SYLLABLES = {
  'ไซร้': null,
  'จริง': { vowelSkeleton: 'ิ', finalConsonant: 'ง', finalClass: 'kong' },
  'ทรง': null,
  'ทราย': { vowelSkeleton: 'า', finalConsonant: 'ย', finalClass: 'kloi' },
  'ทราบ': { vowelSkeleton: 'า', finalConsonant: 'บ', finalClass: 'kob' },
  'แทรก': { vowelSkeleton: 'แ', finalConsonant: 'ก', finalClass: 'kok' },
  'ทรวง': { vowelSkeleton: 'ั', finalConsonant: 'ง', finalClass: 'kong' },
  'ทรุด': { vowelSkeleton: 'ุ', finalConsonant: 'ด', finalClass: 'kot' },
  'โทรม': { vowelSkeleton: 'โ', finalConsonant: 'ม', finalClass: 'kom' },
};

// Longest-match first: none of the current keys collide, but future entries
// (e.g. a multi-syllable exception) must not shadow a shorter valid key.
const IRREGULAR_KEYS = Object.keys(IRREGULAR_SYLLABLES).sort((a, b) => b.length - a.length);

/**
 * Returns the dictionary key matching text at `pos`, or null. Used by
 * splitThaiSyllables() to short-circuit the general scanner.
 */
export const matchIrregularSyllable = (text, pos) =>
  IRREGULAR_KEYS.find((key) => text.startsWith(key, pos)) ?? null;
