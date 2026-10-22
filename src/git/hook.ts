// Installing the post-commit hook that feeds the pet.

import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { git } from "./log.js";
import { homeDir } from "../pet/state.js";

const START = "# >>> commit-pet >>>";
const END = "# <<< commit-pet <<<";

// A global core.hooksPath replaces every repo's .git/hooks, so in global mode
// each of these forwards to the repo's own hook to keep it working.
const FORWARDED_HOOKS = [
  "applypatch-msg",
  "pre-applypatch",
  "post-applypatch",
  "pre-commit",
  "pre-merge-commit",
  "prepare-commit-msg",
  "commit-msg",
  "post-commit",
  "pre-rebase",
  "post-checkout",
  "post-merge",
  "pre-push",
  "post-rewrite",
  "pre-auto-gc",
  "push-to-checkout",
];

/** Paths in sh scripts use forward slashes, which Git for Windows' sh understands. */
function shPath(p: string): string {
  return p.replace(/\\/g, "/");
}

function cliPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "cli.js");
}

/** True when we're running from npx's throwaway cache, which can vanish later. */
export function runningFromNpx(): boolean {
  return /[\\/]_npx[\\/]/.test(cliPath());
}

export function hookBlock(): string {
  // Prefer this exact install; fall back to whatever `commit-pet` is on PATH.
  const call = runningFromNpx()
    ? `if command -v commit-pet >/dev/null 2>&1; then commit-pet _hook; fi`
    : [
        `cp_cli="${shPath(cliPath())}"`,
        `if [ -f "$cp_cli" ]; then "${shPath(process.execPath)}" "$cp_cli" _hook`,
        `elif command -v commit-pet >/dev/null 2>&1; then commit-pet _hook; fi`,
      ].join("\n");
  return `${START}\n${call}\n${END}\n`;
}

/** Adds or replaces our block in a hook script's text. */
export function withBlock(existing: string | null, block: string): string {
  if (existing === null || existing.trim() === "") return `#!/bin/sh\n${block}`;
  const stripped = withoutBlock(existing);
  return stripped.endsWith("\n") ? stripped + block : `${stripped}\n${block}`;
}

/** Removes our block from a hook script's text. */
export function withoutBlock(existing: string): string {
  const start = existing.indexOf(START);
  const end = existing.indexOf(END);
  if (start < 0 || end < start) return existing;
  return existing.slice(0, start) + existing.slice(end + END.length).replace(/^\r?\n/, "");
}

function writeHook(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  chmodSync(file, 0o755);
}

function read(file: string): string | null {
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

/** The hooks folder git actually uses for this repo (respects core.hooksPath, e.g. husky). */
export function repoHooksDir(cwd = process.cwd()): string {
  return resolve(cwd, git(["rev-parse", "--git-path", "hooks"], cwd).trim());
}

export function installRepoHook(cwd = process.cwd()): string {
  const file = join(repoHooksDir(cwd), "post-commit");
  writeHook(file, withBlock(read(file), hookBlock()));
  return file;
}

export function uninstallRepoHook(cwd = process.cwd()): boolean {
  const file = join(repoHooksDir(cwd), "post-commit");
  const text = read(file);
  if (text === null || !text.includes(START)) return false;
  const rest = withoutBlock(text);
  if (rest.trim() === "#!/bin/sh" || rest.trim() === "") unlinkSync(file);
  else writeHook(file, rest);
  return true;
}

export function globalHooksDir(): string {
  return join(homeDir(), "hooks");
}

function globalHooksPath(): string | null {
  try {
    return git(["config", "--global", "--get", "core.hooksPath"]).trim() || null;
  } catch {
    return null; // git exits 1 when the key isn't set
  }
}

function forwarder(name: string): string {
  return [
    "#!/bin/sh",
    `# commit-pet: run this repo's own ${name} hook (a global hooksPath would skip it otherwise)`,
    `local_hook="$(git rev-parse --git-common-dir)/hooks/${name}"`,
    `if [ -x "$local_hook" ]; then`,
    name === "post-commit" ? `  "$local_hook" "$@"` : `  exec "$local_hook" "$@"`,
    "fi",
    "",
  ].join("\n");
}

export function installGlobalHook(): string {
  const dir = globalHooksDir();
  const current = globalHooksPath();
  if (current && resolve(current) !== resolve(dir)) {
    throw new Error(
      `Your global core.hooksPath is already set to ${current}.\n` +
        `commit-pet won't override it. Run \`commit-pet init\` inside each repo instead.`,
    );
  }
  for (const name of FORWARDED_HOOKS) {
    const text = forwarder(name);
    writeHook(join(dir, name), name === "post-commit" ? text + hookBlock() : text);
  }
  git(["config", "--global", "core.hooksPath", shPath(dir)]);
  return dir;
}

export function uninstallGlobalHook(): boolean {
  const current = globalHooksPath();
  if (!current || resolve(current) !== resolve(globalHooksDir())) return false;
  git(["config", "--global", "--unset", "core.hooksPath"]);
  return true;
}
