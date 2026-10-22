import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_SPRITES, CANVAS, awayScene, composeSprite, paletteFor } from "../src/pet/pixels.js";
import { SPECIES, type SpeciesId } from "../src/pet/species.js";

const FACE_OK = new Set(["b", "h", "s", "p"]);

test("every pixel sprite fits the canvas and only uses known pixels", () => {
  for (const [id, sprite] of Object.entries(ALL_SPRITES)) {
    assert.ok(sprite.rows.length <= 17, `${id} is ${sprite.rows.length} rows tall (max 17, to fit a crown)`);
    for (const row of sprite.rows) {
      assert.ok(row.length <= CANVAS, `${id}: row "${row}" is wider than ${CANVAS}`);
      assert.match(row, /^[.ohbsawpgy]+$/, `${id}: row "${row}" has unknown pixels`);
    }
  }
});

test("rows within a sprite line up", () => {
  for (const [id, sprite] of Object.entries(ALL_SPRITES)) {
    const widths = new Set(sprite.rows.map((r) => r.length));
    assert.equal(widths.size, 1, `${id} has rows of different widths: ${[...widths].join(", ")}`);
  }
});

test("eyes and mouths sit on the body, not on outlines or empty space", () => {
  for (const [id, sprite] of Object.entries(ALL_SPRITES)) {
    if (id === "egg") continue;
    const at = (x: number, y: number) => sprite.rows[y]?.[x] ?? ".";
    for (const [ex, ey] of sprite.eyes)
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 2; dx++)
          assert.ok(FACE_OK.has(at(ex + dx, ey + dy)), `${id}: eye pixel (${ex + dx},${ey + dy}) is "${at(ex + dx, ey + dy)}"`);
    const [mx, my] = sprite.mouth;
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 4; dx++)
        assert.ok(FACE_OK.has(at(mx + dx, my + dy)), `${id}: mouth pixel (${mx + dx},${my + dy}) is "${at(mx + dx, my + dy)}"`);
  }
});

test("composed pets are 20×20, bottom-aligned, and elders wear a crown", () => {
  for (const species of Object.keys(SPECIES) as SpeciesId[]) {
    for (const stage of ["egg", "baby", "teen", "adult", "elder"] as const) {
      const grid = composeSprite({ stage, species, mood: "happy", color: "#3178c6" });
      assert.equal(grid.length, CANVAS);
      assert.ok(grid.every((row) => row.length === CANVAS));
      assert.ok(grid[CANVAS - 1]!.some((c) => c !== null), `${species}/${stage} doesn't touch the ground`);
    }
    const elder = composeSprite({ stage: "elder", species, mood: "happy", color: "#3178c6" });
    assert.ok(elder.flat().includes("#ffd33d"), `${species} elder has no crown`);
  }
});

test("blinking changes only the eyes", () => {
  const open = composeSprite({ stage: "adult", species: "blox", mood: "happy", color: "#00a2ff" });
  const shut = composeSprite({ stage: "adult", species: "blox", mood: "happy", color: "#00a2ff", blink: true });
  let changed = 0;
  open.forEach((row, y) => row.forEach((c, x) => (c !== shut[y]![x] ? changed++ : 0)));
  assert.ok(changed > 0 && changed <= 8, `blink changed ${changed} pixels`);
});

test("dark language colours get a lighter body so the face stays visible", () => {
  assert.notEqual(paletteFor("#012456").b, "#012456");
  assert.equal(paletteFor("#3178c6").b, "#3178c6");
});

test("the away scene draws something", () => {
  assert.ok(awayScene().flat().some((c) => c !== null));
});
