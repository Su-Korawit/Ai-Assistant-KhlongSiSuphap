# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server (also serves /api locally, see below)
npm run build      # production build to dist/
npm run preview    # preview the production build
npm test           # vitest run (all tests)
npx vitest run thaiSyllable.test.js       # single test file
npx vitest run -t "name of test"          # single test by name
```

No lint/typecheck script configured (plain JS, no TS, no ESLint config present).

## Architecture

Vite + React SPA (not Next.js — no router, no server components, no `app/`
directory). Entry: `main.jsx` → `App.jsx` (single file, all components).
Deployed to Vercel as `krulintiphat.vercel.app`.

### Pure logic modules vs. React

`thaiSyllable.js`, `klongRules.js`, and `klongValidator.js` have **no
React/DOM dependency on purpose** — they run both in the browser (live
validation inside the `KlongEditor` UI in `App.jsx`) and on the server
(`api/generate-klong.js`, inside the AI refinement loop). This is the one
architectural rule to preserve: changes to poetry-rule logic belong in
these three files, not duplicated into `App.jsx` or the API handler.

- `thaiSyllable.js` — Thai syllable segmentation (hand-written scanner, not
  a single regex — see the comment above `splitThaiSyllables` for why),
  เอก/โท/คำตาย detection, and the rhyme comparator (`compareRhyme`, returns
  one of `EXACT/LIKELY/UNCERTAIN/NO_MATCH` — ambiguous parses are
  `UNCERTAIN`, never a hard failure).
- `klongRules.js` — `BAHT_SCHEME` (word counts, เอก/โท positions per บาท)
  and `RHYME_GROUPS` (which positions must rhyme across บาท). This is the
  single source of truth: the Gemini prompt in `api/generate-klong.js` is
  generated *from* this file, and `klongValidator.js` validates *against*
  it — so a rule change here updates both automatically.
- `klongValidator.js` — `validateKlong(words)` takes `words: string[4][]`
  (one Thai syllable per slot, `words[bahtIndex][posIndex]`) and returns
  `{ complete, valid, score, errors, warnings, checks }`. This is the sole
  authority on correctness; the AI never overrides it.

### Irregular Thai spellings — dictionary vs. scanner rule

Three fixes layered onto `thaiSyllable.js` for spellings the general scanner
gets wrong, using two different mechanisms depending on *why* they're wrong:

- **`irregularSyllables.js`** — a lexical exception dictionary (ไซร้, จริง,
  ทราย, ทราบ, แทรก, ทรง, ทรวง, ทรุด, โทรม), consulted first in both
  `splitThaiSyllables` (longest-match at the current scan position) and
  `analyzeSyllable` (exact match on the whole syllable). These are silent-ร
  spellings (ร with no การันต์ mark, or the ทร→ซ pronunciation shift) where
  *which words are affected can't be derived from the spelling itself* —
  จริง has a silent ร but จรัส/จรวด don't, so a general "ร after this
  consonant is silent" rule would break those. `isEk`/`isTho`/`isDeadWord`
  deliberately do **not** consult this dictionary: they key off the last
  literal consonant / literal tone mark, which a silent *medial* ร never
  disturbs, so they already give the right answer unassisted.
- **ร หัน (รร ซ้อน) handling** — inline in `splitThaiSyllables`, checked
  immediately after the onset consonant, before the CLUSTERS/ห-นำ pair
  check (a real CLUSTERS entry like `'กร'` would otherwise swallow the
  first ร of "กรรม" as a cluster). Not in the dictionary: this is a genuine
  orthographic rule that applies uniformly to *any* onset (กรรม, ธรรม,
  สรรพ, บรรจุ all follow the same ะ+final / implicit-ัน branching), so it's
  cheaper and more correct as scanner logic than as one dictionary entry
  per รร-word.
- **ไ/ใ normalization** — one line in `analyzeSyllable`'s `vowelSkeleton`
  computation (`.replace(/ใ/g, 'ไ')`). ไม้มลาย and ไม้ม้วน are always the
  same sound in modern Thai with no exceptions, so this is an
  unconditional normalize, not a dictionary lookup.

**The rule for next time:** if whether a spelling is irregular depends on
*which word it is* (some ร-after-X words are silent, some aren't) →
dictionary entry in `irregularSyllables.js`. If it's a *pattern that always
applies regardless of the specific word* → scanner/normalize logic. ฤ/ฤๅ
(ฤทธิ์=ริด, ฤกษ์=เริก, พฤกษ์=พรึก — each word reads differently) are the
next known case and are word-specific → dictionary, not a rule.

### `api/generate-klong.js` — dev/prod parity

Written against raw Node `req`/`res` (not Vercel-specific helpers), so the
exact same handler runs as a Vercel serverless function in production AND
under a Vite dev-server middleware locally (registered in
`vite.config.js`). Don't introduce `@vercel/node` helpers (`res.json()`,
etc.) here — it would break local dev parity.

Flow: build prompt from `klongRules.js` → call Gemini → `validateKlong` →
if invalid, send it the specific errors and ask it to fix just those →
repeat up to `MAX_REFINE_ATTEMPTS` → return the best-scoring attempt seen
(never returns nothing, never loops unbounded).

`thinkingConfig.thinkingBudget` is deliberately set to `0`. Default
thinking on gemini-2.5-flash measured ~45-90s per call in testing, which
risks exceeding Vercel's function timeout (60s max on Hobby,
`maxDuration: 60` is set as a safety margin) well before a multi-attempt
refinement loop finishes. With thinking disabled, calls run ~3-8s; the
refinement loop and `validateKlong` compensate for the resulting lower
single-shot quality. If you revisit this tradeoff, re-measure — don't
assume either latency or quality numbers still hold across model versions.

### Environment variable — the one landmine

`GEMINI_API_KEY` must **never** get a `VITE_` prefix. Vite bundles
`VITE_`-prefixed vars straight into client-side JS — that's exactly how
this key was previously leaking to every browser that loaded the site
(fixed by moving the call server-side into `api/generate-klong.js`).

Vite does not put non-`VITE_` vars on `process.env` for you either — the
custom `apiDevMiddleware` in `vite.config.js` needs the key at runtime, so
`vite.config.js` explicitly calls Vite's `loadEnv()` and copies
`GEMINI_API_KEY` onto `process.env` itself. On Vercel, the platform
injects the env var directly, so no equivalent step is needed there — but
it does mean the var must be set in the Vercel project settings
separately from `.env` (which is gitignored and never deployed).

### `KlongEditor` input model

The editor uses one `<input>` per syllable position (`SyllableSlot`), not
free-text fields per clause. This is intentional: splitting continuous
Thai text into syllables algorithmically is inherently ambiguous (see the
segmenter's doc comment), so the UI sidesteps it by having the user (or
the AI generator) supply one syllable per slot directly. `words` state
shape is `string[4][]` matching `BAHT_SCHEME`'s `wordCount`s (`[7,7,7,9]`).
