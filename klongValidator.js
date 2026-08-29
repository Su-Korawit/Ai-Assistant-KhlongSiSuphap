import { isEk, isTho, compareRhyme, RhymeConfidence, countThaiSyllables } from './thaiSyllable.js';
import { BAHT_SCHEME, RHYME_GROUPS } from './klongRules.js';

const CONFIDENCE_ORDER = { EXACT: 0, LIKELY: 1, UNCERTAIN: 2, NO_MATCH: 3 };

// Only pure Thai-script words can be confidently syllable-counted — a word
// containing digits/Latin/punctuation (e.g. a test placeholder) isn't Thai
// text to begin with, so it's skipped rather than flagged (same
// never-hard-fail-on-unparseable-input rule compareRhyme follows).
const THAI_ONLY_RE = /^[ก-ฮเแโใไะ-๋]+$/;

/**
 * validateKlong(words)
 * words: string[4][] — words[bahtIndex][posIndex] (0-indexed), one Thai
 * word/syllable per slot. Missing/未-filled slots may be '' or undefined.
 *
 * Deterministic: this is the sole authority on structure, เอก/โท, and
 * rhyme-position correctness. Never overridden by the AI (Rule 3). Shared
 * between the browser (live editor feedback) and the server generation
 * pipeline (refinement loop) so both validate identically.
 *
 * Returns { complete, valid, score, errors, warnings, checks }.
 * - `complete`: every required slot has a word.
 * - `valid`: complete AND no errors (warnings alone don't block validity —
 *   an UNCERTAIN rhyme is a warning, never a hard failure, per the rhyme
 *   heuristic's known limits).
 * - `score`: null until complete (correctness isn't measurable on a
 *   partial poem); otherwise 0-100 weighted across tone + rhyme checks.
 */
export function validateKlong(words) {
  const errors = [];
  const warnings = [];
  const toneChecks = [];
  const rhymeChecks = [];

  let totalSlots = 0;
  let filledSlots = 0;

  BAHT_SCHEME.forEach((baht, b) => {
    const row = words[b] || [];
    for (let i = 0; i < baht.wordCount; i++) {
      const pos = i + 1;
      const word = (row[i] || '').trim();
      totalSlots++;
      if (word) filledSlots++;

      if (word && THAI_ONLY_RE.test(word) && countThaiSyllables(word) > 1) {
        errors.push({
          code: 'MULTI_SYLLABLE', baht: b, pos, word, severity: 'error',
          message: `${baht.label} คำที่ ${pos} ("${word}") มีมากกว่า 1 พยางค์ ต้องใช้คำพยางค์เดียวเท่านั้น`,
        });
      }

      const isEkPos = baht.ek.includes(pos);
      const isThoPos = baht.tho.includes(pos);
      if (!isEkPos && !isThoPos) continue;
      if (!word) continue; // not yet typed — not an error, just incomplete

      if (isEkPos) {
        const ok = isEk(word);
        toneChecks.push({ baht: b, pos, type: 'เอก', word, ok });
        if (!ok) {
          errors.push({
            code: 'TONE_EK_FAIL', baht: b, pos, word, severity: 'error',
            message: `${baht.label} คำที่ ${pos} ("${word}") ต้องเป็นคำเอกหรือคำตาย`,
          });
        }
      } else {
        const ok = isTho(word);
        toneChecks.push({ baht: b, pos, type: 'โท', word, ok });
        if (!ok) {
          errors.push({
            code: 'TONE_THO_FAIL', baht: b, pos, word, severity: 'error',
            message: `${baht.label} คำที่ ${pos} ("${word}") ต้องเป็นคำโท`,
          });
        }
      }
    }
  });

  RHYME_GROUPS.forEach((group) => {
    const vals = group.map(g => ((words[g.baht] || [])[g.pos - 1] || '').trim());
    if (vals.some(v => !v)) return; // group not fully typed yet — skip, not an error

    const base = vals[0];
    let worst = RhymeConfidence.EXACT;
    const pairs = [];
    for (let i = 1; i < vals.length; i++) {
      const confidence = compareRhyme(base, vals[i]);
      pairs.push({ from: group[0], to: group[i], confidence });
      if (CONFIDENCE_ORDER[confidence] > CONFIDENCE_ORDER[worst]) worst = confidence;
    }

    rhymeChecks.push({ group, words: vals, confidence: worst, pairs });

    if (worst === RhymeConfidence.NO_MATCH) {
      errors.push({
        code: 'RHYME_FAIL', group, words: vals, severity: 'error',
        message: `คำสัมผัส "${vals.join('", "')}" ไม่คล้องจองกัน`,
      });
    } else if (worst === RhymeConfidence.UNCERTAIN) {
      warnings.push({
        code: 'RHYME_UNCERTAIN', group, words: vals, severity: 'warning',
        message: `ไม่แน่ใจว่าคำสัมผัส "${vals.join('", "')}" คล้องจองกันหรือไม่ — ควรให้ผู้เชี่ยวชาญตรวจทานอีกครั้ง`,
      });
    }
  });

  const complete = filledSlots === totalSlots;
  const valid = complete && errors.length === 0;

  let score = null;
  if (complete) {
    const requiredTones = toneChecks.length;
    const correctTones = toneChecks.filter(t => t.ok).length;
    const rhymeGroupsTotal = RHYME_GROUPS.length;
    const rhymeGroupsOk = rhymeChecks.filter(
      r => r.confidence === RhymeConfidence.EXACT || r.confidence === RhymeConfidence.LIKELY
    ).length;
    const denom = requiredTones + rhymeGroupsTotal;
    score = denom > 0 ? Math.round(((correctTones + rhymeGroupsOk) / denom) * 100) : 100;
  }

  return {
    complete,
    valid,
    score,
    errors,
    warnings,
    checks: {
      structure: { totalSlots, filledSlots },
      tone: toneChecks,
      rhyme: rhymeChecks,
    },
  };
}
