# Claude Code Configuration

## Project Overview

**claude-pets** is a Claude Code *mod* (a plugin of function hooks): a pixel pet in a pane that wanders, reacts to the session, and levels up across sessions. The mod API is early access and changes between Claude Code releases.

## Project Structure

```
claude-pets/
├── .claude-plugin/
│   ├── plugin.json        # Plugin manifest ("types" names the state contract)
│   └── marketplace.json   # Marketplace metadata (version must match plugin.json)
├── hooks/
│   ├── hooks.json         # { "modules": ["./register.tsx"] }
│   ├── register.tsx       # Hooks: /pet command, tool/turn/rate-limit reactions, Pane render
│   ├── scene.ts           # Pure drawing: pixels, half-block cells, SVG card, sizes
│   └── species.ts         # Sprites: big 12×12 and mini 8×8 per species
├── types/index.d.ts       # State contract ($.state values under `pets`)
├── tests/pet.test.ts      # `claude plugin test .`
├── scripts/sprites.mjs    # Regenerates assets/*.svg from the sprite data
├── scripts/demo.mjs       # Regenerates assets/demo.gif with hooks/scene.ts (GIF encoder inline)
├── scripts/showcase.mjs   # Regenerates assets/run.gif, quest.gif, stages.svg, yards.svg from the hooks
├── scripts/gif.mjs        # GIF encoder shared by the two scripts above
└── assets/                # README images (generated, committed)
```

## Commands

```bash
claude plugin validate .claude-plugin/plugin.json   # manifest + hooks module
claude plugin test .                                # tests/*.test.ts
node scripts/sprites.mjs && node scripts/demo.mjs && node scripts/showcase.mjs   # after a sprite, drawing or game change (Node 22.18+)
claude --plugin-dir .                               # try it in a session
```

`tsc -p .` type-checks once Claude Code has loaded the plugin from this folder (it lays `.claude-plugin/types/`).

## Conventions

- The hooks module runs with no DOM and no Node: everything outside goes through `$`. Elements come from `$.ui.resolve(e)`, never globals.
- Keep drawing logic in `hooks/scene.ts` with no `$`, so tests and scripts draw what the pane draws.
- Terminal draws a `Raster` of half-block cells; desktop, VS Code and mobile draw an `Svg` card. A change to one surface needs a test on the other.
- `$.store` content may come from any earlier version: read it field by field (`toProfile`) and never assume a shape.
- Write to `$.store` once per turn at most (`grow`), not on every tool call.
- No runtime dependencies.
- Bump `version` in both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` together; the release workflow refuses a tag that disagrees with them.

## Engineering Handbook

Detailed patterns and architecture: [`docs/ENGINEERING_HANDBOOK.md`](../docs/ENGINEERING_HANDBOOK.md)

The handbook is maintainer-only: `docs` is a git-ignored symlink into `.private/` and is absent from a fresh clone. The `@handbook` markers in the source stay either way.

**Bidirectional links:**
- `@handbook X.Y-slug` in a source file's header → the handbook subsection
- `<!-- @code path -->` in the handbook → the source file
- Change one side, sync the other
- Find markers: `grep -rn "@handbook" hooks/ types/ scripts/ tests/`

| Looking for | Handbook section |
|-------------|------------------|
| Mod loading, state layers, hook table | 1 |
| `$.store` reads, `grow`, input cleaning | 2 |
| XP and levels, moods, `/pet` verbs | 3 |
| Sprites, pixel → cell → surface | 4 |
| Test harness, CI and version gates | 5 |

| Pattern | Reference |
|---------|-----------|
| Observing hook (`next(e)`) | `hooks/register.tsx` — `on('tool.call', …)` |
| Persisted change | `hooks/register.tsx` — `grow` |
| Reading old store shapes | `hooks/register.tsx` — `toProfile`, `toStats` |
| New species | `hooks/species.ts` — `SPECIES.chick` |
| Hook-level test | `tests/pet.test.ts` |
