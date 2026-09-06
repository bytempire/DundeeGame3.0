import { api, getWebApp, isApiEnabled } from "./api";

export type LeaderboardEntry = {
  rank: number;
  name: string;
  distance: number;
};

const LOCAL_KEY = "dundee_runner_leaderboard_v1";

type TgUser = { first_name?: string; username?: string };

function tgFirstName(): string {
  const unsafe = (
    getWebApp() as TgWebAppWithUnsafe | null
  )?.initDataUnsafe?.user;
  const name = (unsafe?.first_name ?? "").trim();
  return name || "Игрок";
}

type TgWebAppWithUnsafe = {
  initDataUnsafe?: { user?: TgUser };
};

export function getPlayerDisplayName(): string {
  return tgFirstName();
}

function readLocal(): Array<{ name: string; distance: number }> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{ name: string; distance: number }>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: Array<{ name: string; distance: number }>) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows.slice(0, 10)));
}

/** Record a finished run into the local top-10 (best per name). */
export function recordLocalScore(distance: number, name = getPlayerDisplayName()) {
  const d = Math.floor(distance);
  if (d <= 0) return;
  const rows = readLocal();
  const existing = rows.find((r) => r.name === name);
  if (existing) {
    existing.distance = Math.max(existing.distance, d);
  } else {
    rows.push({ name, distance: d });
  }
  rows.sort((a, b) => b.distance - a.distance);
  writeLocal(rows);
}

function localEntries(): LeaderboardEntry[] {
  return readLocal()
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 10)
    .map((r, i) => ({ rank: i + 1, name: r.name, distance: r.distance }));
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (isApiEnabled()) {
    try {
      const res = await api<{ entries: LeaderboardEntry[] }>("/leaderboard");
      if (res.entries?.length) return res.entries;
    } catch {
      /* fall through to local */
    }
  }
  return localEntries();
}
