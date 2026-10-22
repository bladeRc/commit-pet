// The animated SVG card for GitHub profile READMEs.

import type { Pet } from "../pet/engine.js";
import {
  BOWL,
  CANVAS,
  CLOUD,
  DROP,
  FIXED_PALETTE,
  SPARKLE,
  awayScene,
  composeSprite,
  type Grid,
} from "../pet/pixels.js";
import { readableOn } from "./color.js";
import { MOOD_FACE, MOOD_LABEL, petColor, speech, stageProgress, title } from "./face.js";

export type Theme = "auto" | "light" | "dark";

interface Palette {
  bg: string;
  border: string;
  text: string;
  muted: string;
  track: string;
  food: string;
}

const LIGHT: Palette = {
  bg: "#ffffff",
  border: "#d0d7de",
  text: "#1f2328",
  muted: "#59636e",
  track: "#eaeef2",
  food: "#1a7f37",
};

const DARK: Palette = {
  bg: "#0d1117",
  border: "#30363d",
  text: "#e6edf3",
  muted: "#9198a1",
  track: "#21262d",
  food: "#3fb950",
};

export function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

function vars(p: Palette, pet: string): string {
  return `--bg:${p.bg};--border:${p.border};--text:${p.text};--muted:${p.muted};--track:${p.track};--food:${p.food};--pet:${pet};`;
}

const W = 495;
const H = 195;
const HABITAT = { x: 12, y: 12, w: 170, h: 171 };
const GROUND = HABITAT.y + HABITAT.h - 22;
const PX = 6;
const SPRITE_X = HABITAT.x + (HABITAT.w - CANVAS * PX) / 2;
const SPRITE_Y = GROUND - 1 - CANVAS * PX;

/**
 * Draws a grid as one <path> per colour. Runs of same-coloured pixels in a row
 * become a single rectangle, which keeps cards small.
 */
export function gridPaths(grid: Grid, x0: number, y0: number, px: number): string {
  const byColor = new Map<string, string[]>();
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const color = row[x];
      if (!color) {
        x++;
        continue;
      }
      let end = x;
      while (row[end + 1] === color) end++;
      const w = (end - x + 1) * px;
      const d = `M${x0 + x * px} ${y0 + y * px}h${w}v${px}h-${w}z`;
      (byColor.get(color) ?? byColor.set(color, []).get(color)!).push(d);
      x = end + 1;
    }
  });
  return [...byColor].map(([color, ds]) => `<path fill="${color}" d="${ds.join("")}"/>`).join("");
}

/** Only the pixels where `b` differs from `a`, e.g. the eyes when blinking. */
function diff(a: Grid, b: Grid): Grid {
  return b.map((row, y) => row.map((c, x) => (c !== a[y]![x] ? c : null)));
}

function small(rows: string[], x0: number, y0: number, px: number): string {
  const grid: Grid = rows.map((row) => [...row].map((ch) => (ch === "." ? null : FIXED_PALETTE[ch]!)));
  return gridPaths(grid, x0, y0, px);
}

function petLayer(pet: Pet): string {
  if (pet.mood === "away") return `<g class="float">${gridPaths(awayScene(), SPRITE_X, SPRITE_Y, PX)}</g>`;

  const opts = { stage: pet.stage, species: pet.species, mood: pet.mood, color: petColor(pet) };
  const open = composeSprite(opts);
  const blink = diff(open, composeSprite({ ...opts, blink: true }));
  const hasBlink = blink.some((row) => row.some(Boolean));
  const body = `<g class="pet ${pet.stage === "egg" ? "egg" : pet.mood}">${gridPaths(open, SPRITE_X, SPRITE_Y, PX)}${
    hasBlink ? `<g class="closed">${gridPaths(blink, SPRITE_X, SPRITE_Y, PX)}</g>` : ""
  }</g>`;

  const cx = HABITAT.x + HABITAT.w / 2;
  let extras = "";
  if (pet.mood === "hyped") {
    const spots: [number, number][] = [[16, 30], [166, 22], [166, 96], [16, 112]];
    extras = spots
      .map(([x, y], i) => `<g class="spark" style="animation-delay:${(i * 0.45).toFixed(2)}s">${small(SPARKLE, x, y, 4)}</g>`)
      .join("");
  } else if (pet.mood === "sad") {
    const cloudX = cx - (CLOUD[0]!.length * 5) / 2;
    const cloudY = HABITAT.y + 6;
    extras =
      small(CLOUD, cloudX, cloudY, 5) +
      [0.25, 0.5, 0.75]
        .map(
          (f, i) =>
            `<g class="drop" style="animation-delay:${(i * 0.4).toFixed(1)}s">${small(DROP, cloudX + Math.round(f * 50) - 2, cloudY + 26, 4)}</g>`,
        )
        .join("");
  } else if (pet.mood === "hungry") {
    extras = `<g class="bowl">${small(BOWL, HABITAT.x + HABITAT.w - 48, HABITAT.y + 12, 4)}</g>`;
  }
  return body + extras;
}

function bar(y: number, label: string, fraction: number, cls: string, value: string, delay: number): string {
  const x = 252;
  const w = 160;
  const f = Math.max(0, Math.min(1, fraction));
  return [
    `<text class="label" x="200" y="${y + 8}">${label}</text>`,
    `<rect x="${x}" y="${y}" width="${w}" height="9" rx="4.5" fill="var(--track)"/>`,
    f > 0
      ? `<rect class="fill ${cls}" style="animation-delay:${delay}s" x="${x}" y="${y}" width="${Math.max(9, w * f).toFixed(1)}" height="9" rx="4.5"/>`
      : "",
    `<text class="value" x="${W - 14}" y="${y + 8}" text-anchor="end">${escapeXml(value)}</text>`,
  ].join("");
}

export function renderCard(pet: Pet, opts: { theme?: Theme; login?: string } = {}): string {
  const theme = opts.theme ?? "auto";
  const color = petColor(pet);
  const light = vars(LIGHT, readableOn(color, "light"));
  const dark = vars(DARK, readableOn(color, "dark"));
  const rootVars = theme === "dark" ? dark : light;
  const autoDark = theme === "auto" ? `@media (prefers-color-scheme: dark) { svg { ${dark} } }` : "";

  const xpValue =
    pet.stage === "egg" ? "0 xp" : pet.nextStageXp === null ? `${pet.xp} xp` : `${pet.xp}/${pet.nextStageXp} xp`;
  const facts = [`${pet.commits} commit${pet.commits === 1 ? "" : "s"}`, `${pet.ageDays} days old`];
  if (pet.topLanguage) facts.push(pet.topLanguage);
  if (opts.login) facts.push(`@${opts.login}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(`${title(pet)}: ${MOOD_LABEL[pet.mood]}, ${pet.fullness}% fed, ${pet.streak}-day streak`)}">
<title>${escapeXml(title(pet))}</title>
<style>
svg { ${rootVars} }
${autoDark}
text { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; fill: var(--text); }
.name { font-size: 18px; font-weight: 700; }
.mood { font-size: 13px; fill: var(--muted); }
.label, .value { font-size: 12px; fill: var(--muted); }
.facts { font-size: 12px; fill: var(--muted); }
.speech { font-size: 11.5px; font-style: italic; fill: var(--muted); }
.fill { transform-box: fill-box; transform-origin: left; animation: grow 0.9s ease-out both; }
.fill.food { fill: var(--food); }
.fill.xp { fill: var(--pet); }
.pet { animation: hop 2.4s steps(1, end) infinite; }
.pet.hyped { animation-duration: 1.1s; }
.pet.sad { animation: none; }
.pet.hungry { animation: shake 2.6s steps(1, end) infinite; }
.pet.egg { animation: shake 3.2s steps(1, end) infinite; }
.closed { opacity: 0; animation: blink 3.6s steps(1, end) infinite; }
.spark { opacity: 0; animation: twinkle 1.8s ease-in-out infinite; }
.drop { opacity: 0; animation: fall 1.2s linear infinite; }
.bowl { animation: hop 1.6s steps(1, end) infinite; }
.float { animation: hop 3s steps(1, end) infinite; opacity: 0.8; }
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes hop { 0%, 60%, 85%, 100% { transform: translateY(0); } 65%, 80% { transform: translateY(-${PX}px); } }
@keyframes shake { 0%, 70%, 86%, 100% { transform: translateX(0); } 72% { transform: translateX(-${PX}px); } 76% { transform: translateX(${PX}px); } 80% { transform: translateX(-${PX}px); } 84% { transform: translateX(0); } }
@keyframes blink { 0% { opacity: 0; } 90% { opacity: 1; } 95%, 100% { opacity: 0; } }
@keyframes twinkle { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
@keyframes fall { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(16px); } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } .closed, .drop { opacity: 0; } .spark { opacity: 1; } }
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="var(--bg)" stroke="var(--border)"/>
<rect x="${HABITAT.x}" y="${HABITAT.y}" width="${HABITAT.w}" height="${HABITAT.h}" rx="8" fill="var(--pet)" fill-opacity="0.09"/>
<line x1="${HABITAT.x + 12}" x2="${HABITAT.x + HABITAT.w - 12}" y1="${GROUND}" y2="${GROUND}" stroke="var(--pet)" stroke-opacity="0.3" stroke-width="2" stroke-linecap="round"/>
<g shape-rendering="crispEdges">${petLayer(pet)}</g>
<text class="name" x="200" y="38">${escapeXml(title(pet))}</text>
<text class="mood" x="200" y="59">${escapeXml(`${MOOD_LABEL[pet.mood]}  ${MOOD_FACE[pet.mood]}`)}</text>
${bar(76, "food", pet.fullness / 100, "food", `${pet.fullness}%`, 0)}
${bar(100, "xp", stageProgress(pet), "xp", xpValue, 0.15)}
<text class="label" x="200" y="136">streak</text>
<text class="value" x="252" y="136">🔥 ${pet.streak} day${pet.streak === 1 ? "" : "s"}  ·  best ${pet.bestStreak}</text>
<text class="facts" x="200" y="160">${escapeXml(facts.join("  ·  "))}</text>
<text class="speech" x="200" y="180">“${escapeXml(speech(pet))}”</text>
</svg>
`;
}
