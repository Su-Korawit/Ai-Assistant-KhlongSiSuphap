/**
 * Default Gemini generation prompt template, shared between the server
 * (api/generate-klong.js, where it's the fallback when ai_settings.
 * prompt_template is unset) and the client (AdminApp.jsx's AI settings
 * panel, where it's shown pre-filled in the textarea so an admin edits
 * the real current prompt instead of starting from a blank box guessing
 * what the system already sends). No React/DOM/DB dependency — same rule
 * as thaiSyllable.js/klongRules.js/klongValidator.js (see CLAUDE.md).
 *
 * {topic}/{scheme}/{rhyme} are placeholders substituted at generation
 * time in api/generate-klong.js's buildPrompt — this file only holds the
 * literal template text, not the substitution logic (that needs
 * klongRules.js-derived data, which shouldn't be pulled into the client
 * bundle).
 */
export const DEFAULT_PROMPT_TEMPLATE = `ทำหน้าที่เป็นกวีเอกผู้เชี่ยวชาญด้านภาษาไทยและฉันทลักษณ์โคลงสี่สุภาพ
จงแต่งโคลงสี่สุภาพ 1 บท (4 บาท) ในหัวข้อ: "{topic}"

โครงสร้างฉันทลักษณ์ที่ต้องปฏิบัติตามอย่างเคร่งครัด (นับพยางค์ที่ออกเสียงจริง ไม่ใช่จำนวนคำเขียน):
{scheme}

(อนุญาตให้ใช้ "คำตาย" แทนคำเอกได้)

สัมผัสบังคับระหว่างบาท (คำต้องคล้องจองสระกัน):
{rhyme}`;
