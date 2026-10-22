import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCommit } from "../src/git/log.js";
import { withBlock, withoutBlock } from "../src/git/hook.js";
import { calendarToEvents, topLanguageOf } from "../src/github.js";
import { computePet } from "../src/pet/engine.js";
import { nameFromSeed, speciesForLanguage, SPECIES, spriteFor } from "../src/pet/species.js";
import { escapeXml, renderCard } from "../src/render/svg.js";
import { readableOn } from "../src/render/color.js";
import { halfBlocks } from "../src/render/terminal.js";
import { composeSprite } from "../src/pet/pixels.js";

test("parseCommit sums lines and picks the main language", () => {
  const out = "abc123\x1f1767610000\n\n10\t2\tsrc/combat.luau\n3\t1\tREADME.md\n-\t-\tlogo.png\n1\t0\tsrc/x.ts\n";
  const c = parseCommit(out);
  assert.equal(c.hash, "abc123");
  assert.equal(c.t, 1767610000 * 1000);
  assert.equal(c.lines, 12 + 4 + 1 + 1);
  assert.equal(c.lang, "Luau");
});

test("hook blocks can be added, replaced and removed without touching other hook code", () => {
  const block = "# >>> commit-pet >>>\necho pet\n# <<< commit-pet <<<\n";
  assert.equal(withBlock(null, block), `#!/bin/sh\n${block}`);

  const existing = "#!/bin/sh\necho mine\n";
  const once = withBlock(existing, block);
  assert.equal(withBlock(once, block), once, "installing twice is a no-op");
  assert.equal(withoutBlock(once), existing);
});

test("calendar days become evenly spread events", () => {
  const events = calendarToEvents(
    [
      { date: "2026-03-01", contributionCount: 0 },
      { date: "2026-03-02", contributionCount: 4 },
    ],
    "Rust",
  );
  assert.equal(events.length, 4);
  assert.equal(events[0]!.t, Date.parse("2026-03-02T09:00:00Z"));
  assert.equal(events[1]!.t - events[0]!.t, 3 * 3_600_000);
  assert.ok(events.every((e) => e.lang === "Rust"));
});

test("top language ignores forks and weighs by contributions", () => {
  const repo = (lang: string | null, n: number, isFork = false) => ({
    contributions: { totalCount: n },
    repository: { isFork, primaryLanguage: lang ? { name: lang } : null },
  });
  assert.equal(topLanguageOf([repo("Go", 5), repo("Luau", 3), repo("Luau", 4), repo("Python", 50, true), repo(null, 9)]), "Luau");
});

test("names are deterministic per seed", () => {
  assert.equal(nameFromSeed("octocat"), nameFromSeed("octocat"));
  assert.match(nameFromSeed("octocat"), /^[A-Z][a-z]+$/);
});

test("every sprite fits the art column and has a face", () => {
  for (const s of Object.values(SPECIES)) {
    for (const line of s.sprite) assert.ok(line.length <= 13, `${s.id}: "${line}" is too wide`);
    assert.ok(s.sprite.join("").includes("E"), `${s.id} has no eyes`);
    assert.ok(s.sprite.join("").includes("M"), `${s.id} has no mouth`);
    assert.ok(spriteFor("elder", s.id).length <= 7, `${s.id} elder is too tall`);
  }
  assert.equal(speciesForLanguage("TypeScript"), "typo");
  assert.equal(speciesForLanguage("Brainfuck"), "blob");
});

test("the SVG card escapes text and is well-formed enough to render", () => {
  assert.equal(escapeXml(`<a & "b">`), "&lt;a &amp; &quot;b&quot;&gt;");
  const pet = computePet({ seed: "x", name: "<Bad & Name>", bornAt: 0 }, [{ t: 1000, lines: 5, lang: "Luau" }], 2000);
  const svg = renderCard(pet, { login: "someone" });
  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.includes("&lt;Bad &amp; Name&gt;"));
  assert.ok(!svg.includes("<Bad"));
  assert.ok(svg.includes("prefers-color-scheme: dark"));
  assert.ok(!renderCard(pet, { theme: "dark" }).includes("prefers-color-scheme"));
});

test("the SVG card draws the pet in crisp pixels and stays small", () => {
  for (const [mood, events, at] of [
    ["happy", [{ t: 1000, lines: 5, lang: "Luau" }], 2000],
    ["away", [{ t: 1000, lines: 5, lang: "Luau" }], 1000 + 8 * 86_400_000],
  ] as const) {
    const pet = computePet({ seed: "x", bornAt: 0 }, events, at);
    assert.equal(pet.mood, mood);
    const svg = renderCard(pet);
    assert.ok(svg.includes('shape-rendering="crispEdges"'));
    assert.ok(svg.includes("<path fill="));
    assert.ok(!svg.includes('class="art'), "no ASCII art left in the card");
    assert.ok(svg.length < 20_000, `card is ${svg.length} bytes`);
  }
});

test("the terminal shows pixels as half blocks, two pixel rows per line", () => {
  const rows = halfBlocks(composeSprite({ stage: "adult", species: "snek", mood: "happy", color: "#3572a5" }));
  assert.ok(rows.length <= 10);
  for (const row of rows) assert.equal(row.replace(/\x1b\[[0-9;]*m/g, "").length, 20);
  assert.ok(rows.join("").includes("▀"));
});

test("pale language colours get darkened on light backgrounds", () => {
  assert.notEqual(readableOn("#f1e05a", "light"), "#f1e05a");
  assert.equal(readableOn("#3178c6", "light"), "#3178c6");
});
