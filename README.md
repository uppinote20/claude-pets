# claude-pets

A pixel pet that lives in a Claude Code pane. It wanders while you work, reacts to what your session does, and grows across sessions.

> **Early access.** This is a Claude Code *mod* (a plugin of function hooks). That API is early access and can change between Claude Code releases, so a new release may break the pet until this plugin catches up.

## What it does

- **Wanders**: paces a small yard, bouncing as it steps, and blinks now and then.
- **Reacts**:
  - takes notes while tools run
  - jumps when a turn finishes
  - naps after about two minutes of quiet
  - tears up when a rate-limit window passes 80%
- **Grows**: tool calls, finished turns, output tokens and pats add experience. The level shows beside its name and is kept across sessions.
- **Is yours**: give it a name and pick its species.

## Install

```
/plugin marketplace add uppinote20/claude-pets
/plugin install pets@claude-pets
```

To try it from a clone instead:

```bash
claude --plugin-dir /path/to/claude-pets
```

## Commands

| Command | What it does |
|---------|--------------|
| `/pet` | Let the pet out |
| `/pet pat` | Pat it |
| `/pet name <name>` | Name it (up to 20 characters) |
| `/pet choose <species>` | Bring out another pet: `cat`, `chick` |
| `/pet status` | Level, experience and counts |
| `/pet bye` | Close the pane |

`ctrl+x x` also closes the pane.

## Growth

Every species is its own pet, with its own name and its own level. Switching with `/pet choose` leaves the others where they were.

| Event | Experience |
|-------|------------|
| Tool call | 1 |
| Pat | 2 |
| Finished turn | 5 |
| 1,000 output tokens | 1 |

Only output tokens count. Input and cache reads grow with how long the conversation is, not with how much work was done.

A pet reaches level `n + 1` at `25 × n²` experience: level 2 at 25, level 5 at 400, level 10 at 2,025, level 50 at 60,025. Early levels come within an evening; later ones take longer and there is no cap.

## Adding a species

A species is a 12×12 sprite in [`hooks/species.ts`](hooks/species.ts), one character per pixel:

```ts
rows: [
  '..o......o..',
  '.opo....opo.',
  '.oooooooooo.',
  // ...12 rows of 12 characters
],
ink: { o: 0xffd787, w: 0xfff3dc, p: 0xffafd7, k: 0x5f5f5f },
```

`.` is empty; every other character needs a color in `ink`. Draw it facing left. Then supply the rows that replace the eyes (`eyesShut`), the cheek row (`tear`) and the feet (`feetApart`).

## Development

```bash
claude plugin validate .claude-plugin/plugin.json   # manifest and hooks module
claude plugin test .                                # tests/*.test.ts
```

Once Claude Code has loaded the plugin from this folder it lays its type declarations in `.claude-plugin/types/`, and `tsc -p .` type-checks the plugin.

On the terminal the pet is one `Raster` element of half-block cells. Surfaces without `Raster` (desktop, VS Code, mobile) draw the same pixels as runs of colored text.

## License

MIT
