import { test } from "node:test";
import assert from "node:assert/strict";
import { commitXp, computePet, stageForXp, type CommitEvent } from "../src/pet/engine.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = new Date(2026, 0, 5, 12, 0, 0).getTime(); // local noon, so day maths is timezone-proof
const seed = { seed: "test", name: "Mochi", bornAt: T0 };

/** One commit per day at local noon for `n` days, starting at T0. */
function daily(n: number, extra: Partial<CommitEvent> = {}): CommitEvent[] {
  return Array.from({ length: n }, (_, i) => ({ t: T0 + i * DAY, lines: 20, ...extra }));
}

test("an untouched pet is an egg waiting to hatch", () => {
  const pet = computePet(seed, [], T0);
  assert.equal(pet.stage, "egg");
  assert.equal(pet.mood, "egg");
  assert.equal(pet.fullness, 100);
  assert.equal(pet.nextStage, "baby");
});

test("the first commit hatches the egg", () => {
  const pet = computePet(seed, daily(1), T0 + HOUR);
  assert.equal(pet.stage, "baby");
  assert.equal(pet.mood, "happy");
  assert.equal(pet.commits, 1);
});

test("bigger commits are worth a bit more, capped", () => {
  assert.equal(commitXp(0, 0), 10);
  assert.ok(commitXp(100, 0) > commitXp(1, 0));
  assert.equal(commitXp(1_000_000, 0), commitXp(500, 0));
});

test("spamming commits in the same hour pays less", () => {
  assert.ok(commitXp(10, 3) < commitXp(10, 0) / 3);
  const spaced = computePet(seed, Array.from({ length: 10 }, (_, i) => ({ t: T0 + i * 2 * HOUR, lines: 10 })), T0 + DAY);
  const spammed = computePet(seed, Array.from({ length: 10 }, (_, i) => ({ t: T0 + i * 60_000, lines: 10 })), T0 + DAY);
  assert.ok(spammed.xp < spaced.xp / 2, `spammed ${spammed.xp} vs spaced ${spaced.xp}`);
});

test("hunger: happy, hungry after a day, sad after three, gone after seven", () => {
  const events = daily(1);
  assert.equal(computePet(seed, events, T0 + 12 * HOUR).mood, "happy");
  assert.equal(computePet(seed, events, T0 + 1.5 * DAY).mood, "hungry");
  assert.equal(computePet(seed, events, T0 + 4 * DAY).mood, "sad");
  const gone = computePet(seed, events, T0 + 8 * DAY);
  assert.equal(gone.mood, "away");
  assert.equal(gone.fullness, 0);
});

test("one commit brings a runaway back, and it's remembered", () => {
  const events = [...daily(1), { t: T0 + 10 * DAY, lines: 5 }];
  const pet = computePet(seed, events, T0 + 10 * DAY + HOUR);
  assert.equal(pet.mood, "happy");
  assert.equal(pet.timesRanAway, 1);
  assert.equal(pet.streak, 1);
});

test("streaks count consecutive days and survive until the next day ends", () => {
  const events = daily(5);
  const lastDay = T0 + 4 * DAY;
  assert.equal(computePet(seed, events, lastDay + HOUR).streak, 5);
  assert.equal(computePet(seed, events, lastDay + DAY).streak, 5); // yesterday still counts
  assert.equal(computePet(seed, events, lastDay + 2 * DAY).streak, 0);
  assert.equal(computePet(seed, events, lastDay + 2 * DAY).bestStreak, 5);
});

test("a week-long streak makes the pet hyped", () => {
  assert.equal(computePet(seed, daily(7), T0 + 6 * DAY + HOUR).mood, "hyped");
});

test("stages follow XP thresholds", () => {
  assert.equal(stageForXp(0), "egg");
  assert.equal(stageForXp(1), "baby");
  assert.equal(stageForXp(150), "teen");
  assert.equal(stageForXp(600), "adult");
  assert.equal(stageForXp(3000), "elder");
});

test("the adult form comes from your top language and then stays", () => {
  const lua = daily(60, { lang: "Luau" });
  const adult = computePet(seed, lua, T0 + 60 * DAY);
  assert.equal(adult.stage, "adult");
  assert.equal(adult.species, "blox");

  // Switching to Python later doesn't change an already grown-up pet.
  const python = Array.from({ length: 200 }, (_, i) => ({ t: T0 + 60 * DAY + i * DAY, lines: 20, lang: "Python" }));
  const later = computePet(seed, [...lua, ...python], T0 + 260 * DAY);
  assert.equal(later.topLanguage, "Python");
  assert.equal(later.species, "blox");
});

test("events in the future are ignored", () => {
  const pet = computePet(seed, daily(3), T0 + HOUR);
  assert.equal(pet.commits, 1);
});
