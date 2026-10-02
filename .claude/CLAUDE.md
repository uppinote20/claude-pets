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
│   └── species.ts         # Sprites: 12×12 per species
├── types/index.d.ts       # State contract ($.state values under `pets`)
├── tests/pet.test.ts      # `claude plugin test .`
├── scripts/sprites.mjs    # Regenerates assets/*.svg from the sprite data
└── assets/                # README species images (generated, committed)
```

## Commands

```bash
claude plugin validate .claude-plugin/plugin.json   # manifest + hooks module
claude plugin test .                                # tests/*.test.ts
node scripts/sprites.mjs                            # after a sprite change (Node 22.18+)
claude --plugin-dir .                               # try it in a session
```

`tsc -p .` type-checks once Claude Code has loaded the plugin from this folder (it lays `.claude-plugin/types/`).

## Conventions

- The hooks module runs with no DOM and no Node: everything outside goes through `$`. Elements come from `$.ui.resolve(e)`, never globals.
- Terminal draws a `Raster` of half-block cells; desktop, VS Code and mobile draw the same pixels as text runs. A change to one surface needs a test on the other.
- `$.store` content may come from any earlier version: read it field by field (`toProfile`) and never assume a shape.
- Write to `$.store` once per turn at most (`grow`), not on every tool call.
- No runtime dependencies.
- Bump `version` in both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` together; the release workflow refuses a tag that disagrees with them.
