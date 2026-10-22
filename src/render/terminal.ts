// The pet in your terminal.

import type { Pet } from "../pet/engine.js";
import { SPECIES, STAGE_EMOJI } from "../pet/species.js";
import { MOOD_FACE, MOOD_LABEL, petArt, petColor, speech, stageProgress, title } from "./face.js";

const useColor = (): boolean => process.stdout.isTTY === true && !process.env.NO_COLOR;

function rgb(hex: string, text: string): string {
  if (!useColor()) return text;
  const n = parseInt(hex.slice(1), 16);
  return `\x1b[38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}m${text}\x1b[0m`;
}

const bold = (s: string): string => (useColor() ? `\x1b[1m${s}\x1b[0m` : s);
const dim = (s: string): string => (useColor() ? `\x1b[2m${s}\x1b[0m` : s);

function bar(fraction: number, width = 12): string {
  const n = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return "█".repeat(n) + "░".repeat(width - n);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function statLines(pet: Pet): string[] {
  const color = petColor(pet);
  const xpLabel =
    pet.stage === "egg"
      ? "hatches on your first commit"
      : pet.nextStageXp === null
        ? `${pet.xp} xp · max level`
        : `${pet.xp}/${pet.nextStageXp} xp → ${pet.nextStage}`;
  const facts = [plural(pet.commits, "commit"), `${plural(pet.ageDays, "day")} old`];
  if (pet.topLanguage) facts.push(pet.topLanguage);
  if (pet.timesRanAway > 0) facts.push(`ran away ${pet.timesRanAway}x`);

  return [
    bold(title(pet)),
    `${MOOD_LABEL[pet.mood]}  ${MOOD_FACE[pet.mood]}`,
    `${dim("food  ")} ${rgb("#3fb950", bar(pet.fullness / 100))} ${pet.fullness}%`,
    `${dim("xp    ")} ${rgb(color, bar(stageProgress(pet)))} ${xpLabel}`,
    `${dim("streak")} 🔥 ${plural(pet.streak, "day")}  ${dim(`(best ${pet.bestStreak})`)}`,
    dim(facts.join(" · ")),
  ];
}

const ART_WIDTH = 15;

/** One frame: art on the left, stats on the right, speech underneath. */
export function frame(pet: Pet, opts: { blink?: boolean; bob?: boolean } = {}): string[] {
  const art = petArt(pet, opts.blink);
  const stats = statLines(pet);
  const height = Math.max(art.length + 1, stats.length);
  const top = Math.ceil((height - art.length) / 2) - (opts.bob ? 1 : 0);
  const color = petColor(pet);

  const rows: string[] = [];
  for (let i = 0; i < height; i++) {
    const a = art[i - top] ?? "";
    rows.push(rgb(color, a.padEnd(ART_WIDTH)) + "  " + (stats[i] ?? ""));
  }
  rows.push("", dim(`  “${speech(pet)}”`));
  return rows;
}

export function printPet(pet: Pet): void {
  process.stdout.write("\n" + frame(pet).join("\n") + "\n\n");
}

/** Plays a short idle animation (bob + blink), then leaves the last frame on screen. */
export async function animatePet(pet: Pet): Promise<void> {
  if (!process.stdout.isTTY || pet.mood === "away" || process.env.COMMIT_PET_NO_ANIM) return printPet(pet);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const beats = pet.mood === "sad" ? 1 : 3;
  const frames: { blink?: boolean; bob?: boolean }[] = [];
  for (let i = 0; i < beats; i++) frames.push({}, { bob: true }, { bob: true }, {});
  frames.splice(5, 0, { blink: true });
  frames.push({});

  process.stdout.write("\n\x1b[?25l"); // hide cursor while animating
  let lines = 0;
  try {
    for (const f of frames) {
      if (lines) process.stdout.write(`\x1b[${lines}A`);
      const rows = frame(pet, f);
      process.stdout.write(rows.map((r) => r + "\x1b[K").join("\n") + "\n");
      lines = rows.length;
      await sleep(pet.mood === "sad" ? 420 : 220);
    }
  } finally {
    process.stdout.write("\x1b[?25h\n");
  }
}

/** One short line for shell prompts and status lines. */
export function petLine(pet: Pet): string {
  const icon = pet.stage === "adult" || pet.stage === "elder" ? SPECIES[pet.species].emoji : STAGE_EMOJI[pet.stage];
  if (pet.mood === "away") return `${icon} ${pet.name} ran away · commit to bring them back`;
  if (pet.mood === "egg") return `${icon} ${pet.name} is waiting to hatch`;
  return `${icon} ${pet.name} ${MOOD_FACE[pet.mood]} ${pet.fullness}% 🔥${pet.streak}`;
}
