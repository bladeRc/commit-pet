// The pet in your terminal.

import type { Pet } from "../pet/engine.js";
import { CANVAS, awayScene, composeSprite, type Grid } from "../pet/pixels.js";
import { SPECIES, STAGE_EMOJI } from "../pet/species.js";
import { rgbOf } from "./color.js";
import { MOOD_FACE, MOOD_LABEL, petArt, petColor, speech, stageProgress, title } from "./face.js";

// Same convention as Node itself: FORCE_COLOR wins, then NO_COLOR, then "is this a terminal?".
const useColor = (): boolean =>
  process.env.FORCE_COLOR ? process.env.FORCE_COLOR !== "0" : process.stdout.isTTY === true && !process.env.NO_COLOR;

const fg = (hex: string): string => `\x1b[38;2;${rgbOf(hex).join(";")}m`;
const bg = (hex: string): string => `\x1b[48;2;${rgbOf(hex).join(";")}m`;

function rgb(hex: string, text: string): string {
  return useColor() ? `${fg(hex)}${text}\x1b[0m` : text;
}

/**
 * Pixel art in the terminal: each character cell shows two pixels stacked,
 * using "▀" with the top pixel as the text colour and the bottom one as the
 * background. Empty pairs of rows at the top are trimmed.
 */
export function halfBlocks(grid: Grid): string[] {
  let top = 0;
  const empty = (y: number) => grid[y]?.every((c) => c === null) ?? true;
  while (top < grid.length - 2 && empty(top) && empty(top + 1)) top += 2;

  const rows: string[] = [];
  for (let y = top; y < grid.length; y += 2) {
    let line = "";
    for (let x = 0; x < CANVAS; x++) {
      const t = grid[y]![x] ?? null;
      const b = grid[y + 1]?.[x] ?? null;
      if (!t && !b) line += " ";
      else if (t && !b) line += `${fg(t)}▀\x1b[0m`;
      else if (!t && b) line += `${fg(b)}▄\x1b[0m`;
      else line += `${fg(t!)}${bg(b!)}▀\x1b[0m`;
    }
    rows.push(line);
  }
  return rows;
}

const ASCII_WIDTH = 15;
const PIXEL_WIDTH = CANVAS + 2;

/** The pet's picture as rows of equal visible width. */
function artRows(pet: Pet, blink = false): { rows: string[]; width: number } {
  if (!useColor()) return { rows: petArt(pet, blink).map((l) => l.padEnd(ASCII_WIDTH)), width: ASCII_WIDTH };
  const grid =
    pet.mood === "away"
      ? awayScene()
      : composeSprite({ stage: pet.stage, species: pet.species, mood: pet.mood, color: petColor(pet), blink });
  return { rows: halfBlocks(grid).map((l) => ` ${l} `), width: PIXEL_WIDTH };
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

/** One frame: art on the left, stats on the right, speech underneath. */
export function frame(pet: Pet, opts: { blink?: boolean; bob?: boolean } = {}): string[] {
  const { rows: art, width } = artRows(pet, opts.blink);
  const stats = statLines(pet);
  const height = Math.max(art.length + 1, stats.length);
  const top = Math.ceil((height - art.length) / 2) - (opts.bob ? 1 : 0);

  const rows: string[] = [];
  for (let i = 0; i < height; i++) {
    rows.push((art[i - top] ?? " ".repeat(width)) + "  " + (stats[i] ?? ""));
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
