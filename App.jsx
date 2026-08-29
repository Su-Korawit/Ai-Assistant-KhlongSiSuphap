import React, { useState, useEffect } from 'react';
import { Send, Loader2, ArrowRight, AlertCircle, Trash2, CheckCircle2, Save } from 'lucide-react';

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
  `}} />
);

// --- Helper Functions ---

/**
 * splitThaiSyllables(text)
 * Splits Thai text into syllables (พยางค์). Whitespace is ignored.
 *
 * Thai Syllable Regex Structure:
 *   [เแโใไ]?                    (A) Optional LEADING VOWEL (U+0E40–U+0E44): เ แ โ ใ ไ
 *   [ก-ฮ]                       (B) Required ONSET CONSONANT (U+0E01–U+0E2E)
 *   [ก-ฮ]?                      (C) Optional CLUSTER consonant (กร กล กว etc.)
 *   [\u0E31\u0E34-\u0E3A\u0E47]? (D) Optional ABOVE/BELOW VOWEL or mai tai khu:
 *                                    ั(0E31)  ิีึืุู(0E34-39)  ฺ(0E3A)  ็(0E47)
 *   [\u0E48-\u0E4B]?            (E) Optional TONE MARK: ่ ้ ๊ ๋ (0E48–0E4B)
 *   [\u0E30\u0E32\u0E33]?       (F) Optional TRAILING VOWEL: ะ(0E30)  า(0E32)  ำ(0E33)
 *   [ก-ฮ]?                      (G) Optional FINAL CONSONANT (ตัวสะกด)
 *   \u0E4C?                     (H) Optional SILENT MARK ์ thanthakhat (0E4C)
 */
const splitThaiSyllables = (text) => {
  if (!text) return [];
  const cleaned = text.replace(/\s+/g, '');
  if (!cleaned) return [];

  const regex = new RegExp(
    '[เแโใไ]?' +                       // (A) leading vowel
    '[ก-ฮ]' +                          // (B) onset consonant
    '[ก-ฮ]?' +                         // (C) optional cluster consonant
    '[\u0E31\u0E34-\u0E3A\u0E47]?' +   // (D) above/below vowel diacritic / ็
    '[\u0E48-\u0E4B]?' +               // (E) tone mark
    '[\u0E30\u0E32\u0E33]?' +          // (F) trailing vowel (ะ า ำ)
    '[ก-ฮ]?' +                         // (G) final consonant
    '\u0E4C?',                         // (H) silent mark ์
    'g'
  );

  const matches = cleaned.match(regex);
  return matches ? matches.filter(m => m.length > 0) : cleaned.split('');
};

const countThaiSyllables = (text) => splitThaiSyllables(text).length;

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
const isDeadWord = (syllable) => {
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
  const SHORT_VOWEL_RE = /[\u0E30\u0E34\u0E36\u0E38\u0E47]/; // ะ ิ ึ ุ ็

  // Strip silent (การันต์) consonants: [consonant]์ is unpronounced
  const cleaned = syllable.replace(/[ก-ฮ]\u0E4C/g, '');

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
const isEk = (syllable) => {
  if (!syllable) return false;
  return syllable.includes('\u0E48') || isDeadWord(syllable);
};

/**
 * isTho(syllable)
 * Returns true if syllable satisfies the โท tone requirement in โคลง poetry.
 * Accepts: ไม้โท (้ U+0E49) only.
 */
const isTho = (syllable) => {
  if (!syllable) return false;
  return syllable.includes('\u0E49');
};

// --- Constants ---

const BAAT_CONFIG = [
  { id: 1, label: '๑', front: { target: 5, ek: [5], tho: [4] }, back: { target: 2, ek: [], tho: [], soi: true } },
  { id: 2, label: '๒', front: { target: 5, ek: [5], tho: [4] }, back: { target: 2, ek: [2], tho: [], soi: false } },
  { id: 3, label: '๓', front: { target: 5, ek: [5], tho: [4] }, back: { target: 2, ek: [2], tho: [], soi: true } },
  { id: 4, label: '๔', front: { target: 5, ek: [5], tho: [4] }, back: { target: 4, ek: [4], tho: [], soi: false } },
];

// --- Sub-components ---

const SyllableBar = ({ count, expected }) => {
  const isCorrect = count === expected;
  return (
    <div className={`inline-flex items-center justify-center px-2 py-0.5 text-[13px] font-bold ${
      isCorrect 
        ? 'bg-[#7A9E7E] text-white badge-pixel' 
        : 'bg-[#E5E5E5] text-[#737373] border-2 border-[#A3A3A3]'
    }`}>
      {count}/{expected} พยางค์
    </div>
  );
};

const ToneIndicator = ({ targetPos, targetType, currentWord }) => {
  let isCorrect = false;
  let hasWord = !!currentWord;

  if (hasWord) {
    if (targetType === 'เอก') isCorrect = isEk(currentWord);
    if (targetType === 'โท') isCorrect = isTho(currentWord);
  }

  // Determine styles based on Design.md
  let chipClass = 'bg-[#FAF4E8] border-[#A3A3A3] text-[#737373]'; // Default / Empty
  
  if (hasWord) {
    if (isCorrect) {
      if (targetType === 'เอก') {
        chipClass = 'bg-[#7A9E7E]/10 border-[#7A9E7E]/40 text-[#5A7A5E] font-bold';
      } else {
        chipClass = 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#997300] font-bold';
      }
    } else {
      chipClass = 'bg-[#C0392B]/10 border-[#C0392B]/40 text-[#C0392B]';
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center min-w-[32px] px-1.5 py-1 border-[2px] font-body text-xs relative ${chipClass}`}>
      <span className="font-bold">{targetPos}</span>
      <span className="text-[10px] absolute -bottom-2.5 bg-white px-1 leading-none border border-[#2C2C2C]">
        {targetType}
      </span>
    </div>
  );
};

// --- Main Components ---

const AIAssistant = ({ onGenerated, markComplete }) => {
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [poemLines, setPoemLines] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setStatus('loading');
    setErrorMsg('');
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('ไม่พบ VITE_GEMINI_API_KEY ใน .env');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const prompt = `ทำหน้าที่เป็นกวีเอกผู้เชี่ยวชาญด้านภาษาไทยและฉันทลักษณ์
จงแต่งโคลงสี่สุภาพ 1 บท (4 บาท) ในหัวข้อ: "${topic}"

กฎและข้อบังคับฉันทลักษณ์ที่ต้องปฏิบัติตามอย่างเคร่งครัด:
1. โครงสร้างและจำนวนพยางค์: 
   - บาทที่ 1 ถึง 3: วรรคหน้า 5 พยางค์ เว้นวรรค แล้วตามด้วยวรรคหลัง 2 พยางค์
   - บาทที่ 4: วรรคหน้า 5 พยางค์ เว้นวรรค แล้วตามด้วยวรรคหลัง 4 พยางค์
2. บังคับตำแหน่ง เอก-โท: ต้องมีคำเอก 7 แห่ง และ คำโท 4 แห่ง ตรงตามฉันทลักษณ์ (อนุญาตให้ใช้ "คำตาย" แทนคำเอกได้)
3. สัมผัสบังคับ: ตรวจสอบการส่งและรับสัมผัสสระระหว่างบาทให้ถูกต้องตามแบบแผน

ข้อสำคัญ: 
- ให้นับ "พยางค์ที่ออกเสียง" จริงๆ ไม่ใช่นับแค่จำนวนคำ
- คั่นระหว่างวรรคหน้าและวรรคหลังด้วย "ช่องว่าง 1 เคาะ" เพื่อให้ระบบนำไปประมวลผลต่อได้

ตอบกลับมาเป็น JSON format เท่านั้น ห้ามมีข้อความอธิบาย, ห้ามมี Markdown (ไม่ต้องมี \`\`\`json) ให้แสดงแค่โครงสร้างดังนี้:
{
  "lines": [
    "วรรคหน้าบาทที่๑ วรรคหลังบาทที่๑",
    "วรรคหน้าบาทที่๒ วรรคหลังบาทที่๒",
    "วรรคหน้าบาทที่๓ วรรคหลังบาทที่๓",
    "วรรคหน้าบาทที่๔ วรรคหลังบาทที่๔"
  ]
}`;

      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          });
          if (response.ok) break;
        } catch (e) {
          console.error("Fetch failed", e);
        }
        retries--;
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!response || !response.ok) throw new Error("ไม่สามารถเชื่อมต่อกับ AI ได้ในขณะนี้");

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resultText) throw new Error("AI ไม่ได้ส่งข้อมูลกลับมา");

      // Sanitize JSON in case AI adds markdown formatting
      const cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanText);

      if (parsedData.lines && parsedData.lines.length === 4) {
        setPoemLines(parsedData.lines);
        setStatus('success');
        markComplete('aiAssistant');
      } else {
        throw new Error("รูปแบบโคลงที่ได้ไม่ถูกต้อง");
      }

    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการสร้างโคลง');
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleGenerate();
    }
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

          {/* States */}
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
                ระบบกำลังเรียงร้อยถ้อยคำ...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 p-4 bg-[#C0392B]/10 text-[#C0392B] border-[3px] border-[#C0392B]">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <p className="font-body font-bold">{errorMsg}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-[#F5F0E8] p-6 border-[3px] border-[#2C2C2C]">
              <div className="space-y-3 mb-6 font-body text-[#2C2C2C] text-lg font-medium">
                {poemLines.map((line, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className="text-[#A8C5A0] font-bold select-none">{idx + 1}.</span>
                    <p>{line}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onGenerated(poemLines)}
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


const ClauseEditor = ({ type, config, value, onChange }) => {
  // splitThaiSyllables strips all whitespace before matching, so spaces the
  // user types for readability are never counted as syllables.
  // `syllables` is a pure array of Thai syllable strings, e.g. ["สาย","น้ำ","ไหล","รื่น","รมย์"]
  const syllables = splitThaiSyllables(value);
  const count = syllables.length;

  // Build tone requirement list from config positions (1-indexed)
  const toneReqs = [];
  if (config.ek) config.ek.forEach(pos => toneReqs.push({ pos, type: 'เอก' }));
  if (config.tho) config.tho.forEach(pos => toneReqs.push({ pos, type: 'โท' }));
  toneReqs.sort((a, b) => a.pos - b.pos);

  // Resolve the actual syllable string at a 1-indexed position.
  // Returns '' when the user hasn't typed that far yet — ToneIndicator
  // treats '' as "empty" and renders the neutral state.
  const syllableAt = (pos) => syllables[pos - 1] ?? '';

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          type="text"
          className="w-full px-4 py-3 input-pixel text-lg font-medium"
          placeholder={`วรรค${type} (${config.target} คำ)`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {config.soi && (
          <span className="absolute right-3 top-3.5 text-xs text-[#737373] italic font-body pointer-events-none">
            (คำสร้อย)
          </span>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-4 pl-1">
        <SyllableBar count={count} expected={config.target} />
        
        {toneReqs.length > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-xs font-bold text-[#737373] mr-1">บังคับ:</span>
            {toneReqs.map((req, idx) => (
              <ToneIndicator 
                key={idx} 
                targetPos={req.pos} 
                targetType={req.type} 
                currentWord={syllableAt(req.pos)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const KlongEditor = ({ prefillLines, markComplete }) => {
  const [clauses, setClauses] = useState(
    Array(4).fill({ front: '', back: '' })
  );

  useEffect(() => {
    if (prefillLines && prefillLines.length === 4) {
      const newClauses = prefillLines.map(line => {
        const parts = line.trim().split(/\s{2,}|\s+/);
        return {
          front: parts[0] || '',
          back: parts.slice(1).join(' ') || ''
        };
      });
      setClauses(newClauses);
      checkCompletion(newClauses);
    }
  }, [prefillLines]);

  const updateClause = (baatIndex, side, value) => {
    const newClauses = [...clauses];
    newClauses[baatIndex] = { ...newClauses[baatIndex], [side]: value };
    setClauses(newClauses);
    checkCompletion(newClauses);
  };

  const clearAll = () => {
    if(confirm('คุณแน่ใจหรือไม่ที่จะล้างข้อความทั้งหมด?')) {
      setClauses(Array(4).fill({ front: '', back: '' }));
    }
  };

  const [isAllValid, setIsAllValid] = useState(false);

  const checkCompletion = (currentClauses) => {
    let allValid = true;

    currentClauses.forEach((clause, index) => {
      const config = BAAT_CONFIG[index];

      // --- 1. Syllable count validation ---
      const frontSyllables = splitThaiSyllables(clause.front);
      const backSyllables  = splitThaiSyllables(clause.back);
      const fCount = frontSyllables.length;
      const bCount = backSyllables.length;

      if (fCount !== config.front.target) allValid = false;

      // Back clause: accept exact target, OR target+2 when soi (คำสร้อย) is allowed
      const backCountOk = bCount === config.back.target ||
        (config.back.soi && bCount === config.back.target + 2);
      if (!backCountOk) allValid = false;

      // --- 2. Tone mark validation (เอก / โท) ---
      // Front clause — iterate required เอก positions
      config.front.ek.forEach(pos => {
        const syllable = frontSyllables[pos - 1] ?? '';
        if (!isEk(syllable)) allValid = false;
      });
      // Front clause — iterate required โท positions
      config.front.tho.forEach(pos => {
        const syllable = frontSyllables[pos - 1] ?? '';
        if (!isTho(syllable)) allValid = false;
      });

      // Back clause — iterate required เอก positions
      config.back.ek.forEach(pos => {
        const syllable = backSyllables[pos - 1] ?? '';
        if (!isEk(syllable)) allValid = false;
      });
      // Back clause — iterate required โท positions
      config.back.tho.forEach(pos => {
        const syllable = backSyllables[pos - 1] ?? '';
        if (!isTho(syllable)) allValid = false;
      });
    });

    setIsAllValid(allValid);
    if (allValid) {
      markComplete('klongEditor');
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
            <p className="font-body text-[#5A7A5E] font-bold mt-2 text-lg">แก้ไขและตรวจสอบฉันทลักษณ์โคลงสี่สุภาพ</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={clearAll}
              className="btn-pixel btn-danger px-4 py-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              ล้างข้อมูล
            </button>
            <button 
              disabled={!isAllValid}
              className="btn-pixel btn-primary px-5 py-2 text-sm"
            >
              <Save className="w-4 h-4" />
              บันทึก
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {BAAT_CONFIG.map((baat, index) => (
            <div key={baat.id} className="card-pixel flex flex-col">
              
              {/* Title Bar */}
              <div className="bg-[#7A9E7E] text-white font-heading font-bold px-4 py-2 border-b-[3px] border-[#2C2C2C] text-lg flex items-center gap-2">
                บาทที่ {baat.label}
              </div>

              {/* Clauses Container */}
              <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 bg-[#FAF4E8]">
                <ClauseEditor 
                  type="หน้า"
                  config={baat.front}
                  value={clauses[index].front}
                  onChange={(val) => updateClause(index, 'front', val)}
                />
                <ClauseEditor 
                  type="หลัง"
                  config={baat.back}
                  value={clauses[index].back}
                  onChange={(val) => updateClause(index, 'back', val)}
                />
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

// --- App Container ---

export default function App() {
  const [generatedPoem, setGeneratedPoem] = useState(null);
  const [progress, setProgress] = useState({
    aiAssistant: false,
    klongEditor: false
  });

  const completeSection = (section) => {
    setProgress(prev => ({ ...prev, [section]: true }));
  };

  const handlePoemGenerated = (lines) => {
    setGeneratedPoem(lines);
    setTimeout(() => {
      document.getElementById('แต่งโคลง')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="font-body text-[#2C2C2C] selection:bg-[#A8C5A0] selection:text-[#2C2C2C] min-h-screen flex flex-col">
      <Styles />

      {/* Navbar/Header */}
      <header className="bg-[#FAF4E8] border-b-[3px] border-[#2C2C2C] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-heading font-bold text-2xl tracking-tight text-[#2C2C2C] flex items-center gap-2">
            <span className="text-2xl drop-shadow-md">✒️</span> กวีAI
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
      </header>

      <main className="flex-1">
        <AIAssistant 
          onGenerated={handlePoemGenerated} 
          markComplete={completeSection} 
        />
        <KlongEditor 
          prefillLines={generatedPoem} 
          markComplete={completeSection}
        />
      </main>
      
      <footer className="bg-[#2C2C2C] text-[#F5F0E8] py-6 border-t-[3px] border-[#2C2C2C]">
        <div className="max-w-4xl mx-auto px-4 text-center font-body text-sm font-medium">
          <p>กวีAI — ถักทอตัวอักษร ซ่อนเงาศิลป์</p>
        </div>
      </footer>
    </div>
  );
}
