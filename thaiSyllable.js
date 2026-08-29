/**
 * Thai syllable analysis: splitting, dead-word detection, เอก/โท checks, and
 * rhyme (สัมผัสสระ) comparison. Pure functions, no React/DOM — shared by the
 * browser UI (KlongEditor live feedback) and the server-side generation
 * pipeline (api/generate-klong.js), so both use one validator, never two.
 */

import { IRREGULAR_SYLLABLES, matchIrregularSyllable } from './irregularSyllables.js';

// Real Thai consonant clusters (อักษรควบ) — second consonant shares the
// syllable's onset, no vowel between them.
const CLUSTERS = new Set([
  'กร','กล','กว','ขร','ขล','ขว','คร','คล','คว',
  'ตร','ปร','ปล','ผล','พร','พล','ฟร','ฟล','ศร','สร',
]);

// ห-นำ (leading ห): ห silences/retones the following sonorant, which then
// carries the syllable's own vowel — e.g. ไหล, หมา, เหลือ. Also treated as
// a same-syllable pair for splitting purposes.
// 'อย' behaves like a ห-นำ pair for this closed set of modern words (อยู่,
// อยาก, อย่าง, อย่า) — อ is silent/modifying, ย carries the syllable's vowel.
const HNAM = new Set(['หง','หญ','หน','หม','หย','หร','หล','หว','อย']);

const isConsonant = (ch) => ch !== undefined && ch >= 'ก' && ch <= 'ฮ';
const LEADING_VOWELS = new Set(['เ','แ','โ','ใ','ไ']);
const ABOVE_BELOW_VOWELS = new Set(['ั','ิ','ี','ึ','ื','ุ','ู','ฺ','็']);
const TONE_MARKS = new Set(['่','้','๊','๋']);
const TRAILING_VOWELS = new Set(['ะ','า','ำ']);

/**
 * splitThaiSyllables(text)
 * Splits Thai text into syllables (พยางค์). Whitespace is ignored.
 *
 * A hand-written scanner rather than a single regex: a regex with an
 * optional final-consonant slot greedily swallows the *next* syllable's
 * onset whenever the current syllable has no written vowel (e.g. "ไหล" +
 * "รื่น" mis-split as "ไหลร" + "นรม" + "ย์"). The fix is a small rule —
 * after consuming an onset + real cluster/ห-นำ pair with no vowel mark
 * following, stop; don't also grab a final consonant, since that
 * consonant almost certainly starts the next syllable instead.
 *
 * Known limitation (documented, not silently wrong): a silent tail
 * (การันต์) of more than one consonant, e.g. "จันทร์" (ทร์ = two silenced
 * consonants), is not merged — this scanner only silences a single
 * trailing consonant (e.g. "รมย์"). Rare in practice; flagged rather than
 * solved with a dictionary, which is out of scope for a heuristic
 * segmenter.
 *
 * Compound-vowel glides: เอีย (เพียง, เสีย), เอือ (เรือน, เดือน), อัว/ว-ลาก
 * (ตัว, กลัว, and the reduced spelling with no ั written at all — ห่วง,
 * ล่วง), and ออ (ทอง, ต้อง, กอ) all use a letter that reads as a plain
 * consonant (ย, ว, or อ) but is actually part of the vowel. Handled below
 * by checking what vowel was already consumed before that letter: a
 * genuine final ว/อ (แมว, ดาว; อ่อน's onset อ) only occurs after a leading
 * vowel (แ/เ/โ/ใ/ไ) or trailing vowel (ะ/า/ำ) has already been established,
 * or — for อ specifically — when it's the very first character (the
 * onset), never when it's a bare ว/อ right after the onset (or after ั).
 */
export const splitThaiSyllables = (text) => {
  if (!text) return [];
  const s = text.replace(/\s+/g, '');
  const len = s.length;
  const syllables = [];
  let i = 0;

  while (i < len) {
    const start = i;

    const irregular = matchIrregularSyllable(s, start);
    if (irregular) {
      syllables.push(irregular);
      i = start + irregular.length;
      continue;
    }

    if (LEADING_VOWELS.has(s[i])) i++;

    if (!isConsonant(s[i])) {
      // Non-Thai-syllable character (digit, Latin, punctuation) — emit as its own unit.
      syllables.push(s.slice(start, start + 1));
      i = start + 1;
      continue;
    }
    i++; // (B) onset consonant

    let hasClusterOrNam = false;
    if (isConsonant(s[i])) {
      const pair = s[i - 1] + s[i];
      if (CLUSTERS.has(pair) || HNAM.has(pair)) {
        i++;
        hasClusterOrNam = true;
      }
    }

    const hadLeadingVowel = LEADING_VOWELS.has(s[start]);
    let hadVowel = hadLeadingVowel;
    let lastAboveBelowVowel = null;
    while (i < len && ABOVE_BELOW_VOWELS.has(s[i])) { lastAboveBelowVowel = s[i]; i++; hadVowel = true; }
    while (i < len && TONE_MARKS.has(s[i])) i++; // tone mark alone isn't a vowel
    let hadTrailingVowel = false;
    while (i < len && TRAILING_VOWELS.has(s[i])) { i++; hadVowel = true; hadTrailingVowel = true; }

    // Compound-vowel glide completion — see file doc comment. Must run
    // before the final-consonant step below, since the glide letter would
    // otherwise be mistaken for one.
    if (hadLeadingVowel && lastAboveBelowVowel === 'ี' && s[i] === 'ย') {
      i++; // เอีย
    } else if (hadLeadingVowel && lastAboveBelowVowel === 'ื' && s[i] === 'อ') {
      i++; // เอือ
    } else if (!hadLeadingVowel && !hadTrailingVowel && s[i] === 'ว' &&
               (lastAboveBelowVowel === 'ั' || lastAboveBelowVowel === null)) {
      i++; // อัว (explicit ั) or the reduced ว-ลาก spelling (no ั written)
      hadVowel = true;
    } else if (!hadLeadingVowel && !hadTrailingVowel && s[i] === 'อ' && lastAboveBelowVowel === null) {
      i++; // สระออ — a bare อ right after the onset is the vowel, not a consonant
      hadVowel = true;
    }

    // (G) final consonant — skip when a cluster/ห-นำ pair already explains
    // the lack of a vowel mark; that trailing consonant belongs to the next syllable.
    if (!(hasClusterOrNam && !hadVowel) && isConsonant(s[i])) i++;

    // (H) silent tail (การันต์): bare ์, or one consonant + ์
    if (s[i] === '์') i++;
    else if (isConsonant(s[i]) && s[i + 1] === '์') i += 2;

    syllables.push(s.slice(start, i));
  }

  return syllables;
};

export const countThaiSyllables = (text) => splitThaiSyllables(text).length;

/**
 * isDeadWord(syllable)
 * Returns true if the syllable is คำตาย (a dead word).
 *
 * Rule 1 — Ends with a dead-stop FINAL CONSONANT (ตัวสะกด):
 *   แม่กก (/k/ unreleased stop): ก ข ค ฆ
 *   แม่กบ (/p/ unreleased stop): บ ป พ ฟ ภ
 *   แม่กด (/t/ unreleased stop): ด ต ถ ท ธ  ฎ ฏ ฐ ฑ ฒ  จ ช ซ ศ ษ ส
 *
 * Rule 2 — Has a SHORT VOWEL with NO final consonant:
 *   ะ (U+0E30)  ิ (U+0E34)  ึ (U+0E36)  ุ (U+0E38)  ็ (U+0E47)
 *
 * Silent consonants (การันต์: consonant + ์) are stripped before analysis.
 */
export const isDeadWord = (syllable) => {
  if (!syllable) return false;

  // Dead-stop final consonant sets
  const DEAD_FINALS = new Set([
    'ก','ข','ค','ฆ',                // แม่กก (/k/)
    'บ','ป','พ','ฟ','ภ',             // แม่กบ (/p/)
    'ด','ต','ถ','ท','ธ',             // แม่กด (/t/) — common
    'ฎ','ฏ','ฐ','ฑ','ฒ',             // แม่กด — archaic letters
    'จ','ช','ซ','ศ','ษ','ส',         // แม่กด — sibilants used as finals
  ]);

  // Short vowels that signal dead word when no final consonant follows
  const SHORT_VOWEL_RE = /[ะิึุ็]/; // ะ ิ ึ ุ ็

  // Strip silent (การันต์) consonants: [consonant]์ is unpronounced
  const cleaned = syllable.replace(/[ก-ฮ]์/g, '');

  const allConsonants = cleaned.match(/[ก-ฮ]/g) || [];
  const hasLeadingVowel  = /^[เแโใไ]/.test(cleaned);
  const endsWithConsonant = /[ก-ฮ]$/.test(cleaned);

  if (endsWithConsonant) {
    // Single consonant preceded by a leading vowel (e.g. "เก", "โน", "ใน"):
    // The consonant IS the onset — no final consonant present → not dead via Rule 1
    if (allConsonants.length === 1 && hasLeadingVowel) return false;

    // Multiple consonants: the last is the final consonant (ตัวสะกด)
    if (allConsonants.length > 1) {
      const lastConsonant = allConsonants[allConsonants.length - 1];
      return DEAD_FINALS.has(lastConsonant);
    }
  }

  // No identifiable final consonant → apply Rule 2: short vowel = dead
  return SHORT_VOWEL_RE.test(cleaned);
};

/**
 * isEk(syllable)
 * Returns true if syllable satisfies the เอก tone requirement in โคลง poetry.
 * Accepts: ไม้เอก (่ U+0E48)  OR  คำตาย (dead word) as a valid เอก substitute.
 */
export const isEk = (syllable) => {
  if (!syllable) return false;
  return syllable.includes('่') || isDeadWord(syllable);
};

/**
 * isTho(syllable)
 * Returns true if syllable satisfies the โท tone requirement in โคลง poetry.
 * Accepts: ไม้โท (้ U+0E49) only.
 */
export const isTho = (syllable) => {
  if (!syllable) return false;
  return syllable.includes('้');
};

// --- Rhyme (สัมผัสสระ) ---

/**
 * Final-consonant sound classes (มาตราตัวสะกด). Two syllables rhyme when
 * their vowel is identical AND their final consonant belongs to the same
 * class — the exact letter doesn't need to match (เมฆ rhymes with โรค,
 * both แม่กก). "NONE" is its own class: open syllables only rhyme with
 * other open syllables of the same vowel.
 */
const FINAL_CLASS = new Map([
  ...['ก','ข','ค','ฆ'].map(c => [c, 'kok']),      // แม่กก
  ...['ด','ต','ถ','ท','ธ','ฎ','ฏ','ฐ','ฑ','ฒ','จ','ช','ซ','ศ','ษ','ส'].map(c => [c, 'kot']), // แม่กด
  ...['บ','ป','พ','ฟ','ภ'].map(c => [c, 'kob']),  // แม่กบ
  ...['น','ณ','ญ','ร','ล','ฬ'].map(c => [c, 'kon']), // แม่กน
  ['ม', 'kom'],   // แม่กม
  ['ย', 'kloi'],  // แม่เกย
  ['ว', 'kaao'],  // แม่เกอว
  ['ง', 'kong'],  // แม่กง
]);

export const RhymeConfidence = Object.freeze({
  EXACT: 'EXACT',
  LIKELY: 'LIKELY',
  UNCERTAIN: 'UNCERTAIN',
  NO_MATCH: 'NO_MATCH',
});

/**
 * analyzeSyllable(syllable)
 * Breaks a syllable into a rhyme-relevant signature: the vowel skeleton
 * (leading/above/trailing vowel marks, tone stripped) plus the final
 * consonant (if any) and its sound class. Onset consonant(s) are dropped —
 * Thai rhyme ignores the initial sound entirely.
 *
 * Returns { ok, vowelSkeleton, finalConsonant, finalClass } — `ok: false`
 * means the syllable didn't match the expected shape (unusual spelling,
 * loanword, non-Thai characters) and rhyme against it should be UNCERTAIN,
 * never a hard failure.
 */
// Internal-only marker for the สระออ vowel in vowelSkeleton comparisons —
// see analyzeSyllable's comment. Private-use codepoint, never rendered.
const OO_VOWEL_MARKER = '';

export const analyzeSyllable = (syllable) => {
  if (!syllable) return { ok: false };

  const irregular = IRREGULAR_SYLLABLES[syllable];
  if (irregular) return { ok: true, ...irregular };

  let cleaned = syllable.replace(/[ก-ฮ]์/g, ''); // strip การันต์
  if (!cleaned || /[^ก-ฮเแโใไะ-๋]/.test(cleaned)) {
    return { ok: false }; // contains non-Thai-syllable characters (digits, latin, punctuation)
  }

  const hasLeadingVowel = /^[เแโใไ]/.test(cleaned);

  // Normalize away a compound-vowel glide (เอีย/เอือ/อัว/ออ) before counting
  // consonants — same rule as splitThaiSyllables' glide detection (see its
  // doc comment), kept in sync here since this function parses
  // independently. The reduced ว-ลาก spelling (no ั written, e.g. ห่วง)
  // gets ั inserted so it normalizes the same as the explicit form (กลัว).
  // ออ's bare อ has no dedicated combining mark to reuse, so it's replaced
  // with OO_VOWEL_MARKER — a private-use codepoint, never shown to users,
  // just distinct from ก-ฮ (won't be miscounted as a consonant) and from ั
  // (ออ and อัว are different rhymes, must not collapse together).
  if (hasLeadingVowel && cleaned.includes('ีย')) {
    cleaned = cleaned.replace('ีย', 'ี');
  } else if (hasLeadingVowel && cleaned.includes('ือ')) {
    cleaned = cleaned.replace('ือ', 'ื');
  } else if (!hasLeadingVowel) {
    const vIndex = cleaned.indexOf('ว');
    const oIndex = cleaned.indexOf('อ', 1); // index 0 would be the onset, not the vowel
    if (vIndex !== -1 && !/[ะาำ]/.test(cleaned.slice(0, vIndex))) {
      const before = cleaned.slice(0, vIndex);
      const after = cleaned.slice(vIndex + 1);
      cleaned = before.endsWith('ั') ? before + after : `${before}ั${after}`;
    } else if (oIndex !== -1 && !/[ะาำ]/.test(cleaned.slice(0, oIndex))) {
      cleaned = cleaned.slice(0, oIndex) + OO_VOWEL_MARKER + cleaned.slice(oIndex + 1);
    }
  }

  const consonants = cleaned.match(/[ก-ฮ]/g) || [];
  const endsWithConsonant = /[ก-ฮ]$/.test(cleaned);

  if (consonants.length === 0 || consonants.length > 2) {
    return { ok: false }; // no onset, or an onset cluster we can't confidently resolve
  }

  let core = cleaned;
  let finalConsonant = null;

  if (endsWithConsonant) {
    if (consonants.length === 1 && hasLeadingVowel) {
      // sole consonant is the onset (e.g. "เก") — no final
    } else if (consonants.length > 1) {
      finalConsonant = consonants[consonants.length - 1];
      core = cleaned.slice(0, -1);
    } else {
      return { ok: false }; // single consonant, ends with consonant, no leading vowel — malformed
    }
  }

  const vowelSkeleton = core.replace(/[ก-ฮ]/g, '').replace(/[่-๋]/g, '');
  if (!vowelSkeleton && !hasLeadingVowel) {
    return { ok: false }; // no recoverable vowel signal
  }

  return {
    ok: true,
    vowelSkeleton,
    finalConsonant,
    finalClass: finalConsonant ? (FINAL_CLASS.get(finalConsonant) ?? 'unknown') : 'NONE',
  };
};

/**
 * compareRhyme(a, b)
 * Compares two syllables for สัมผัสสระ (vowel rhyme). Never throws and
 * never returns a hard boolean — ambiguous parses come back UNCERTAIN so
 * callers can render them as warnings, not errors (poetic rhyme has
 * genuine edge cases a heuristic parser can't always resolve).
 */
export const compareRhyme = (a, b) => {
  const sa = analyzeSyllable(a);
  const sb = analyzeSyllable(b);

  if (!sa.ok || !sb.ok) return RhymeConfidence.UNCERTAIN;
  if (sa.finalClass === 'unknown' || sb.finalClass === 'unknown') return RhymeConfidence.UNCERTAIN;

  if (sa.vowelSkeleton !== sb.vowelSkeleton || sa.finalClass !== sb.finalClass) {
    return RhymeConfidence.NO_MATCH;
  }

  return sa.finalConsonant === sb.finalConsonant
    ? RhymeConfidence.EXACT
    : RhymeConfidence.LIKELY;
};
