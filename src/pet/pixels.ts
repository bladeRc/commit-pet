// Pixel-art sprites. Both the SVG card and the terminal draw from these.
//
// Sprites are drawn as text, one character per pixel:
//   .  transparent     o  outline      b  body        s  shadow
//   h  highlight       a  accent       w  white       p  pink (cheeks)
//   g  light grey      y  gold
// Body, shadow, highlight and outline are shaded from the pet's language
// colour, so every pet looks different. A sprite is bottom-aligned and
// centred on a 20×20 canvas; adults are at most 17 rows tall so an elder's
// crown fits above them.
//
// Eye and mouth anchors are the top-left corner of the 2×2 eye and 4×2 mouth
// stamps, in the sprite's own coordinates.

import { mix, luminance } from "../render/color.js";
import type { Mood } from "./engine.js";
import type { SpeciesId, Stage } from "./species.js";

export const CANVAS = 20;

/** A canvas of hex colours (null = transparent), indexed [row][column]. */
export type Grid = (string | null)[][];

interface PixelSprite {
  rows: string[];
  eyes: [[number, number], [number, number]];
  mouth: [number, number];
}

const EGG: PixelSprite = {
  rows: [
    "....oooo....",
    "..oohhbboo..",
    ".ohhbbbbbbo.",
    "ohbbbbbbbbbo",
    "ohbwwbbbbbbo",
    "obbbbbbwwbbo",
    "obbbbbbbbbbo",
    "osbwwbbbbbso",
    ".osbbbbbbso.",
    "..oossssoo..",
    "....oooo....",
  ],
  eyes: [[3, 3], [7, 3]],
  mouth: [4, 5],
};

const BABY: PixelSprite = {
  rows: [
    "...oooooo...",
    "..ohhbbbbo..",
    ".ohbbbbbbbo.",
    "ohbbbbbbbbbo",
    "obbbbbbbbbbo",
    "obpbbbbbbpbo",
    "obbbbbbbbbbo",
    "osbbbbbbbbso",
    ".osssssssso.",
    "..oo....oo..",
  ],
  eyes: [[3, 3], [7, 3]],
  mouth: [4, 5],
};

const TEEN: PixelSprite = {
  rows: [
    "..oo........oo..",
    ".ohbo......ohbo.",
    ".ohbbooooooobbo.",
    "ohbbbbbbbbbbbbbo",
    "ohbbbbbbbbbbbbbo",
    "obbbbbbbbbbbbbbo",
    "obppbbbbbbbbppbo",
    "obbbbbbbbbbbbbbo",
    "obbbbbbbbbbbbbbo",
    "osbbbbbbbbbbbbso",
    ".osssssssssssso.",
    "..oooooooooooo..",
    "..obbo....obbo..",
    "..oooo....oooo..",
  ],
  eyes: [[4, 4], [10, 4]],
  mouth: [6, 7],
};

const ADULTS: Record<SpeciesId, PixelSprite & { accent?: string }> = {
  blob: {
    rows: [
      "....oooooooo....",
      "..oohwhbbbbboo..",
      ".ohhhbbbbbbbbbo.",
      "ohhbbbbbbbbbbbbo",
      "ohbbbbbbbbbbbbbo",
      "obbbbbbbbbbbbbbo",
      "obbbbbbbbbbbbbbo",
      "obppbbbbbbbbppbo",
      "obbbbbbbbbbbbbbo",
      "osbbbbbbbbbbbbso",
      "ossbbbbbbbbbbsso",
      ".osssssssssssso.",
      "..oooooooooooo..",
    ],
    eyes: [[4, 4], [10, 4]],
    mouth: [6, 7],
  },
  blox: {
    accent: "#ff6b6b",
    rows: [
      "oooooooooooooo",
      "ohhhhhhhhhhhho",
      "ohbbbbbbbbbbso",
      "ohbbbbbbbbbbso",
      "ohbbbbbbbbbbso",
      "ohbppbbbbppbso",
      "ohbbbbbbbbbbso",
      "ohbbbbbbbbbbso",
      "osssssssssssso",
      "oooooooooooooo",
      "...oaaaaaao...",
      "...oaaaaaao...",
      "...oaaaaaao...",
      "...oooooooo...",
      "...obo..obo...",
      "...ooo..ooo...",
    ],
    eyes: [[4, 3], [8, 3]],
    mouth: [5, 6],
  },
  typo: {
    accent: "#9ecbff",
    rows: [
      "oooooooooooooooo",
      "osssssssssssssso",
      "oshhhhhhhhhhhhso",
      "oshwwwbbbbbbbhso",
      "oshbwbbbbbbbbhso",
      "oshbwbbbbbbbbhso",
      "oshbbbbbbbbbbhso",
      "oshbppbbbbbpphso",
      "oshbbbbbbbbbbhso",
      "osbbbbbbbbbbbbso",
      "osssssssssssssso",
      "oooooooooooooooo",
      "..oao......oao..",
      "..ooo......ooo..",
    ],
    eyes: [[6, 4], [10, 4]],
    mouth: [7, 7],
  },
  jello: {
    accent: "#7a4a1d",
    rows: [
      "......oooooo......",
      "....ooaaaaaaoo....",
      "...oaaaaaaaaaao...",
      "...oaabaaaabaao...",
      "..ohbabbbbbbabbo..",
      "..ohbbbbbbbbbbbo..",
      "..ohbbbbbbbbbbbo..",
      ".ohbbbbbbbbbbbbbo.",
      ".obppbbbbbbbbppbo.",
      ".obbbbbbbbbbbbbbo.",
      ".osbbbbbbbbbbbbso.",
      "oossssssssssssssoo",
      "owwwwwwwwwwwwwwwwo",
      ".oooooooooooooooo.",
    ],
    eyes: [[5, 5], [11, 5]],
    mouth: [7, 8],
  },
  snek: {
    accent: "#ffd866",
    rows: [
      ".....oooooooo.....",
      "....ohhbbbbbbo....",
      "....ohbbbbbbbo....",
      "....obbbbbbbbo....",
      "....obbbbbbbbo....",
      "....osbbbbbbso....",
      ".....osbbbbso.....",
      "......obbbbo......",
      "..ooooobbbbooooo..",
      ".ohhbbbbbbbbbbbbo.",
      ".obbbabbbbbbabbbo.",
      ".osbbbbbbbbbbbbso.",
      "ohbbbbbbbbbbbbbbbo",
      "obbbabbbbbbbbabbbo",
      "osbbbbbbbbbbbbbbso",
      ".osssssssssssssso.",
      "..oooooooooooooo..",
    ],
    eyes: [[6, 2], [10, 2]],
    mouth: [7, 4],
  },
  crab: {
    accent: "#e8553e",
    rows: [
      ".ooo............ooo.",
      "oaa.o..........o.aao",
      "oaaao..........oaaao",
      ".oaao..........oaao.",
      "..oao.oooooooo.oao..",
      "...ooohhbbbbbbooo...",
      "...ohbbbbbbbbbbbo...",
      "..ohbbbbbbbbbbbbbo..",
      "..obbbbbbbbbbbbbbo..",
      "..obppbbbbbbbbppbo..",
      "..osbbbbbbbbbbbbso..",
      "...osssssssssssso...",
      "...oooooooooooooo...",
      "..oo.oo.o..o.oo.oo..",
    ],
    eyes: [[6, 6], [12, 6]],
    mouth: [8, 9],
  },
  zoomer: {
    accent: "#fff1d6",
    rows: [
      "..oo..........oo..",
      ".obpo........opbo.",
      ".obpoooooooooopbo.",
      ".obbhhbbbbbbbbbbo.",
      "ohbbbbbbbbbbbbbbbo",
      "obbbbbbbbbbbbbbbbo",
      "obbbbbbbbbbbbbbbbo",
      "oppbbbbbbbbbbbbppo",
      "obbbbbbbbbbbbbbbbo",
      "obbbbbaaaaaabbbbbo",
      "osbbbaaaaaaaabbbso",
      ".osbbaaaaaaaabbso.",
      "..osssssssssssso..",
      "..oooooooooooooo..",
      "..obbo......obbo..",
      "..oooo......oooo..",
    ],
    eyes: [[5, 4], [11, 4]],
    mouth: [7, 6],
  },
  beanie: {
    accent: "#3b2314",
    rows: [
      "...g...g...g......",
      "....g...g...g.....",
      "oooooooooooooo....",
      "oaaaaaaaaaaaao....",
      "ohbbbbbbbbbbbooo..",
      "ohbbbbbbbbbbbobbo.",
      "ohbbbbbbbbbbbo.bo.",
      "ohppbbbbbbppbo.bo.",
      "ohbbbbbbbbbbbobbo.",
      "ohbbbbbbbbbbbooo..",
      "osbbbbbbbbbbbo....",
      "ossbbbbbbbbsso....",
      ".osssssssssso.....",
      "..oooooooooo......",
    ],
    eyes: [[3, 5], [9, 5]],
    mouth: [5, 8],
  },
  pointy: {
    accent: "#ff7b72",
    rows: [
      "........oo........",
      ".......oaao.......",
      "......ohbbbo......",
      ".....ohbbbbbo.....",
      "....ohbbbbbbbo....",
      "....ohbbbbbbbo....",
      "...ohbbbbbbbbbo...",
      "...ohbbbbbbbbbo...",
      "..ohbbbbbbbbbbbo..",
      "..obppbbbbbbppbo..",
      ".ohbbbbbbbbbbbbbo.",
      ".osbbbbbbbbbbbbso.",
      "osssssssssssssssso",
      "oooooooooooooooooo",
      "...oao......oao...",
      "...ooo......ooo...",
    ],
    eyes: [[6, 6], [10, 6]],
    mouth: [7, 8],
  },
  gem: {
    rows: [
      "...oooooooooooo...",
      "..ohwhhbbbbbbbbo..",
      ".ohhhhbbbbbbbbbbo.",
      "oooooooooooooooooo",
      "obhbbbbbbbbbbbbsbo",
      ".obbbbbbbbbbbbbbo.",
      ".obppbbbbbbbbppbo.",
      "..obbbbbbbbbbbbo..",
      "...osbbbbbbbbso...",
      "....osbbbbbbso....",
      ".....osbbbbso.....",
      "......osssso......",
      ".......oooo.......",
    ],
    eyes: [[5, 4], [11, 4]],
    mouth: [7, 7],
  },
  stylo: {
    accent: "#f78166",
    rows: [
      "..oooooooooooooo..",
      "..ohhbbbbbbbbbbo..",
      "..ohbbbbbbbbbbbo..",
      ".aohbbbbbbbbbbboa.",
      "a.ohbbbbbbbbbbbo.a",
      ".aohbbbbbbbbbbboa.",
      "..obppbbbbbbppbo..",
      "..obbbbbbbbbbbbo..",
      "..osbbbbbbbbbbso..",
      "..osssssssssssso..",
      "..oooooooooooooo..",
      "...obo......obo...",
      "...ooo......ooo...",
    ],
    eyes: [[5, 3], [11, 3]],
    mouth: [7, 7],
  },
  shelly: {
    accent: "#8b5a2b",
    rows: [
      ".....oooooooooo.....",
      "...ooaaaaaaaaaaoo...",
      "..oaaoaaaaaaaaoaao..",
      ".oaaaooooooooooaaao.",
      ".oaaaohhbbbbbboaaao.",
      ".oaaaohbbbbbbboaaao.",
      ".oaaaobbbbbbbboaaao.",
      ".oaaaobppbbppboaaao.",
      "..oaaobbbbbbbboaao..",
      "...ooosbbbbbbsooo...",
      ".....osssssssso.....",
      ".....oooooooooo.....",
      "...obbo......obbo...",
      "...oooo......oooo...",
    ],
    eyes: [[7, 5], [11, 5]],
    mouth: [8, 8],
  },
};

const CROWN = ["y.y.y", "yyyyy", "yypyy"];

// Faces ------------------------------------------------------------------------

const FIXED: Record<string, string> = {
  k: "#1b1f24",
  w: "#ffffff",
  p: "#ff9eb5",
  y: "#ffd33d",
  t: "#4fa3ff",
  g: "#c9d1d9",
  d: "#8b949e",
};

const EYES = {
  open: ["kw", "kk"],
  closed: ["..", "kk"],
};

const MOUTHS = {
  smile: ["k..k", ".kk."],
  grin: ["kkkk", ".kk."],
  open: [".kk.", ".pp."],
  frown: [".kk.", "k..k"],
};

function faceFor(mood: Mood, blink: boolean): { eyes: string[]; mouth: string[]; tear: boolean } {
  switch (mood) {
    case "hyped":
      return { eyes: blink ? EYES.closed : EYES.open, mouth: MOUTHS.grin, tear: false };
    case "hungry":
      return { eyes: blink ? EYES.closed : EYES.open, mouth: MOUTHS.open, tear: false };
    case "sad":
      return { eyes: EYES.closed, mouth: MOUTHS.frown, tear: true };
    default:
      return { eyes: blink ? EYES.closed : EYES.open, mouth: MOUTHS.smile, tear: false };
  }
}

// Palette ------------------------------------------------------------------------

export function paletteFor(color: string, accent?: string): Record<string, string> {
  // Very dark language colours (C, Ruby, PowerShell) would hide the eyes.
  const body = luminance(color) < 0.08 ? mix(color, "#ffffff", 0.4) : color;
  return {
    ...FIXED,
    b: body,
    h: mix(body, "#ffffff", 0.4),
    s: mix(body, "#000000", 0.25),
    o: mix(body, "#000000", 0.62),
    a: accent ?? mix(body, "#ffffff", 0.65),
  };
}

// Composition ---------------------------------------------------------------------

export function emptyGrid(): Grid {
  return Array.from({ length: CANVAS }, () => Array<string | null>(CANVAS).fill(null));
}

/** Paints `rows` onto `grid` at (x, y) using `palette`; "." leaves pixels alone. */
export function stamp(grid: Grid, rows: string[], x: number, y: number, palette: Record<string, string>): void {
  rows.forEach((row, dy) => {
    [...row].forEach((ch, dx) => {
      if (ch === ".") return;
      const color = palette[ch];
      if (!color) throw new Error(`Unknown pixel "${ch}"`);
      const r = y + dy;
      const c = x + dx;
      if (r >= 0 && r < CANVAS && c >= 0 && c < CANVAS) grid[r]![c] = color;
    });
  });
}

export function spriteOf(stage: Stage, species: SpeciesId): PixelSprite & { accent?: string } {
  switch (stage) {
    case "egg":
      return EGG;
    case "baby":
      return BABY;
    case "teen":
      return TEEN;
    default:
      return ADULTS[species];
  }
}

export const ALL_SPRITES: Record<string, PixelSprite> = { egg: EGG, baby: BABY, teen: TEEN, ...ADULTS };

/** Where a sprite lands on the canvas: bottom-aligned, centred on its drawn pixels. */
function placement(rows: string[]): { x: number; y: number; left: number; right: number } {
  let left = Infinity;
  let right = -Infinity;
  for (const row of rows) {
    const first = row.search(/[^.]/);
    if (first < 0) continue;
    left = Math.min(left, first);
    right = Math.max(right, row.length - 1 - [...row].reverse().join("").search(/[^.]/));
  }
  const x = Math.floor((CANVAS - (right - left + 1)) / 2) - left;
  return { x, y: CANVAS - rows.length, left: left + x, right: right + x };
}

export interface ComposeOptions {
  stage: Stage;
  species: SpeciesId;
  mood: Mood;
  color: string;
  blink?: boolean;
}

/** The pet as a 20×20 grid of colours, face and all. */
export function composeSprite(opts: ComposeOptions): Grid {
  const sprite = spriteOf(opts.stage, opts.species);
  const palette = paletteFor(opts.color, opts.stage === "adult" || opts.stage === "elder" ? ADULTS[opts.species].accent : undefined);
  const grid = emptyGrid();
  const { x, y, left, right } = placement(sprite.rows);
  stamp(grid, sprite.rows, x, y, palette);

  if (opts.stage === "elder") {
    const cx = Math.round((left + right) / 2) - 2;
    stamp(grid, CROWN, cx, y - CROWN.length, palette);
  }
  if (opts.stage === "egg") return grid;

  const face = faceFor(opts.mood, opts.blink ?? false);
  for (const [ex, ey] of sprite.eyes) stamp(grid, face.eyes, x + ex, y + ey, palette);
  stamp(grid, face.mouth, x + sprite.mouth[0], y + sprite.mouth[1], palette);
  if (face.tear) stamp(grid, ["t", "t"], x + sprite.eyes[0][0], y + sprite.eyes[0][1] + 2, palette);
  return grid;
}

// Scenery ---------------------------------------------------------------------------

/** Shown instead of the pet when it has run away: a question mark and footprints. */
export function awayScene(): Grid {
  const grid = emptyGrid();
  const palette = FIXED;
  stamp(grid, [".ddd.", "d...d", "....d", "...d.", "..d..", ".....", "..d.."], 8, 3, palette);
  const print = ["dd", "dd"];
  [[2, 17], [5, 15], [9, 17], [12, 15], [16, 17]].forEach(([px, py]) => stamp(grid, print, px!, py!, palette));
  return grid;
}

export const SPARKLE = [".y.", "ywy", ".y."];
export const CLOUD = ["...dddd...", ".ddggggdd.", "dggggggggd", "dggggggggd", ".dddddddd."];
export const BOWL = ["ddddddddd", "dgggggggd", ".dwwwwwd.", "..ddddd.."];
export const DROP = ["t", "t"];
export const FIXED_PALETTE = FIXED;
