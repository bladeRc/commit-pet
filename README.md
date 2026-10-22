<div align="center">

<img src="docs/card-hyped.svg" alt="Mochi the Blox, a commit-pet on a 70-day streak" width="495">

# commit-pet

**A tiny pet that eats your commits.** It lives in your terminal *and* on your GitHub profile.<br>
Feed it or it gets hungry, then sad, then it runs away.

</div>

```bash
npm install -g commit-pet
cd your-repo
commit-pet init
```

Make a commit and your egg hatches. Keep committing and it grows up into a creature based on the language you write most.

## How it works

| You... | Your pet... |
| --- | --- |
| make your first commit | 🐣 hatches |
| keep committing | grows: egg → baby → teen → **adult** → 👑 elder |
| write mostly Luau, TypeScript, Python, Rust… | grows up into a species that matches (see below) |
| commit 7 days in a row | gets **hyped** |
| skip a day | gets hungry |
| skip 3 days | gets sad |
| skip 7 days | **runs away** 🏃 |
| commit again | comes back (but your streak starts over) |

Every commit is worth XP. Bigger commits are worth a little more, and spamming tiny commits in the same hour is worth much less, so the only way to grow your pet is to actually code.

After every commit, your pet reacts right in the terminal:

```
$ git commit -m "add combo system"
🐣 Your egg hatched! Say hi to Mochi.  +11 xp
$ git commit -m "fix hitbox"
✨ Mochi grew up into a Blox!  +12 xp
```

## Meet the species

Your pet's adult form is decided by your top language at the moment it grows up, and then it's yours for good.

<img src="docs/species.svg" alt="All 12 species: Blox, Typo, Jello, Snek, Crabby, Zoomer, Beanie, Pointy, Gem, Stylo, Shelly and Blob" width="680">

## Put your pet on your GitHub profile

Your profile pet is fed by your public GitHub contributions from the last 12 months, so it works even if you never install anything locally.

1. Open your profile repo (the one named exactly like your username).
2. Add `.github/workflows/commit-pet.yml`:

   ```yaml
   name: commit-pet
   on:
     schedule:
       - cron: "0 */6 * * *"   # feeds the pet every 6 hours
     workflow_dispatch:
   permissions:
     contents: write
   jobs:
     pet:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: bladeRc/commit-pet@main
   ```

3. Add the card to your `README.md`:

   ```md
   ![my commit-pet](pet.svg)
   ```

Run the workflow once from the **Actions** tab and say hi. The card follows the viewer's light/dark mode. Pass `theme: light` or `theme: dark` to pin it.

<details>
<summary>All action inputs</summary>

| Input | Default | What it does |
| --- | --- | --- |
| `username` | the repo owner | Whose contributions feed the pet |
| `out` | `pet.svg` | Where the card is written |
| `theme` | `auto` | `auto`, `light` or `dark` |
| `token` | `github.token` | Token used to read public contributions |
| `commit` | `true` | Commit and push the card when it changes |

</details>

You can also make a card by hand: `commit-pet card` draws your local pet, and `commit-pet card --github <user>` draws a profile pet (needs `GITHUB_TOKEN` set).

## Keep it in your prompt

`commit-pet line` prints one short line, like `🧊 Mochi ^_^ 92% 🔥5`.

**Claude Code status line**: add to `~/.claude/settings.json`:

```json
{ "statusLine": { "type": "command", "command": "commit-pet line" } }
```

**bash / zsh**:

```bash
PS1='$(commit-pet line) \w $ '
```

**PowerShell**: add to your `$PROFILE`:

```powershell
function prompt { "$(commit-pet line)  PS $($PWD)> " }
```

## Commands

| Command | What it does |
| --- | --- |
| `commit-pet` | Show your pet (with a little idle animation) |
| `commit-pet init` | Hatch a pet and feed it from this repo |
| `commit-pet init --global` | Feed it from every repo on your machine |
| `commit-pet line` | One-line pet for prompts and status lines |
| `commit-pet card` | Write an animated SVG card (`--out`, `--theme`, `--github`) |
| `commit-pet rename <name>` | Rename your pet |
| `commit-pet uninstall [--global]` | Remove the hook (your pet is kept) |

## FAQ

**Does it send my code anywhere?** No. The local pet only reads commit times, line counts and file extensions from `git log`, and keeps them in `~/.commit-pet/state.json`. The only network call is `commit-pet card --github`, which reads public contribution counts from the GitHub API.

**Will `--global` break my other git hooks?** No. A global hooks folder normally replaces every repo's own hooks, so commit-pet installs small forwarders that still run each repo's `.git/hooks` scripts. If you already have a global `core.hooksPath`, it refuses and asks you to use per-repo `init` instead. Repos that use husky (or any local `core.hooksPath`) get the hook added to their own hooks folder by `commit-pet init`.

**Can my pet die?** Never. It only runs away, and one commit brings it back.

**Does it work with Roblox / Rojo projects?** Yes. `.lua` and `.luau` files count as Luau, and Luau devs grow a Blox.

## Development

```bash
npm install
npm test          # builds and runs the unit tests (Node 22+)
npm run samples   # regenerates the example cards in docs/
```

Try time travel with `COMMIT_PET_NOW=2026-12-25 commit-pet` to see how your pet will feel later.

## License

MIT
