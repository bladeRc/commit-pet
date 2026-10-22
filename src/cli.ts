#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { computePet, type Pet } from "./pet/engine.js";
import { SPECIES } from "./pet/species.js";
import { eventsOf, loadSave, newSave, now, recordCommit, writeSave, type SaveFile } from "./pet/state.js";
import { headCommit, isGitRepo } from "./git/log.js";
import { installGlobalHook, installRepoHook, runningFromNpx, uninstallGlobalHook, uninstallRepoHook } from "./git/hook.js";
import { animatePet, petLine, printPet } from "./render/terminal.js";
import { renderCard, type Theme } from "./render/svg.js";
import { fetchProfile } from "./github.js";

const HELP = `commit-pet: a tiny pet that eats your commits

Usage:
  commit-pet                     Show your pet
  commit-pet init [--global]     Hatch a pet and feed it from this repo (or every repo)
  commit-pet line                One-line pet for your prompt or status line
  commit-pet card [options]      Write an animated SVG card for your GitHub profile
      --out <file>               Where to write it (default: pet.svg)
      --theme auto|light|dark    Card colours (default: auto, follows the viewer)
      --github <user>            Build the pet from a GitHub user's public contributions
                                 (needs GITHUB_TOKEN or GH_TOKEN, or --token)
  commit-pet rename <name>       Give your pet a new name
  commit-pet uninstall [--global] Stop feeding from this repo (or every repo)
  commit-pet --version

The pet gets hungry after a day without commits, sad after three,
and runs away after seven. One commit brings it back.
`;

function version(): string {
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
  return pkg.version;
}

function petOf(save: SaveFile, at = now()): Pet {
  return computePet({ seed: save.seed, name: save.name, bornAt: save.bornAt }, eventsOf(save), at);
}

function requireSave(): SaveFile {
  const save = loadSave();
  if (!save) {
    console.log("No pet yet. Run `commit-pet init` inside a git repo to hatch one.");
    process.exit(1);
  }
  return save;
}

function init(opts: { global?: boolean; name?: string }): void {
  if (!opts.global && !isGitRepo()) {
    console.error("This isn't a git repo. Run `commit-pet init` inside one, or use `commit-pet init --global`.");
    process.exit(1);
  }
  const existing = loadSave();
  const save = existing ?? newSave(opts.name, now());
  if (existing && opts.name) save.name = opts.name;
  writeSave(save);

  const where = opts.global ? installGlobalHook() : installRepoHook();
  const pet = petOf(save);
  if (existing) {
    console.log(`\n${pet.name} will now eat commits from ${opts.global ? "every repo" : "this repo"} too.`);
  } else {
    printPet(pet);
    console.log(`An egg appeared! Its name is ${pet.name}. Make a commit to hatch it.`);
  }
  console.log(`Hook installed: ${where}`);
  if (runningFromNpx()) {
    console.log("\nTip: install it for real so the hook can find it later:\n  npm install -g commit-pet");
  }
  console.log("\nNext:\n  commit-pet          see your pet\n  commit-pet line     add it to your prompt\n  commit-pet card     make a card for your GitHub profile\n");
}

function uninstall(opts: { global?: boolean }): void {
  const removed = opts.global ? uninstallGlobalHook() : isGitRepo() && uninstallRepoHook();
  console.log(removed ? "Hook removed. Your pet is still saved." : "No commit-pet hook found here.");
}

/** Called by the post-commit hook. Must never break a commit, so it swallows errors. */
function hook(): void {
  try {
    const save = loadSave() ?? newSave(undefined, now());
    const commit = headCommit();
    const at = Math.max(now(), commit.t);
    const before = petOf(save, at);
    if (!recordCommit(save, commit.hash, { t: commit.t, lines: commit.lines, lang: commit.lang })) return;
    writeSave(save);
    const after = petOf(save, at);
    const gained = `+${after.xp - before.xp} xp`;

    let msg: string;
    if (before.stage === "egg") msg = `🐣 Your egg hatched! Say hi to ${after.name}.`;
    else if (before.mood === "away") msg = `🏃 ${after.name} came back! The streak starts over, but all is forgiven.`;
    else if (after.stage !== before.stage && after.stage === "adult")
      msg = `✨ ${after.name} grew up into a ${SPECIES[after.species].name}!`;
    else if (after.stage !== before.stage && after.stage === "elder")
      msg = `👑 ${after.name} became an Elder ${SPECIES[after.species].name}!`;
    else if (after.stage !== before.stage) msg = `✨ ${after.name} evolved into a ${after.stage}!`;
    else msg = petLine(after);
    console.log(`${msg}  ${gained}`);
  } catch (err) {
    if (process.env.COMMIT_PET_DEBUG) console.error(err);
  }
}

async function card(opts: { out?: string; theme?: string; github?: string; token?: string }): Promise<void> {
  const theme = (opts.theme ?? "auto") as Theme;
  if (!["auto", "light", "dark"].includes(theme)) throw new Error(`--theme must be auto, light or dark`);
  const out = resolve(opts.out ?? "pet.svg");

  let pet: Pet;
  if (opts.github) {
    const token = opts.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (!token) throw new Error("--github needs a token: set GITHUB_TOKEN or GH_TOKEN, or pass --token.");
    const profile = await fetchProfile(opts.github, token);
    pet = computePet({ seed: opts.github.toLowerCase(), bornAt: profile.bornAt }, profile.events, now());
  } else {
    pet = petOf(requireSave());
  }
  writeFileSync(out, renderCard(pet, { theme, login: opts.github }));
  console.log(`Wrote ${out}`);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      global: { type: "boolean" },
      name: { type: "string" },
      out: { type: "string" },
      theme: { type: "string" },
      github: { type: "string" },
      token: { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  const [command = "status", ...rest] = positionals;

  if (values.version) return console.log(version());
  if (values.help || command === "help") return void process.stdout.write(HELP);

  switch (command) {
    case "status":
      return animatePet(petOf(requireSave()));
    case "init":
      return init(values);
    case "uninstall":
      return uninstall(values);
    case "line": {
      const save = loadSave();
      return console.log(save ? petLine(petOf(save)) : "🥚 no pet yet");
    }
    case "card":
      return card(values);
    case "rename": {
      const name = rest.join(" ").trim();
      if (!name) throw new Error("Usage: commit-pet rename <name>");
      const save = requireSave();
      const old = petOf(save).name;
      save.name = name;
      writeSave(save);
      return console.log(`${old} is now called ${name}.`);
    }
    case "feed":
      return console.log(`🍽  ${petOf(requireSave()).name} only eats commits. Go make one!`);
    case "_hook":
      return hook();
    default:
      process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
