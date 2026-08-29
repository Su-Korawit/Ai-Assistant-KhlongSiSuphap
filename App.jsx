import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Send, Loader2, ArrowRight, AlertCircle, AlertTriangle, Trash2, CheckCircle2, Save, Lock, Shuffle } from 'lucide-react';
import { BAHT_SCHEME } from './klongRules.js';
import { validateKlong } from './klongValidator.js';
import { THEMES, getRandomTheme } from './klongPrompts.js';
import { loadProgress, saveProgress } from './progressStore.js';

// --- Styles Injection ---
// Inject Google Fonts and Custom Utility Classes for Pixel Art Aesthetic
const Styles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@600;700&family=Sarabun:wght@400;500&display=swap');

    :root {
      --c-cream: #F5F0E8;
      --c-parchment: #FAF4E8;
      --c-sage: #7A9E7E;
      --c-sage-light: #A8C5A0;
      --c-sage-dark: #5A7A5E;
      --c-sky-light: #D0E8F2;
      --c-charcoal: #2C2C2C;
      --c-brick: #C0392B;
      --c-gold: #D4AF37;
    }

    .font-heading { font-family: 'Kanit', sans-serif; }
    .font-body { font-family: 'Sarabun', sans-serif; }

    /* Component Patterns */
    .btn-pixel {
      font-family: 'Sarabun', sans-serif;
      font-weight: 500;
      border: 3px solid var(--c-charcoal);
      box-shadow: 4px 4px 0px var(--c-charcoal);
      transition: all 0.1s ease-in-out;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .btn-pixel:hover:not(:disabled) {
      transform: translateY(-2px);
    }
    .btn-pixel:active:not(:disabled) {
      transform: translate(4px, 4px) !important;
      box-shadow: none !important;
    }
    .btn-pixel:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary { background-color: var(--c-sage); color: white; }
    .btn-secondary { background-color: var(--c-cream); color: var(--c-charcoal); }
    .btn-danger { background-color: var(--c-brick); color: white; }

    .card-pixel {
      background-color: var(--c-parchment);
      border: 3px solid var(--c-charcoal);
      box-shadow: 4px 4px 0px var(--c-charcoal);
      border-radius: 0;
    }

    .input-pixel {
      background-color: var(--c-parchment);
      border: 2px solid var(--c-charcoal);
      outline: none;
      transition: border-color 0.2s;
      font-family: 'Sarabun', sans-serif;
      color: var(--c-charcoal);
    }
    .input-pixel:focus {
      border-color: var(--c-sage);
    }

    .badge-pixel {
      border: 2px solid var(--c-charcoal);
      box-shadow: 2px 2px 0px var(--c-charcoal);
    }

    .syllable-slot {
      width: 3.25rem;
    }
    .syllable-input {
      width: 100%;
      text-align: center;
      padding: 0.5rem 0.25rem;
    }
    .syllable-input.status-ok { border-color: var(--c-sage) !important; background-color: rgba(122,158,126,0.1); }
    .syllable-input.status-bad { border-color: var(--c-brick) !important; background-color: rgba(192,57,43,0.08); }
    .rhyme-underline { height: 3px; margin-top: 2px; }
    .rhyme-underline.ok { background-color: var(--c-sage); }
    .rhyme-underline.warn { background-color: var(--c-gold); }
    .rhyme-underline.bad { background-color: var(--c-brick); }
  `}} />
);

// --- Empty poem state ---

const createEmptyWords = () => BAHT_SCHEME.map(b => Array(b.wordCount).fill(''));

// toneMap/rhymeMap are keyed `${bahtIndex}-${pos}` -> ok/confidence, shared
// by any board reading a validateKlong() result (full editor, challenge levels).
const buildToneRhymeMaps = (validation) => {
  const toneMap = new Map();
  validation.checks.tone.forEach(t => toneMap.set(`${t.baht}-${t.pos}`, t.ok));
  const rhymeMap = new Map();
  validation.checks.rhyme.forEach(r => {
    r.group.forEach(g => rhymeMap.set(`${g.baht}-${g.pos}`, r.confidence));
  });
  return { toneMap, rhymeMap };
};

// --- Sub-components ---

const SyllableSlot = ({ bahtIndex, pos, value, onChange, toneMap, rhymeMap }) => {
  const key = `${bahtIndex}-${pos}`;
  const baht = BAHT_SCHEME[bahtIndex];
  const isEkPos = baht.ek.includes(pos);
  const isThoPos = baht.tho.includes(pos);
  const toneOk = toneMap.get(key); // undefined = not required or not yet filled
  const rhymeConfidence = rhymeMap.get(key); // undefined = not a rhyme position or not yet filled

  let statusClass = '';
  if ((isEkPos || isThoPos) && value.trim()) {
    statusClass = toneOk ? 'status-ok' : 'status-bad';
  }

  let underlineClass = '';
  if (rhymeConfidence === 'EXACT' || rhymeConfidence === 'LIKELY') underlineClass = 'ok';
  else if (rhymeConfidence === 'UNCERTAIN') underlineClass = 'warn';
  else if (rhymeConfidence === 'NO_MATCH') underlineClass = 'bad';

  return (
    <div className="syllable-slot flex flex-col items-center gap-1">
      <span className="text-[10px] font-bold text-[#997300] h-3">
        {isEkPos ? 'เอก' : isThoPos ? 'โท' : ''}
      </span>
      <input
        type="text"
        maxLength={12}
        className={`syllable-input input-pixel text-sm font-medium ${statusClass}`}
        value={value}
        onChange={(e) => onChange(pos, e.target.value)}
        aria-label={`${baht.label} คำที่ ${pos}`}
      />
      <div className={`rhyme-underline w-full ${underlineClass}`} />
      <span className="text-[10px] text-[#A3A3A3]">{pos}</span>
    </div>
  );
};

const BahtRow = ({ bahtIndex, words, onChangeWord, toneMap, rhymeMap, positions: positionsOverride }) => {
  const baht = BAHT_SCHEME[bahtIndex];
  const positions = positionsOverride || Array.from({ length: baht.wordCount }, (_, i) => i + 1);

  return (
    <div className="card-pixel flex flex-col">
      <div className="bg-[#7A9E7E] text-white font-heading font-bold px-4 py-2 border-b-[3px] border-[#2C2C2C] text-lg">
        {baht.label}
      </div>
      <div className="p-5 md:p-6 flex flex-wrap gap-3 bg-[#FAF4E8]">
        {positions.map((pos) => (
          <React.Fragment key={pos}>
            <SyllableSlot
              bahtIndex={bahtIndex}
              pos={pos}
              value={words[pos - 1] || ''}
              onChange={onChangeWord}
              toneMap={toneMap}
              rhymeMap={rhymeMap}
            />
            {pos === baht.vakSplit && pos !== positions[positions.length - 1] && (
              <div className="w-2" aria-hidden="true" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const ValidationSummary = ({ validation }) => {
  if (!validation.complete) {
    const { filledSlots, totalSlots } = validation.checks.structure;
    return (
      <div className="flex items-center gap-2 p-3 bg-[#E5E5E5] text-[#737373] border-2 border-[#A3A3A3] font-body text-sm font-bold">
        พิมพ์แล้ว {filledSlots}/{totalSlots} คำ
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 p-3 border-[3px] font-body font-bold text-sm ${
        validation.valid
          ? 'bg-[#7A9E7E]/10 border-[#7A9E7E] text-[#5A7A5E]'
          : 'bg-[#C0392B]/10 border-[#C0392B] text-[#C0392B]'
      }`}>
        {validation.valid ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
        {validation.valid ? `ถูกต้องตามฉันทลักษณ์ (คะแนน ${validation.score})` : `พบข้อผิดพลาด ${validation.errors.length} จุด (คะแนน ${validation.score})`}
      </div>
      {validation.errors.map((e, i) => (
        <div key={`err-${i}`} className="flex items-start gap-2 p-2 bg-[#C0392B]/5 text-[#C0392B] text-xs font-body font-bold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {e.message}
        </div>
      ))}
      {validation.warnings.map((w, i) => (
        <div key={`warn-${i}`} className="flex items-start gap-2 p-2 bg-[#D4AF37]/10 text-[#997300] text-xs font-body font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {w.message}
        </div>
      ))}
    </div>
  );
};

const AIAssistant = ({ onGenerated, markComplete, initialTopic, onTopicApplied }) => {
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
      textareaRef.current?.focus();
      onTopicApplied?.();
    }
  }, [initialTopic]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/generate-klong', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างโคลง');

      setResult(data);
      setStatus('success');
      markComplete('aiAssistant');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการสร้างโคลง');
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') handleGenerate();
  };

  return (
    <section id="ผู้ช่วยทรงปัญญา" className="py-12 bg-[#D0E8F2]/40 border-b-[3px] border-[#2C2C2C]">
      <div className="max-w-2xl mx-auto px-4">
        <div className="card-pixel p-6 md:p-8">

          <div className="text-center mb-8">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#2C2C2C] mb-4">
              ผู้ช่วยทรงปัญญา
            </h2>
            <div className="w-16 h-1.5 bg-[#2C2C2C] mx-auto pixel-border shadow-[2px_2px_0px_#2C2C2C]" />
          </div>

          <div className="mb-6 relative">
            <textarea
              ref={textareaRef}
              className="w-full h-28 p-4 input-pixel resize-none text-base"
              placeholder="พิมพ์หัวข้อที่ต้องการแต่งโคลง เช่น ธรรมชาติ, ความรัก, พระคุณแม่ (กด Ctrl+Enter เพื่อส่ง)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={status === 'loading'}
            />
            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || status === 'loading'}
              className="absolute bottom-4 right-4 btn-pixel btn-primary px-4 py-2"
            >
              {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> สร้างโคลง</>}
            </button>
          </div>

          {status === 'loading' && (
            <div className="space-y-4 p-6 border-[3px] border-[#2C2C2C] bg-[#FAF4E8]">
              {['w-[80%]', 'w-[65%]', 'w-[72%]', 'w-[55%]'].map((width, i) => (
                <div
                  key={i}
                  className={`h-4 bg-[#7A9E7E]/30 animate-pulse ${width} border border-[#7A9E7E]/50`}
                  style={{ animationDelay: `${i * 200}ms`, animationDuration: '1.4s' }}
                />
              ))}
              <p className="text-center font-body font-bold text-[#5A7A5E] pt-2 animate-pulse">
                ระบบกำลังเรียงร้อยถ้อยคำและตรวจฉันทลักษณ์...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 p-4 bg-[#C0392B]/10 text-[#C0392B] border-[3px] border-[#C0392B]">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <p className="font-body font-bold">{errorMsg}</p>
            </div>
          )}

          {status === 'success' && result && (
            <div className={`p-6 border-[3px] space-y-4 ${
              result.meetsThreshold
                ? 'bg-[#F5F0E8] border-[#2C2C2C]'
                : 'bg-[#D4AF37]/10 border-[#D4AF37]'
            }`}>
              {!result.meetsThreshold && (
                <div className="flex items-start gap-2 text-[#997300] font-body font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  ยังไม่ผ่านเกณฑ์ฉันทลักษณ์ (คะแนน {result.validation.score ?? 0}/100) — นี่คือความพยายามที่ดีที่สุดที่ระบบทำได้ ตรวจแก้ต่อได้ในตัวแก้ไขด้านล่าง
                </div>
              )}
              <div className="space-y-3 font-body text-[#2C2C2C] text-lg font-medium">
                {result.baht.map((row, idx) => {
                  const vakSplit = BAHT_SCHEME[idx].vakSplit;
                  return (
                    <div key={idx} className="flex gap-4">
                      <span className="text-[#A8C5A0] font-bold select-none">{idx + 1}.</span>
                      <p>{row.slice(0, vakSplit).join('')} {row.slice(vakSplit).join('')}</p>
                    </div>
                  );
                })}
              </div>
              {result.meetsThreshold && !result.validation.valid && (
                <p className="text-xs font-body font-bold text-[#997300]">
                  หมายเหตุ: ระบบพยายามแก้ไข {result.attempts} ครั้ง ยังมีจุดที่ไม่สมบูรณ์ — แก้ไขเพิ่มเติมได้ในตัวแก้ไขด้านล่าง
                </p>
              )}
              <button
                onClick={() => onGenerated(result.baht)}
                className="w-full btn-pixel btn-secondary py-3 px-4 font-bold text-lg"
              >
                นำไปแก้ไขใน KlongEditor <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};

const KlongEditor = ({ prefillBaht, markComplete }) => {
  const [words, setWords] = useState(createEmptyWords());

  useEffect(() => {
    if (prefillBaht && prefillBaht.length === 4) {
      setWords(prefillBaht.map(row => [...row]));
    }
  }, [prefillBaht]);

  const validation = useMemo(() => validateKlong(words), [words]);

  const { toneMap, rhymeMap } = useMemo(() => buildToneRhymeMaps(validation), [validation]);

  useEffect(() => {
    if (validation.valid) markComplete('klongEditor');
  }, [validation.valid]);

  const updateWord = (bahtIndex, pos, value) => {
    setWords(prev => {
      const next = prev.map(row => [...row]);
      next[bahtIndex][pos - 1] = value;
      return next;
    });
  };

  const clearAll = () => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะล้างข้อความทั้งหมด?')) {
      setWords(createEmptyWords());
    }
  };

  return (
    <section id="แต่งโคลง" className="py-12 bg-[#F5F0E8] min-h-screen">
      <div className="max-w-4xl mx-auto px-4">

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#2C2C2C]">
              แต่งโคลงด้วยตนเอง
            </h2>
            <p className="font-body text-[#5A7A5E] font-bold mt-2 text-lg">พิมพ์ทีละคำ ระบบตรวจเอก-โท-สัมผัสให้ทันที</p>
          </div>
          <div className="flex gap-3">
            <button onClick={clearAll} className="btn-pixel btn-danger px-4 py-2 text-sm">
              <Trash2 className="w-4 h-4" /> ล้างข้อมูล
            </button>
            <button disabled={!validation.valid} className="btn-pixel btn-primary px-5 py-2 text-sm">
              <Save className="w-4 h-4" /> บันทึก
            </button>
          </div>
        </div>

        <div className="mb-6">
          <ValidationSummary validation={validation} />
        </div>

        <div className="space-y-8">
          {BAHT_SCHEME.map((baht, index) => (
            <BahtRow
              key={index}
              bahtIndex={index}
              words={words[index]}
              onChangeWord={(pos, value) => updateWord(index, pos, value)}
              toneMap={toneMap}
              rhymeMap={rhymeMap}
            />
          ))}
        </div>

      </div>
    </section>
  );
};

// --- Challenge mode (gamified levels) ---

const CHALLENGE_LEVELS = [
  {
    id: 1,
    title: 'ด่านที่ ๑ · แต่งวรรคเดียว',
    description: 'ฝึกกับวรรคหน้าของบาทที่ ๑ (๕ คำ) เริ่มจากจุดที่เล็กที่สุดก่อน',
    segments: [{ bahtIndex: 0, count: 5 }],
    badge: '🌱 นักฝึกวรรคแรก',
  },
  {
    id: 2,
    title: 'ด่านที่ ๒ · แต่งครบหนึ่งบาท',
    description: 'ฝึกบาทที่ ๑ ให้ครบทั้ง ๗ คำ ทั้งวรรคหน้าและวรรคหลัง',
    segments: [{ bahtIndex: 0, count: 7 }],
    badge: '🪶 นักแต่งหนึ่งบาท',
  },
  {
    id: 3,
    title: 'ด่านที่ ๓ · แต่งเต็มบท',
    description: 'ท้าทายที่สุด: แต่งครบทั้ง ๔ บาท พร้อมตรวจสัมผัสระหว่างบท',
    segments: BAHT_SCHEME.map((b, i) => ({ bahtIndex: i, count: b.wordCount })),
    badge: '👑 เจ้าแห่งโคลงสี่สุภาพ',
  },
];
const CHALLENGE_PASS_SCORE = 80;

const isLevelFilled = (level, words) =>
  level.segments.every((seg) => {
    const row = words[seg.bahtIndex] || [];
    for (let p = 0; p < seg.count; p++) {
      if (!(row[p] || '').trim()) return false;
    }
    return true;
  });

// Points a level using validateKlong's own tone/rhyme correctness (never
// SOURCE's cruder last-2-char rhyme heuristic) — this only aggregates that
// verdict across the current level's slots, it doesn't re-derive it.
const computeLevelScore = (validation) => {
  const { tone, rhyme } = validation.checks;
  const toneScore = tone.length ? (tone.filter((t) => t.ok).length / tone.length) * 70 : 70;
  const rhymeOkCount = rhyme.filter((r) => r.confidence === 'EXACT' || r.confidence === 'LIKELY').length;
  const rhymeScore = rhyme.length ? (rhymeOkCount / rhyme.length) * 30 : 30;
  return Math.round(toneScore + rhymeScore);
};

const Challenge = () => {
  const [progress, setProgress] = useState(loadProgress);
  const [currentLevelId, setCurrentLevelId] = useState(() => {
    const p = loadProgress();
    return p.unlocked[p.unlocked.length - 1] || 1;
  });
  const [theme, setTheme] = useState(getRandomTheme);
  const [words, setWords] = useState(createEmptyWords);
  const [result, setResult] = useState(null);

  const level = CHALLENGE_LEVELS.find((l) => l.id === currentLevelId);
  const validation = useMemo(() => validateKlong(words), [words]);
  const { toneMap, rhymeMap } = useMemo(() => buildToneRhymeMaps(validation), [validation]);

  const switchLevel = (id) => {
    setCurrentLevelId(id);
    setWords(createEmptyWords());
    setTheme(getRandomTheme());
    setResult(null);
  };

  const updateWord = (bahtIndex, pos, value) => {
    setWords((prev) => {
      const next = prev.map((row) => [...row]);
      next[bahtIndex][pos - 1] = value;
      return next;
    });
  };

  const checkAnswer = () => {
    if (!isLevelFilled(level, words)) {
      setResult({ status: 'warn', message: 'กรอกคำให้ครบทุกช่องก่อน แล้วค่อยตรวจนะ' });
      return;
    }

    const score = computeLevelScore(validation);
    const passed = score >= CHALLENGE_PASS_SCORE;
    const correctRequired = validation.checks.tone.filter((t) => t.ok).length;
    const requiredSlots = validation.checks.tone.length;
    const rhymeOk = validation.checks.rhyme.filter((r) => r.confidence === 'EXACT' || r.confidence === 'LIKELY').length;
    const rhymeChecks = validation.checks.rhyme.length;

    setProgress((prev) => {
      const next = {
        unlocked: [...prev.unlocked],
        bestScores: { ...prev.bestScores, [level.id]: Math.max(prev.bestScores[level.id] || 0, score) },
        badges: [...prev.badges],
      };
      const newBadge = passed && !next.badges.includes(level.badge);
      if (newBadge) next.badges.push(level.badge);
      if (passed && level.id < CHALLENGE_LEVELS.length && !next.unlocked.includes(level.id + 1)) {
        next.unlocked.push(level.id + 1);
      }
      saveProgress(next);
      setResult({ status: passed ? 'ok' : 'bad', score, passed, newBadge, correctRequired, requiredSlots, rhymeOk, rhymeChecks });
      return next;
    });
  };

  return (
    <section className="py-12 bg-[#F5F0E8] min-h-screen">
      <div className="max-w-4xl mx-auto px-4">

        <div className="flex flex-wrap gap-2 mb-6">
          {CHALLENGE_LEVELS.map((lvl) => {
            const unlocked = progress.unlocked.includes(lvl.id);
            return (
              <button
                key={lvl.id}
                disabled={!unlocked}
                onClick={() => switchLevel(lvl.id)}
                className={`btn-pixel px-4 py-2 text-sm ${lvl.id === currentLevelId ? 'btn-primary' : 'btn-secondary'}`}
              >
                {!unlocked && <Lock className="w-3 h-3" />} ด่าน {lvl.id}
              </button>
            );
          })}
        </div>

        <h2 className="font-heading font-bold text-3xl text-[#2C2C2C] mb-2">{level.title}</h2>
        <p className="font-body text-[#5A7A5E] font-bold mb-4">{level.description}</p>

        <div className="card-pixel p-4 mb-6 flex flex-wrap items-center gap-3">
          <span className="badge-pixel px-2 py-1 text-xs font-bold bg-[#D0E8F2]">{theme.category}</span>
          <span className="font-body font-medium">โจทย์: “{theme.prompt}”</span>
          <button onClick={() => setTheme(getRandomTheme())} className="btn-pixel btn-secondary px-3 py-1 text-xs ml-auto">
            <Shuffle className="w-4 h-4" /> สุ่มหัวข้อใหม่
          </button>
        </div>

        <div className="space-y-6 mb-6">
          {level.segments.map((seg) => (
            <BahtRow
              key={seg.bahtIndex}
              bahtIndex={seg.bahtIndex}
              words={words[seg.bahtIndex]}
              positions={Array.from({ length: seg.count }, (_, i) => i + 1)}
              onChangeWord={(pos, value) => updateWord(seg.bahtIndex, pos, value)}
              toneMap={toneMap}
              rhymeMap={rhymeMap}
            />
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <button onClick={checkAnswer} className="btn-pixel btn-primary px-5 py-2 text-sm">ตรวจคำตอบ</button>
          <button onClick={() => setWords(createEmptyWords())} className="btn-pixel btn-secondary px-5 py-2 text-sm">ล้างคำตอบ</button>
        </div>

        {result && (
          <div
            role="status"
            aria-live="polite"
            className={`card-pixel p-4 font-body font-bold text-sm space-y-1 ${
              result.status === 'warn' ? 'text-[#997300]' : result.status === 'ok' ? 'text-[#5A7A5E]' : 'text-[#C0392B]'
            }`}
          >
            {result.status === 'warn' ? (
              result.message
            ) : (
              <>
                <div>คะแนน: {result.score} / 100</div>
                <div>เอก-โทถูกต้อง {result.correctRequired}/{result.requiredSlots} ตำแหน่ง · สัมผัสถูกต้อง {result.rhymeOk}/{result.rhymeChecks} จุด</div>
                <div>
                  {result.passed
                    ? (result.newBadge ? `🎉 ปลดล็อกตราใหม่: ${level.badge}` : 'ผ่านด่านนี้แล้ว!')
                    : `ยังไม่ถึงเกณฑ์ ${CHALLENGE_PASS_SCORE} คะแนน ลองแก้ไขแล้วตรวจอีกครั้ง`}
                </div>
              </>
            )}
          </div>
        )}

        {progress.badges.length > 0 && (
          <div className="mt-8 font-body font-bold text-sm text-[#5A7A5E]">
            ตราที่ได้รับ: {progress.badges.join('  ')}
          </div>
        )}
      </div>
    </section>
  );
};

// --- Prompt / theme library ---

const PromptLibrary = ({ onSelectPrompt }) => (
  <section className="py-12 bg-[#F5F0E8] min-h-screen">
    <div className="max-w-4xl mx-auto px-4">
      <h2 className="font-heading font-bold text-3xl text-[#2C2C2C] mb-2">คลังโจทย์ร่วมสมัย</h2>
      <p className="font-body text-[#5A7A5E] font-bold mb-8">เลือกหัวข้อเพื่อนำไปใช้กับผู้ช่วยทรงปัญญา</p>
      <div className="grid md:grid-cols-3 gap-6">
        {THEMES.map((theme) => (
          <div key={theme.category} className="card-pixel p-5">
            <h3 className="font-heading font-bold text-lg text-[#2C2C2C] mb-3">{theme.category}</h3>
            <ul className="space-y-2">
              {theme.prompts.map((prompt) => (
                <li key={prompt}>
                  <button
                    onClick={() => onSelectPrompt(prompt)}
                    className="w-full text-left btn-pixel btn-secondary px-3 py-2 text-sm"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// --- Tab navigation ---

const TABS = [
  { id: 'practice', label: 'ห้องฝึกอิสระ' },
  { id: 'challenge', label: 'ด่านท้าทาย' },
  { id: 'library', label: 'คลังโจทย์' },
];

const TabNav = ({ activeTab, onChange }) => {
  const tabRefs = useRef([]);

  const handleKeyDown = (e, index) => {
    let nextIndex = null;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = TABS.length - 1;
    if (nextIndex === null) return;
    e.preventDefault();
    onChange(TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div role="tablist" aria-label="ส่วนต่างๆ ของแอป" className="flex gap-2">
      {TABS.map((tab, i) => {
        const selected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[i] = el)}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`btn-pixel px-4 py-2 text-sm font-bold ${selected ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

// --- App Container ---

export default function App() {
  const [generatedBaht, setGeneratedBaht] = useState(null);
  const [progress, setProgress] = useState({
    aiAssistant: false,
    klongEditor: false
  });
  const [activeTab, setActiveTab] = useState('practice');
  const [selectedPrompt, setSelectedPrompt] = useState('');

  const completeSection = (section) => {
    setProgress(prev => ({ ...prev, [section]: true }));
  };

  const handlePoemGenerated = (baht) => {
    setGeneratedBaht(baht);
    setTimeout(() => {
      document.getElementById('แต่งโคลง')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSelectPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setActiveTab('practice');
  };

  return (
    <div className="font-body text-[#2C2C2C] selection:bg-[#A8C5A0] selection:text-[#2C2C2C] min-h-screen flex flex-col">
      <Styles />

      <header className="bg-[#FAF4E8] border-b-[3px] border-[#2C2C2C] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-heading font-bold text-2xl tracking-tight text-[#2C2C2C] flex items-center gap-2">
            <span className="text-2xl drop-shadow-md">✒️</span> Kawi AI
          </h1>
          <div className="flex gap-4 font-body font-bold text-sm">
            <span className={`flex items-center gap-1 ${progress.aiAssistant ? 'text-[#5A7A5E]' : 'text-[#A3A3A3]'}`}>
              <CheckCircle2 className="w-4 h-4" /> AI Assistant
            </span>
            <span className={`flex items-center gap-1 ${progress.klongEditor ? 'text-[#5A7A5E]' : 'text-[#A3A3A3]'}`}>
              <CheckCircle2 className="w-4 h-4" /> Editor
            </span>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <TabNav activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </header>

      <main className="flex-1">
        <div id="panel-practice" role="tabpanel" aria-labelledby="tab-practice" hidden={activeTab !== 'practice'}>
          <AIAssistant
            onGenerated={handlePoemGenerated}
            markComplete={completeSection}
            initialTopic={selectedPrompt}
            onTopicApplied={() => setSelectedPrompt('')}
          />
          <KlongEditor
            prefillBaht={generatedBaht}
            markComplete={completeSection}
          />
        </div>
        <div id="panel-challenge" role="tabpanel" aria-labelledby="tab-challenge" hidden={activeTab !== 'challenge'}>
          <Challenge />
        </div>
        <div id="panel-library" role="tabpanel" aria-labelledby="tab-library" hidden={activeTab !== 'library'}>
          <PromptLibrary onSelectPrompt={handleSelectPrompt} />
        </div>
      </main>

      <footer className="bg-[#2C2C2C] text-[#F5F0E8] py-6 border-t-[3px] border-[#2C2C2C]">
        <div className="max-w-4xl mx-auto px-4 text-center font-body text-sm font-medium">
          <p>Kawi AI — ถักทอตัวอักษร ซ่อนเงาศิลป์</p>
        </div>
      </footer>
    </div>
  );
}
