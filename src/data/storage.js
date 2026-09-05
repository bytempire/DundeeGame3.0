const UNLOCK_KEY = 'dundee_unlocked';
const BEST_KEY = 'dundee_best_times';

export function getUnlockedLevel() {
  const n = Number(localStorage.getItem(UNLOCK_KEY) || '1');
  return Math.min(20, Math.max(1, n));
}

export function unlockLevel(level) {
  const cur = getUnlockedLevel();
  if (level > cur) localStorage.setItem(UNLOCK_KEY, String(Math.min(20, level)));
}

export function getBestTimes() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveBestTime(level, ms) {
  const best = getBestTimes();
  const key = String(level);
  if (!best[key] || ms < best[key]) {
    best[key] = ms;
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
    return true;
  }
  return false;
}

export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
