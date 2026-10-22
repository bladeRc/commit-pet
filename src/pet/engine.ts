// The pet's rules. Everything here is pure: a pet is computed by replaying its
// commit history up to `now`, so the CLI and the GitHub Action always agree.

import { nameFromSeed, speciesForLanguage, type SpeciesId, type Stage } from "./species.js";

export interface CommitEvent {
  /** Commit time, ms since epoch. */
  t: number;
  /** Lines added + deleted, if known. */
  lines?: number;
  /** Main language of the commit, if known. */
  lang?: string | null;
}

export interface PetSeed {
  seed: string;
  name?: string;
  bornAt: number;
}

export type Mood = "egg" | "hyped" | "happy" | "hungry" | "sad" | "away";

export interface Pet {
  name: string;
  stage: Stage;
  species: SpeciesId;
  mood: Mood;
  /** 0–100, drains to 0 over a week without commits. */
  fullness: number;
  xp: number;
  /** XP where the current stage started, and where the next one starts (null at the top). */
  stageXp: number;
  nextStageXp: number | null;
  nextStage: Stage | null;
  commits: number;
  streak: number;
  bestStreak: number;
  timesRanAway: number;
  topLanguage: string | null;
  bornAt: number;
  lastFedAt: number | null;
  ageDays: number;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const HUNGRY_AFTER = 1 * DAY;
export const SAD_AFTER = 3 * DAY;
export const RUN_AWAY_AFTER = 7 * DAY;

export const STAGE_XP: { stage: Stage; xp: number }[] = [
  { stage: "baby", xp: 1 },
  { stage: "teen", xp: 150 },
  { stage: "adult", xp: 600 },
  { stage: "elder", xp: 3000 },
];

/**
 * XP for one commit. Every commit is worth 10; size adds a little (log scale,
 * capped), and commits made in quick succession are worth less so spamming
 * tiny commits doesn't pay.
 */
export function commitXp(lines: number | undefined, commitsInLastHour: number): number {
  const size = lines === undefined ? 3 : Math.min(8, Math.round(Math.log2(1 + Math.max(0, lines))));
  const raw = 10 + size;
  return Math.max(1, Math.round(raw / (1 + commitsInLastHour)));
}

export function stageForXp(xp: number): Stage {
  let stage: Stage = "egg";
  for (const s of STAGE_XP) if (xp >= s.xp) stage = s.stage;
  return stage;
}

/** Local calendar day as a number, so consecutive days differ by 1. */
function dayNumber(t: number): number {
  const d = new Date(t);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
}

export function computePet(seed: PetSeed, events: readonly CommitEvent[], now: number): Pet {
  const sorted = events.filter((e) => e.t <= now).sort((a, b) => a.t - b.t);

  let xp = 0;
  let species: SpeciesId | null = null;
  let timesRanAway = 0;
  const langCount = new Map<string, number>();
  const days = new Set<number>();
  let windowStart = 0;

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]!;
    const prev = sorted[i - 1];
    if (prev && e.t - prev.t >= RUN_AWAY_AFTER) timesRanAway++;

    while (sorted[windowStart]!.t <= e.t - HOUR) windowStart++;
    xp += commitXp(e.lines, i - windowStart);

    if (e.lang) langCount.set(e.lang, (langCount.get(e.lang) ?? 0) + 1);
    days.add(dayNumber(e.t));

    // The adult form is decided by your top language when it grows up, then stays.
    if (species === null && xp >= STAGE_XP[2]!.xp) species = speciesForLanguage(topOf(langCount));
  }

  const stage = stageForXp(xp);
  const topLanguage = topOf(langCount);
  const last = sorted.at(-1);
  const sinceFed = last ? now - last.t : null;

  let mood: Mood;
  if (sinceFed === null) mood = "egg";
  else if (sinceFed >= RUN_AWAY_AFTER) mood = "away";
  else if (sinceFed >= SAD_AFTER) mood = "sad";
  else if (sinceFed >= HUNGRY_AFTER) mood = "hungry";
  else mood = "happy";

  const { streak, best } = streaks(days, dayNumber(now));
  if (mood === "happy" && streak >= 7) mood = "hyped";

  const nextIndex = STAGE_XP.findIndex((s) => xp < s.xp);
  const next = nextIndex >= 0 ? STAGE_XP[nextIndex]! : null;
  const current = nextIndex > 0 ? STAGE_XP[nextIndex - 1]! : nextIndex === 0 ? null : STAGE_XP.at(-1)!;

  return {
    name: seed.name ?? nameFromSeed(seed.seed),
    stage,
    species: species ?? speciesForLanguage(topLanguage),
    mood,
    fullness: sinceFed === null ? 100 : Math.max(0, Math.round(100 * (1 - sinceFed / RUN_AWAY_AFTER))),
    xp,
    stageXp: current?.xp ?? 0,
    nextStageXp: next?.xp ?? null,
    nextStage: next?.stage ?? null,
    commits: sorted.length,
    streak,
    bestStreak: best,
    timesRanAway,
    topLanguage,
    bornAt: seed.bornAt,
    lastFedAt: last?.t ?? null,
    ageDays: Math.max(0, Math.floor((now - Math.min(seed.bornAt, sorted[0]?.t ?? Infinity)) / DAY)),
  };
}

function topOf(counts: Map<string, number>): string | null {
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

/** Current streak counts if you committed today or yesterday (today isn't over yet). */
function streaks(days: Set<number>, today: number): { streak: number; best: number } {
  const sorted = [...days].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i]! - sorted[i - 1]! === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const start = days.has(today) ? today : days.has(today - 1) ? today - 1 : null;
  let streak = 0;
  while (start !== null && days.has(start - streak)) streak++;
  return { streak, best };
}
