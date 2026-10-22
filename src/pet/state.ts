// The local save file: ~/.commit-pet/state.json (or $COMMIT_PET_HOME/state.json).

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { CommitEvent } from "./engine.js";

export interface SaveFile {
  version: 1;
  seed: string;
  name?: string;
  bornAt: number;
  /** Compact events: [time ms, lines, language]. */
  events: [number, number, string | null][];
  /** Recent commit hashes, so amends and re-runs aren't counted twice. */
  seen: string[];
}

const SEEN_LIMIT = 500;

export function homeDir(): string {
  return process.env.COMMIT_PET_HOME || join(homedir(), ".commit-pet");
}

export function statePath(): string {
  return join(homeDir(), "state.json");
}

/** Current time, overridable with COMMIT_PET_NOW (ISO date or ms) for testing and demos. */
export function now(): number {
  const raw = process.env.COMMIT_PET_NOW;
  if (!raw) return Date.now();
  const n = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
  if (Number.isNaN(n)) throw new Error(`COMMIT_PET_NOW is not a valid date: ${raw}`);
  return n;
}

export function loadSave(): SaveFile | null {
  let text: string;
  try {
    text = readFileSync(statePath(), "utf8");
  } catch {
    return null;
  }
  const data = JSON.parse(text) as SaveFile;
  if (data.version !== 1) throw new Error(`Unsupported save file version in ${statePath()}`);
  return data;
}

export function writeSave(save: SaveFile): void {
  mkdirSync(homeDir(), { recursive: true });
  const tmp = statePath() + ".tmp";
  writeFileSync(tmp, JSON.stringify(save));
  renameSync(tmp, statePath());
}

export function newSave(name: string | undefined, at: number): SaveFile {
  return { version: 1, seed: randomUUID(), name, bornAt: at, events: [], seen: [] };
}

export function eventsOf(save: SaveFile): CommitEvent[] {
  return save.events.map(([t, lines, lang]) => ({ t, lines, lang }));
}

/** Records a commit. Returns false if this commit was already counted. */
export function recordCommit(save: SaveFile, hash: string, event: Required<CommitEvent>): boolean {
  if (save.seen.includes(hash)) return false;
  save.seen.push(hash);
  if (save.seen.length > SEEN_LIMIT) save.seen.splice(0, save.seen.length - SEEN_LIMIT);
  save.events.push([event.t, event.lines, event.lang]);
  return true;
}
