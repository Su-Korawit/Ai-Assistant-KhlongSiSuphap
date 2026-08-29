# AUTONOMOUS IMPLEMENTATION MODE
## Klong AI Algorithm Upgrade + Reference Feature Integration

You are an autonomous senior full-stack engineer specializing in:

- React
- Next.js
- TypeScript
- Thai language processing
- Thai poetry / Klong validation
- AI application architecture
- deterministic rule engines
- LLM integration
- UX/accessibility
- production performance

You have access to the existing project and the reference project.

---

# 1. PROJECTS

## Existing production project

https://krulintiphat.vercel.app/

This is the project you must improve.

Do NOT replace it with the reference project.

---

## Reference project

Local path:

`D:\Ikkyusan\Downloads\klong-ai-app-20260829T110820Z-1-001\klong-ai-app`

Use this project as a source of:

- poetry rules
- validation concepts
- UX ideas
- gamification concepts
- contemporary prompt/theme concepts
- implementation references

Do NOT assume that the reference implementation is automatically better.

Inspect the actual source code before adopting anything.

---

# 2. AUTONOMOUS MODE

You are authorized to:

- inspect the codebase
- modify source files
- create new files
- refactor existing files
- add tests
- add utility modules
- improve algorithms
- improve components
- improve prompts
- improve API architecture
- fix bugs
- run tests
- run builds
- benchmark
- iterate on your own implementation

Do NOT wait for approval between normal implementation steps.

You should independently make reasonable engineering decisions.

However, you MUST follow the constraints below.

---

# 3. NON-NEGOTIABLE RULES

## Rule 1 — Do not rewrite the entire project

Prefer incremental improvement.

Do not replace the architecture just because you prefer another architecture.

Only perform a major architectural change if there is a concrete technical reason.

---

## Rule 2 — Do not blindly copy the reference project

The reference project is a prototype.

Its README explicitly describes it as a static HTML/CSS/JS application with rule-based validation.

Use its ideas selectively.

Inspect implementation before integration.

---

## Rule 3 — Deterministic rules beat the LLM

Any rule that can be reliably checked with deterministic code MUST be checked with deterministic code.

Examples:

- verse structure
- word/syllable counts
- required positions
- ek positions
- tho positions
- explicit rhyme positions
- dead-syllable rules

The LLM must never be the final authority for these hard constraints.

---

## Rule 4 — Do not solve everything with prompts

Do not fix algorithmic problems by endlessly adding instructions to an LLM prompt.

If the problem can be solved with code, solve it with code.

Use AI where semantic/language intelligence is actually required.

---

## Rule 5 — Preserve working features

Before changing anything:

Understand what currently works.

Do not remove working behavior unless:

1. it is demonstrably incorrect,
2. it conflicts with the new architecture,
3. or replacing it produces a measurable improvement.

---

## Rule 6 — No secrets in the browser

Never expose:

- API keys
- private credentials
- service account credentials
- secret environment variables

to client-side code.

---

## Rule 7 — Test every important algorithmic change

Every meaningful change to:

- rhyme detection
- structure validation
- scoring
- syllable logic
- tone logic
- generation/refinement

must have regression tests.

---

# 4. USE THE THREE INSTALLED SKILLS

You have these skills available:

## `vercel-composition-patterns`

Use it when:

- designing React components
- refactoring component architecture
- deciding component boundaries
- managing state ownership
- using composition
- deciding props vs children
- separating Server and Client Components

Do not create unnecessary abstractions.

---

## `vercel-react-best-practices`

Use it when:

- optimizing React/Next.js
- designing server/client boundaries
- improving rendering
- optimizing data fetching
- optimizing AI requests
- avoiding waterfalls
- reducing unnecessary JavaScript
- reducing unnecessary re-renders
- improving caching

---

## `web-design-guidelines`

Use it when:

- changing UI
- adding features
- improving validation feedback
- improving accessibility
- improving responsive behavior
- improving loading/error/empty states
- reviewing interaction design

---

# 5. FIRST ACTION — FULL CODEBASE AUDIT

Before making changes, inspect:

## Existing project

Analyze:

- package.json
- project structure
- app/pages structure
- components
- API routes
- server actions
- AI integration
- prompts
- validators
- scoring
- state management
- database/storage
- environment variables
- tests
- build configuration

Search the entire repository for:

```text
rhyme
syllable
tone
ek
tho
klong
verse
score
validate
generate
prompt
AI
model
```

Identify the actual implementation.

Do not assume filenames.

---

# 6. AUDIT THE REFERENCE PROJECT

Inspect:

```text
D:\Ikkyusan\Downloads\klong-ai-app-20260829T110820Z-1-001\klong-ai-app
```

At minimum inspect:

```text
README
index.html
css/style.css
js/scheme.js
js/checker.js
js/prompts.js
js/game.js
js/main.js
```

The reference README describes:

### Module A

`scheme.js` + `checker.js`

Responsible for:

- Thai poetic structure
- ek
- tho
- rhyme
- real-time checking

### Module B

`game.js`

Responsible for:

- 3 challenge levels
- scoring
- achievements

### Module C

`prompts.js`

Responsible for contemporary themes.

Verify all of these against the actual code.

---

# 7. CREATE AN INTERNAL IMPLEMENTATION PLAN

Before editing, create a plan internally containing:

```text
Current Architecture
Reference Architecture
Algorithm Differences
Critical Bugs
Feature Opportunities
Migration Strategy
Testing Strategy
Benchmark Strategy
```

You do NOT need to stop and ask for approval.

Proceed automatically.

---

# 8. PRIORITIZATION

Prioritize work in this order:

```text
P0 — Correctness
P1 — Algorithm quality
P2 — Reliability
P3 — Performance
P4 — UX
P5 — Additional features
P6 — Cosmetic improvements
```

Never prioritize cosmetic improvements over correctness.

---

# 9. BUILD A STRONG VALIDATION ENGINE

The target architecture should conceptually become:

```text
                    USER
                     │
                     ▼
              Input / Context
                     │
                     ▼
            Candidate Generator
                  (AI)
                     │
                     ▼
              Candidate Pool
                     │
                     ▼
        ┌─────────────────────────┐
        │ Deterministic Validator │
        │                         │
        │ Structure               │
        │ Word/Syllable           │
        │ Ek / Tho                │
        │ Rhyme                   │
        │ Hard Constraints        │
        └────────────┬────────────┘
                     │
                     ▼
              Hard Filtering
                     │
                     ▼
             AI Quality Judge
                     │
                     ▼
             Multi-dimensional
                 Scoring
                     │
                     ▼
                Ranking
                     │
                     ▼
              Refinement Loop
                     │
                     ▼
               Best Result
```

Adapt this architecture to the existing project instead of blindly implementing it literally.

---

# 10. HARD VALIDATION

Implement deterministic validation for all rules that can reliably be computed.

The reference project describes these rules:

- verses 1–3: 7 words each (5+2)
- verse 4: 9 words (5+4)
- 30 words total
- 7 ek positions
- 4 tho positions
- inter-verse rhyme relationships
- dead syllables may substitute for ek positions

Verify the actual reference implementation before using these rules.

Do not assume its implementation is perfect.

---

# 11. VALIDATION RESULT

The validator should return structured information rather than only:

```ts
boolean
```

Prefer a structure conceptually similar to:

```ts
{
  valid: boolean,

  score: number,

  errors: [],

  warnings: [],

  checks: {
    structure: {},
    syllable: {},
    tone: {},
    rhyme: {}
  }
}
```

Adapt the schema to the current project's architecture.

The system must be able to identify:

- what failed
- where it failed
- why it failed
- severity
- confidence
- whether the issue is automatically fixable

---

# 12. RHYME ENGINE — HIGH PRIORITY

The reference project uses a simple `rhymeKey` heuristic.

Its README explicitly says this is:

- a simple heuristic
- based on the final characters
- not full phonological analysis
- uncertain cases should be treated as warnings

Therefore:

DO NOT simply copy it and call it production-grade rhyme detection.

Inspect the existing rhyme implementation first.

Then improve it where technically feasible.

Preferred conceptual pipeline:

```text
Thai text
 ↓
Normalize
 ↓
Tokenize / syllabify
 ↓
Extract phonological features
 ↓
Vowel/rime
 ↓
Final consonant
 ↓
Tone
 ↓
Rhyme representation
 ↓
Compatibility
```

Support confidence:

```text
EXACT
LIKELY
UNCERTAIN
NO_MATCH
```

Do not turn uncertain linguistic cases into hard failures.

---

# 13. AI + DETERMINISTIC HYBRID

Use AI for:

- candidate generation
- semantic evaluation
- fluency
- naturalness
- creativity
- thematic relevance
- refinement

Use deterministic code for:

- structural validation
- explicit poetry rules
- hard constraints
- measurable scoring

The AI must not override deterministic validation.

---

# 14. CANDIDATE GENERATION

If appropriate, generate multiple candidates.

For example:

```text
Candidate A
Candidate B
Candidate C
Candidate D
Candidate E
```

Then:

```text
Generate
 ↓
Validate
 ↓
Filter
 ↓
Score
 ↓
Rank
 ↓
Refine top candidates
```

Do not automatically generate many candidates if the additional cost does not justify the quality improvement.

Choose a reasonable number based on the existing application and model/API constraints.

---

# 15. REFINEMENT LOOP

When a candidate fails:

```text
Generate
 ↓
Validate
 ↓
Extract failures
 ↓
Send targeted feedback to AI
 ↓
Regenerate/refine
 ↓
Validate again
```

Set a hard maximum iteration count.

Never allow an uncontrolled loop.

Track:

- attempts
- latency
- API calls
- token usage
- final score

---

# 16. SCORING

Implement multi-dimensional scoring.

At minimum consider:

```text
Structure
Rhyme
Tone
Language
Fluency
Semantic Coherence
Topic Relevance
Creativity
```

Keep correctness and creativity separate.

For example:

```text
Poetic Correctness: 92
Language Quality: 86
Creativity: 74
Overall Quality: 87
```

Do not imply that perfect poetic structure automatically means high creativity.

---

# 17. REFERENCE FEATURES

Evaluate and integrate where appropriate:

### Free Practice

Practice without time pressure or competitive scoring.

### Challenge Mode

Progressive difficulty.

### Contemporary Themes

Environment, online life, health, and other expandable themes.

### Real-time Checker

Immediate feedback while editing.

### Score / Achievements

Gamification where appropriate.

Do not force these features into the application if they conflict with the existing product UX.

---

# 18. COMPONENT ARCHITECTURE

Use `vercel-composition-patterns`.

Refactor only where justified.

Avoid giant components responsible for:

- AI calls
- validation
- scoring
- rendering
- state
- API logic

at the same time.

Separate responsibilities appropriately.

Use composition where it improves maintainability.

Do not create abstraction purely for abstraction's sake.

---

# 19. PERFORMANCE

Use `vercel-react-best-practices`.

Audit:

- AI request waterfalls
- sequential independent API requests
- duplicate API calls
- unnecessary re-renders
- unnecessary client-side JavaScript
- Server/Client boundaries
- caching
- bundle size
- repeated validation
- token usage

Where independent operations exist, consider parallelization.

But do not sacrifice reliability for premature optimization.

---

# 20. UX

Use `web-design-guidelines`.

Improve:

- mobile usability
- responsive design
- accessibility
- keyboard navigation
- semantic HTML
- validation feedback
- loading states
- error states
- empty states
- AI generation progress
- score explanations

The UI should distinguish:

```text
VALID
INVALID
WARNING
UNCERTAIN
```

Do not display every failure as a generic red error.

---

# 21. SECURITY

Inspect:

- API keys
- environment variables
- server/client boundaries
- API endpoints
- user input
- prompt injection
- abuse
- rate limits
- AI output handling

Fix obvious security problems discovered during the audit.

Do not expose secrets.

---

# 22. TESTING

Add or improve tests.

At minimum test:

### Structure

- valid poem
- invalid word count
- invalid verse structure

### Ek / Tho

- valid ek
- invalid ek
- valid tho
- invalid tho
- dead syllable substitution

### Rhyme

- valid rhyme
- invalid rhyme
- uncertain rhyme
- Thai pronunciation edge cases

### Input

- punctuation
- whitespace
- English
- numbers
- names
- unusual Thai words
- repeated words

### AI failures

- malformed output
- incomplete output
- invalid output
- timeout
- API failure
- retry

---

# 23. REGRESSION PROTECTION

Before modifying an existing algorithm:

Capture its current behavior.

Create regression tests for important existing cases.

After modification:

Run the old cases again.

Do not improve one case while silently breaking five existing cases.

---

# 24. BENCHMARK

Establish baseline metrics before significant algorithm changes.

Measure:

```text
Structural accuracy
Rhyme accuracy
Tone accuracy
False positive rate
False negative rate
AI success rate
Average latency
API calls
Token usage
```

After implementation, compare against baseline.

If a change improves correctness but significantly increases cost or latency, evaluate the tradeoff.

Do not hide regressions.

---

# 25. ITERATIVE DEVELOPMENT LOOP

Work continuously using this loop:

```text
Inspect
 ↓
Plan
 ↓
Implement
 ↓
Run tests
 ↓
Run build
 ↓
Inspect failures
 ↓
Fix
 ↓
Benchmark
 ↓
Review
 ↓
Repeat
```

Do not stop after the first successful build.

A successful build does NOT mean the algorithm is correct.

---

# 26. BUILD / TEST REQUIREMENTS

After implementation:

1. Run the project's test suite.
2. Run type checking if available.
3. Run linting if available.
4. Run production build.
5. Fix all errors caused by your changes.
6. Review warnings.
7. Run algorithm regression tests.
8. Run benchmark tests.

Do not leave the project in a broken build state.

---

# 27. CHANGE MANAGEMENT

Keep changes focused.

Do not modify unrelated files.

Do not upgrade dependencies unless necessary.

Do not introduce a new library if the existing stack can solve the problem cleanly.

Do not rewrite working components just for stylistic preference.

---

# 28. AUTONOMOUS DECISION RULE

When you encounter ambiguity:

### If the decision is low-risk:

Make the decision yourself and continue.

### If there are multiple technically reasonable options:

Choose the simplest production-safe option.

### If the change could destroy existing data, authentication, production infrastructure, or cause irreversible damage:

STOP and ask for confirmation.

Do not make destructive or irreversible changes autonomously.

---

# 29. STOP CONDITIONS

You may stop autonomous work only when:

- implementation is complete
- tests pass
- production build passes
- major algorithm regressions are resolved
- benchmark has been run
- UX audit is complete
- performance issues are addressed
- security issues introduced by the changes are resolved

If a non-critical issue remains, document it instead of blocking the entire project.

---

# 30. FINAL REPORT

When finished, provide a concise but technical final report.

Use this structure:

## 1. What Changed

List major changes.

## 2. Algorithm Improvements

Explain:

- validation
- rhyme
- tone
- scoring
- candidate generation
- refinement

## 3. Features Integrated

List reference features that were adopted.

## 4. Features Rejected

Explain important reference features that were intentionally NOT adopted.

## 5. Architecture Changes

Explain meaningful component/API changes.

## 6. Performance

Report:

- latency
- API calls
- token usage
- important optimizations

## 7. Testing

Report:

- tests added
- tests passed
- regression tests
- build status

## 8. Benchmark

Show:

| Metric | Before | After |
|---|---:|---:|
| Structure | | |
| Rhyme | | |
| Tone | | |
| False Positive | | |
| False Negative | | |
| Latency | | |
| AI Calls | | |
| Token Usage | | |

Do not fabricate numbers.

If a metric could not be measured, explicitly say:

`Not measured`

## 9. Remaining Limitations

Be honest about unresolved issues.

## 10. Recommended Next Steps

Only include genuinely useful next steps.

---

# 31. FINAL PRINCIPLE

Do not optimize for:

> “The code looks impressive.”

Optimize for:

> **“The system produces measurably better Thai poetry, validates it reliably, explains errors clearly, and remains maintainable and affordable in production.”**

The reference project is a source of useful ideas and rules.

The existing `krulintiphat` project is the product that must survive.

Improve it incrementally.

Do not blindly copy.

Do not blindly rewrite.

Use deterministic algorithms for deterministic problems.

Use AI for problems that actually require intelligence.

And always verify your work with tests and measurable evidence.