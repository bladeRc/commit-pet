// The animated SVG card for GitHub profile READMEs.

import type { Pet } from "../pet/engine.js";
import { MOOD_FACE, MOOD_LABEL, petArt, petColor, speech, stageProgress, title } from "./face.js";

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

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

function mix(hex: string, toward: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(toward.slice(1), 16);
  const out = [16, 8, 0].map((shift) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * amount);
  });
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Keeps language colours readable: darkens pale ones on light, lightens dark ones on dark. */
export function readableOn(color: string, theme: "light" | "dark"): string {
  const lum = luminance(color);
  if (theme === "light" && lum > 0.45) return mix(color, "#000000", 0.4);
  if (theme === "dark" && lum < 0.12) return mix(color, "#ffffff", 0.5);
  return color;
}

function vars(p: Palette, pet: string): string {
  return `--bg:${p.bg};--border:${p.border};--text:${p.text};--muted:${p.muted};--track:${p.track};--food:${p.food};--pet:${pet};`;
}

const W = 495;
const H = 195;
const HABITAT = { x: 12, y: 12, w: 170, h: 171 };
const LINE = 17;
const GROUND = HABITAT.y + HABITAT.h - 22;

function artText(lines: string[], cls: string): string {
  // Bottom-aligned so the pet stands on the ground line.
  const top = GROUND - 12 - (lines.length - 1) * LINE;
  const cx = HABITAT.x + HABITAT.w / 2;
  const tspans = lines
    .map((l, i) => `<tspan x="${cx}" y="${top + i * LINE}">${escapeXml(l)}</tspan>`)
    .join("");
  return `<text class="art ${cls}" text-anchor="middle" xml:space="preserve">${tspans}</text>`;
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

  const away = pet.mood === "away";
  const art = away
    ? artText(petArt(pet), "pet float")
    : `<g class="pet ${pet.mood}">${artText(petArt(pet), "open")}${artText(petArt(pet, true), "closed")}</g>`;

  const xpValue =
    pet.stage === "egg" ? "0 xp" : pet.nextStageXp === null ? `${pet.xp} xp` : `${pet.xp}/${pet.nextStageXp} xp`;
  const facts = [`${pet.commits} commit${pet.commits === 1 ? "" : "s"}`, `${pet.ageDays} days old`];
  if (pet.topLanguage) facts.push(pet.topLanguage);
  if (opts.login) facts.push(`@${opts.login}`);
  const bob = pet.mood === "sad" ? "4s" : pet.mood === "hyped" ? "0.9s" : "2.2s";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(`${title(pet)}: ${MOOD_LABEL[pet.mood]}, ${pet.fullness}% fed, ${pet.streak}-day streak`)}">
<title>${escapeXml(title(pet))}</title>
<style>
svg { ${rootVars} }
${autoDark}
text { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; fill: var(--text); }
.art { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 15px; font-weight: 700; fill: var(--pet); }
.name { font-size: 18px; font-weight: 700; }
.mood { font-size: 13px; fill: var(--muted); }
.label, .value { font-size: 12px; fill: var(--muted); }
.facts { font-size: 12px; fill: var(--muted); }
.speech { font-size: 11.5px; font-style: italic; fill: var(--muted); }
.fill { transform-box: fill-box; transform-origin: left; animation: grow 0.9s ease-out both; }
.fill.food { fill: var(--food); }
.fill.xp { fill: var(--pet); }
.pet { animation: bob ${bob} ease-in-out infinite; }
.pet.hungry { animation-name: wiggle; }
.closed { opacity: 0; animation: blink 4s infinite; }
.open { animation: unblink 4s infinite; }
.float { animation: bob 3s ease-in-out infinite; opacity: 0.7; }
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes wiggle { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
@keyframes blink { 0%, 93%, 100% { opacity: 0; } 95%, 98% { opacity: 1; } }
@keyframes unblink { 0%, 93%, 100% { opacity: 1; } 95%, 98% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } .closed { opacity: 0; } }
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="var(--bg)" stroke="var(--border)"/>
<rect x="${HABITAT.x}" y="${HABITAT.y}" width="${HABITAT.w}" height="${HABITAT.h}" rx="8" fill="var(--pet)" fill-opacity="0.09"/>
<line x1="${HABITAT.x + 18}" x2="${HABITAT.x + HABITAT.w - 18}" y1="${GROUND}" y2="${GROUND}" stroke="var(--pet)" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round"/>
${art}
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
