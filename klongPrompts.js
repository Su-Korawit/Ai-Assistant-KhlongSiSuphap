/**
 * คลังโจทย์ประเด็นร่วมสมัย — helpers only. Data is DB-backed now (see
 * api/prompts.js, admin-editable via AdminApp.jsx), not hardcoded here, so
 * these take the fetched `themes` (shape: [{ category, prompts: [{id,
 * text}] }, ...]) as their first argument instead of reading a module-level
 * constant. Pure, no React/DOM dependency (same rule as thaiSyllable.js/
 * klongRules.js/klongValidator.js — see CLAUDE.md).
 */

export function getRandomPrompt(themes, category) {
  const pool = category
    ? (themes.find((t) => t.category === category)?.prompts ?? [])
    : themes.flatMap((t) => t.prompts);
  if (!pool.length) return '';
  return pool[Math.floor(Math.random() * pool.length)].text;
}

export function getRandomTheme(themes) {
  if (!themes.length) return { category: '', prompt: '' };
  const t = themes[Math.floor(Math.random() * themes.length)];
  return { category: t.category, prompt: getRandomPrompt(themes, t.category) };
}
