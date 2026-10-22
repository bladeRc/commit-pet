// Regenerates the example cards in docs/ for the README: `npm run samples`.

import { mkdirSync, writeFileSync } from "node:fs";
import { computePet, type CommitEvent } from "../src/pet/engine.js";
import { composeSprite } from "../src/pet/pixels.js";
import { SPECIES, colorForLanguage, type SpeciesId } from "../src/pet/species.js";
import { escapeXml, gridPaths, renderCard } from "../src/render/svg.js";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-22T12:00:00Z");

/** `n` days of commits ending `idleDays` before NOW, `perDay` commits each. */
function history(lang: string, n: number, idleDays: number, perDay = 1): CommitEvent[] {
  const end = NOW - idleDays * DAY;
  const events: CommitEvent[] = [];
  for (let d = n - 1; d >= 0; d--)
    for (let k = 0; k < perDay; k++) events.push({ t: end - d * DAY - k * 2 * 3_600_000 - 3_600_000, lines: 40, lang });
  return events;
}

const samples: { file: string; name: string; events: CommitEvent[] }[] = [
  { file: "card-hyped", name: "Mochi", events: history("Luau", 70, 0) },
  { file: "card-teen", name: "Pipko", events: history("TypeScript", 14, 0.2) },
  { file: "card-hungry", name: "Zuri", events: history("Python", 40, 1.5, 2) },
  { file: "card-sad", name: "Kobo", events: history("Rust", 50, 4) },
  { file: "card-elder", name: "Nemi", events: history("Go", 300, 0, 2) },
  { file: "card-away", name: "Tapo", events: history("JavaScript", 30, 9) },
  { file: "card-egg", name: "Bix", events: [] },
];

mkdirSync("docs", { recursive: true });
for (const s of samples) {
  const pet = computePet({ seed: s.file, name: s.name, bornAt: s.events[0]?.t ?? NOW }, s.events, NOW);
  writeFileSync(`docs/${s.file}.svg`, renderCard(pet));
  console.log(`docs/${s.file}.svg  ${pet.name}: ${pet.stage} ${pet.species} ${pet.mood}`);
}

// A gallery of every adult form, one per language family.
const GALLERY: [SpeciesId, string, string | null][] = [
  ["blox", "Luau / Lua", "Luau"],
  ["typo", "TypeScript", "TypeScript"],
  ["jello", "JavaScript", "JavaScript"],
  ["snek", "Python", "Python"],
  ["crab", "Rust", "Rust"],
  ["zoomer", "Go", "Go"],
  ["beanie", "Java / Kotlin", "Java"],
  ["pointy", "C / C++ / C#", "C++"],
  ["gem", "Ruby", "Ruby"],
  ["stylo", "HTML / CSS", "HTML"],
  ["shelly", "Shell", "Shell"],
  ["blob", "everything else", null],
];
const cols = 4;
const cw = 170;
const ch = 160;
const px = 5;
const cells = GALLERY.map(([id, label, lang], i) => {
  const x = (i % cols) * cw;
  const y = Math.floor(i / cols) * ch;
  const grid = composeSprite({ stage: "adult", species: id, mood: "happy", color: colorForLanguage(lang) });
  return `<rect class="cell" x="${x + 6}" y="${y + 6}" width="${cw - 12}" height="${ch - 12}" rx="10"/>
<g shape-rendering="crispEdges">${gridPaths(grid, x + (cw - 20 * px) / 2, y + 14, px)}</g>
<text class="name" x="${x + cw / 2}" y="${y + 130}" text-anchor="middle">${SPECIES[id].name}</text>
<text class="lang" x="${x + cw / 2}" y="${y + 146}" text-anchor="middle">${escapeXml(label)}</text>`;
}).join("\n");
const rows = Math.ceil(GALLERY.length / cols);
writeFileSync(
  "docs/species.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cw}" height="${rows * ch}" viewBox="0 0 ${cols * cw} ${rows * ch}" role="img" aria-label="All commit-pet species">
<style>
svg { --bg:#ffffff; --border:#d0d7de; --text:#1f2328; --muted:#59636e; }
@media (prefers-color-scheme: dark) { svg { --bg:#0d1117; --border:#30363d; --text:#e6edf3; --muted:#9198a1; } }
.cell { fill: var(--bg); stroke: var(--border); }
.name { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; fill: var(--text); }
.lang { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 11.5px; fill: var(--muted); }
</style>
${cells}
</svg>
`,
);
console.log("docs/species.svg");
