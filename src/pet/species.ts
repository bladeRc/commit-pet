// Species, languages and sprites.
//
// Sprites use two placeholder characters that never appear in the art itself:
//   E = an eye, M = the mouth.
// The renderers swap them for mood-specific characters.

export type Stage = "egg" | "baby" | "teen" | "adult" | "elder";

export type SpeciesId =
  | "blob"
  | "blox"
  | "typo"
  | "jello"
  | "snek"
  | "crab"
  | "zoomer"
  | "beanie"
  | "pointy"
  | "gem"
  | "stylo"
  | "shelly";

export interface Species {
  id: SpeciesId;
  name: string;
  emoji: string;
  sprite: string[];
}

export const SPECIES: Record<SpeciesId, Species> = {
  blob: {
    id: "blob",
    name: "Blob",
    emoji: "🫧",
    sprite: [
      "   .-----.   ",
      "  /  E E  \\  ",
      " |    M    | ",
      "  \\_______/  ",
    ],
  },
  blox: {
    id: "blox",
    name: "Blox",
    emoji: "🧊",
    sprite: [
      "  +-------+  ",
      "  | E   E |  ",
      "  |   M   |  ",
      "  +-------+  ",
      "   |_| |_|   ",
    ],
  },
  typo: {
    id: "typo",
    name: "Typo",
    emoji: "⌨️",
    sprite: [
      "  .-------.  ",
      "  | {   } |  ",
      "  | E   E |  ",
      "  |   M   |  ",
      "  '-------'  ",
    ],
  },
  jello: {
    id: "jello",
    name: "Jello",
    emoji: "🍮",
    sprite: [
      "    .---.    ",
      "  .' E E '.  ",
      " (    M    ) ",
      "  '~~~~~~~'  ",
    ],
  },
  snek: {
    id: "snek",
    name: "Snek",
    emoji: "🐍",
    sprite: [
      "    .---.    ",
      "   ( E E )   ",
      "    \\ M /    ",
      "  .--) (--.  ",
      " (____)____) ",
    ],
  },
  crab: {
    id: "crab",
    name: "Crabby",
    emoji: "🦀",
    sprite: [
      " (\\/)   (\\/) ",
      "  \\ \\___/ /  ",
      "  ( E   E )  ",
      "  (   M   )  ",
      "  /|/   \\|\\  ",
    ],
  },
  zoomer: {
    id: "zoomer",
    name: "Zoomer",
    emoji: "🐹",
    sprite: [
      "  (\\_____/)  ",
      "  ( E   E )  ",
      "  (   M   )  ",
      "  (\")___(\")  ",
    ],
  },
  beanie: {
    id: "beanie",
    name: "Beanie",
    emoji: "☕",
    sprite: [
      "    ) ) )    ",
      "  .-------.  ",
      "  | E   E |] ",
      "  |   M   |  ",
      "  '-------'  ",
    ],
  },
  pointy: {
    id: "pointy",
    name: "Pointy",
    emoji: "📌",
    sprite: [
      "      *      ",
      "     / \\     ",
      "    / E \\    ",
      "   /  M  \\   ",
      "  /_______\\  ",
    ],
  },
  gem: {
    id: "gem",
    name: "Gem",
    emoji: "💎",
    sprite: [
      "   _______   ",
      "  /_\\___/_\\  ",
      "  \\ E   E /  ",
      "   \\  M  /   ",
      "    \\___/    ",
    ],
  },
  stylo: {
    id: "stylo",
    name: "Stylo",
    emoji: "🎨",
    sprite: [
      "   <div>     ",
      "  .-------.  ",
      "  | E   E |  ",
      "  |   M   |  ",
      "  '-------'  ",
      "     </div>  ",
    ],
  },
  shelly: {
    id: "shelly",
    name: "Shelly",
    emoji: "🐢",
    sprite: [
      "     _____   ",
      "   _/#####\\  ",
      "  (E)M####|  ",
      "   ^^-----^^ ",
    ],
  },
};

const EGG = [
  "             ",
  "     ___     ",
  "    /   \\    ",
  "   | .'. |   ",
  "    \\___/    ",
];

const BABY = [
  "             ",
  "             ",
  "    .---.    ",
  "   ( E E )   ",
  "    ( M )    ",
];

const TEEN = [
  "             ",
  "   .-----.   ",
  "  ( E   E )  ",
  "  (   M   )  ",
  "   \\_____/   ",
  "    ^   ^    ",
];

const CROWN = "   .^.^.^.   ";

/** The sprite for a stage/species, before the face is filled in. */
export function spriteFor(stage: Stage, species: SpeciesId): string[] {
  switch (stage) {
    case "egg":
      return EGG;
    case "baby":
      return BABY;
    case "teen":
      return TEEN;
    case "adult":
      return SPECIES[species].sprite;
    case "elder":
      return [CROWN, ...SPECIES[species].sprite];
  }
}

export const STAGE_EMOJI: Record<Stage, string> = {
  egg: "🥚",
  baby: "🐣",
  teen: "🐥",
  adult: "",
  elder: "👑",
};

// Language detection ----------------------------------------------------------

const EXT_LANG: Record<string, string> = {
  lua: "Luau",
  luau: "Luau",
  ts: "TypeScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  rs: "Rust",
  go: "Go",
  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",
  c: "C",
  h: "C",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  hpp: "C++",
  cs: "C#",
  rb: "Ruby",
  php: "PHP",
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "CSS",
  sass: "CSS",
  vue: "JavaScript",
  svelte: "JavaScript",
  swift: "Swift",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  ps1: "Shell",
};

/** Language for a file path, or null for files that aren't code (docs, configs, images…). */
export function languageOfPath(path: string): string | null {
  const dot = path.lastIndexOf(".");
  if (dot < 0) return null;
  return EXT_LANG[path.slice(dot + 1).toLowerCase()] ?? null;
}

// Keys are lowercased GitHub language names, which is also what languageOfPath produces.
const LANG_SPECIES: Record<string, SpeciesId> = {
  luau: "blox",
  lua: "blox",
  typescript: "typo",
  javascript: "jello",
  vue: "jello",
  svelte: "jello",
  python: "snek",
  "jupyter notebook": "snek",
  rust: "crab",
  go: "zoomer",
  java: "beanie",
  kotlin: "beanie",
  c: "pointy",
  "c++": "pointy",
  "c#": "pointy",
  ruby: "gem",
  html: "stylo",
  css: "stylo",
  scss: "stylo",
  shell: "shelly",
  powershell: "shelly",
};

export function speciesForLanguage(lang: string | null): SpeciesId {
  if (!lang) return "blob";
  return LANG_SPECIES[lang.toLowerCase()] ?? "blob";
}

// GitHub's linguist colours, used to tint the pet.
const LANG_COLOR: Record<string, string> = {
  luau: "#00a2ff",
  lua: "#00a2ff",
  typescript: "#3178c6",
  javascript: "#f1e05a",
  python: "#3572a5",
  rust: "#dea584",
  go: "#00add8",
  java: "#b07219",
  kotlin: "#a97bff",
  c: "#555555",
  "c++": "#f34b7d",
  "c#": "#178600",
  ruby: "#701516",
  php: "#4f5d95",
  html: "#e34c26",
  css: "#663399",
  swift: "#f05138",
  shell: "#89e051",
  powershell: "#012456",
};

export const DEFAULT_COLOR = "#8957e5";

export function colorForLanguage(lang: string | null): string {
  if (!lang) return DEFAULT_COLOR;
  return LANG_COLOR[lang.toLowerCase()] ?? DEFAULT_COLOR;
}

// Names -----------------------------------------------------------------------

const SYLLABLES = ["mo", "chi", "bi", "ko", "pi", "nu", "zu", "ta", "lo", "ri", "fi", "po", "ki", "da", "mi", "bo", "su", "ne"];
const ENDINGS = ["", "", "", "x", "p", "n", "bo", "ko"];

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A cute, deterministic name for a seed. */
export function nameFromSeed(seed: string): string {
  let h = hashString(seed);
  const pick = <T>(list: T[]): T => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    return list[h % list.length]!;
  };
  const name = pick(SYLLABLES) + pick(SYLLABLES) + pick(ENDINGS);
  return name[0]!.toUpperCase() + name.slice(1);
}
