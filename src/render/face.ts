// Shared by the terminal and SVG renderers: the sprite with its face filled in,
// plus the words and colours that go with each mood.

import type { Mood, Pet } from "../pet/engine.js";
import { SPECIES, colorForLanguage, spriteFor } from "../pet/species.js";

const FACES: Record<Mood, { eye: string; mouth: string }> = {
  egg: { eye: "o", mouth: "w" },
  hyped: { eye: "*", mouth: "D" },
  happy: { eye: "o", mouth: "w" },
  hungry: { eye: "o", mouth: "O" },
  sad: { eye: "T", mouth: "_" },
  away: { eye: "o", mouth: "w" },
};

const AWAY = [
  "             ",
  "      ?      ",
  "             ",
  "  ..  ..  .. ",
  "             ",
];

export function petArt(pet: Pet, blink = false): string[] {
  if (pet.mood === "away") return AWAY;
  const face = FACES[pet.mood];
  const eye = blink ? "-" : face.eye;
  return spriteFor(pet.stage, pet.species).map((line) => line.replace(/E/g, eye).replace(/M/g, face.mouth));
}

export function title(pet: Pet): string {
  if (pet.stage === "adult") return `${pet.name} the ${SPECIES[pet.species].name}`;
  if (pet.stage === "elder") return `${pet.name} the Elder ${SPECIES[pet.species].name}`;
  return `${pet.name} the ${pet.stage[0]!.toUpperCase()}${pet.stage.slice(1)}`;
}

export const MOOD_LABEL: Record<Mood, string> = {
  egg: "waiting to hatch",
  hyped: "hyped!",
  happy: "happy",
  hungry: "hungry",
  sad: "sad",
  away: "ran away",
};

export const MOOD_FACE: Record<Mood, string> = {
  egg: "( . )",
  hyped: "^o^",
  happy: "^_^",
  hungry: "o_o",
  sad: "T_T",
  away: "...",
};

export function speech(pet: Pet): string {
  switch (pet.mood) {
    case "egg":
      return "Make a commit to hatch me!";
    case "hyped":
      return `${pet.streak}-day streak. Unstoppable.`;
    case "happy":
      return "Nom nom. Good commit.";
    case "hungry":
      return "Feed me a commit?";
    case "sad":
      return "It's been a while...";
    case "away":
      return `Ran away! One commit brings ${pet.name} back.`;
  }
}

export function petColor(pet: Pet): string {
  return colorForLanguage(pet.topLanguage);
}

/** Progress through the current stage, 0–1. */
export function stageProgress(pet: Pet): number {
  if (pet.nextStageXp === null) return 1;
  return (pet.xp - pet.stageXp) / (pet.nextStageXp - pet.stageXp);
}
