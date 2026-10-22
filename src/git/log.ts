// Reading commits with plain `git`.

import { execFileSync } from "node:child_process";
import { languageOfPath } from "../pet/species.js";

export interface CommitInfo {
  hash: string;
  t: number;
  lines: number;
  lang: string | null;
}

export function git(args: string[], cwd = process.cwd()): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

export function isGitRepo(cwd = process.cwd()): boolean {
  try {
    return git(["rev-parse", "--is-inside-work-tree"], cwd).trim() === "true";
  } catch {
    return false;
  }
}

/** The commit HEAD points at, with its size and main language. */
export function headCommit(cwd = process.cwd()): CommitInfo {
  return parseCommit(git(["log", "-1", "--format=%H%x1f%ct", "--numstat", "--no-renames"], cwd));
}

/** Parses `git log -1 --format=%H%x1f%ct --numstat` output. */
export function parseCommit(out: string): CommitInfo {
  const lines = out.split(/\r?\n/);
  const [hash, at] = (lines[0] ?? "").split("\x1f");
  if (!hash || !at) throw new Error("Unexpected git log output");

  let total = 0;
  const byLang = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
    if (!m) continue;
    // Binary files show "-" and count as one line so they still register.
    const n = m[1] === "-" ? 1 : Number(m[1]) + Number(m[2]);
    total += n;
    const lang = languageOfPath(m[3]!);
    if (lang) byLang.set(lang, (byLang.get(lang) ?? 0) + n);
  }

  let lang: string | null = null;
  let best = 0;
  for (const [l, n] of byLang) {
    if (n > best) {
      lang = l;
      best = n;
    }
  }
  return { hash, t: Number(at) * 1000, lines: total, lang };
}
