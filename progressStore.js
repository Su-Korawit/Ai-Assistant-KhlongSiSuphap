/**
 * Challenge-mode progress (unlocked levels, best scores, badges).
 * Backed by localStorage today; isolated here so swapping to a real
 * backend later is a one-file change (see CLAUDE.md merge notes).
 */

const STORAGE_KEY = 'klongChallengeProgress_v1';

function defaultProgress() {
  return { unlocked: [1], bestScores: {}, badges: [] };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    return { ...defaultProgress(), ...parsed };
  } catch (e) {
    return defaultProgress();
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    // localStorage unavailable (private browsing, quota) — progress just won't persist
  }
}

export function resetProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // nothing to clean up if it was never writable
  }
}
