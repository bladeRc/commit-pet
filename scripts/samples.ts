// Regenerates the example cards in docs/ for the README: `npm run samples`.

import { mkdirSync, writeFileSync } from "node:fs";
import { computePet, type CommitEvent } from "../src/pet/engine.js";
import { SPECIES, colorForLanguage, spriteFor, type SpeciesId } from "../src/pet/species.js";
import { escapeXml, readableOn, renderCard } from "../src/render/svg.js";

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
  { file: "card-teen", name: "Pipko", events: history("TypeScript", 14, 0) },
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
const LANGS: Record<SpeciesId, string> = {
  blox: "Luau / Lua",
  typo: "TypeScript",
  jello: "JavaScript",
  snek: "Python",
  crab: "Rust",
  zoomer: "Go",
  beanie: "Java / Kotlin",
  pointy: "C / C++ / C#",
  gem: "Ruby",
  stylo: "HTML / CSS",
  shelly: "Shell",
  blob: "everything else",
};
const LANG_OF: Record<SpeciesId, string | null> = {
  blox: "Luau", typo: "TypeScript", jello: "JavaScript", snek: "Python", crab: "Rust", zoomer: "Go",
  beanie: "Java", pointy: "C++", gem: "Ruby", stylo: "HTML", shelly: "Shell", blob: null,
};
const ids = Object.keys(SPECIES) as SpeciesId[];
const order: SpeciesId[] = ["blox", "typo", "jello", "snek", "crab", "zoomer", "beanie", "pointy", "gem", "stylo", "shelly", "blob"];
const cols = 4;
const cw = 170;
const ch = 150;
const cells = order
  .filter((id) => ids.includes(id))
  .map((id, i) => {
    const x = (i % cols) * cw;
    const y = Math.floor(i / cols) * ch;
    const lines = spriteFor("adult", id).map((l) => l.replace(/E/g, "o").replace(/M/g, "w"));
    const top = y + 62 - ((lines.length - 1) * 14) / 2;
    const color = colorForLanguage(LANG_OF[id]);
    const art = lines.map((l, j) => `<tspan x="${x + cw / 2}" y="${top + j * 14}">${escapeXml(l)}</tspan>`).join("");
    return `<g style="--c:${readableOn(color, "light")};--cd:${readableOn(color, "dark")}">
<rect class="cell" x="${x + 6}" y="${y + 6}" width="${cw - 12}" height="${ch - 12}" rx="10"/>
<text class="art" text-anchor="middle" xml:space="preserve">${art}</text>
<text class="name" x="${x + cw / 2}" y="${y + 118}" text-anchor="middle">${SPECIES[id].name}</text>
<text class="lang" x="${x + cw / 2}" y="${y + 134}" text-anchor="middle">${escapeXml(LANGS[id])}</text>
</g>`;
  })
  .join("\n");
const rows = Math.ceil(order.length / cols);
writeFileSync(
  "docs/species.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cw}" height="${rows * ch}" viewBox="0 0 ${cols * cw} ${rows * ch}" role="img" aria-label="All commit-pet species">
<style>
svg { --bg:#ffffff; --border:#d0d7de; --text:#1f2328; --muted:#59636e; }
@media (prefers-color-scheme: dark) { svg { --bg:#0d1117; --border:#30363d; --text:#e6edf3; --muted:#9198a1; } .art { fill: var(--cd) !important; } }
.cell { fill: var(--bg); stroke: var(--border); }
.art { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; font-weight: 700; fill: var(--c); }
.name { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; fill: var(--text); }
.lang { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 11.5px; fill: var(--muted); }
</style>
${cells}
</svg>
`,
);
console.log("docs/species.svg");
