# claude-pets

A pixel pet that lives in a Claude Code pane. It wanders while you work, reacts to what your session does, and grows across sessions.

<p align="center"><img src="assets/demo.gif" width="480" alt="The cat, chick, dog and slime walking, working, cheering, being patted and napping"></p>

| <img src="assets/cat.svg" width="120" alt="cat"> | <img src="assets/chick.svg" width="120" alt="chick"> | <img src="assets/dog.svg" width="120" alt="dog"> | <img src="assets/slime.svg" width="120" alt="slime"> |
|:---:|:---:|:---:|:---:|
| `cat` | `chick` | `dog` | `slime` |
| <img src="assets/bunny.svg" width="120" alt="bunny"> | <img src="assets/hamster.svg" width="120" alt="hamster"> | <img src="assets/penguin.svg" width="120" alt="penguin"> | <img src="assets/frog.svg" width="120" alt="frog"> |
| `bunny` | `hamster` | `penguin` | `frog` |

> **Early access.** This is a Claude Code *mod* (a plugin of function hooks). That API is early access and can change between Claude Code releases, so a new release may break the pet until this plugin catches up.

## What it does

- **Wanders**: paces a small yard, bouncing as it steps, and blinks now and then.
- **Reacts**:
  - takes notes while tools run
  - jumps when a turn finishes
  - naps after about two minutes of quiet
  - tears up when a rate-limit window passes 80%
- **Grows**: tool calls, finished turns, output tokens and pats add experience. The level is kept across sessions. When the pane has room (above a wide prompt, or docked beside the transcript) a stats panel shows the level, the bar to the next one, and how many of each it has seen; otherwise the line above the pet shows the level.
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
| `/pet choose <species>` | Bring out another pet: `cat`, `chick`, `dog`, `slime`, `bunny`, `hamster`, `penguin`, `frog` |
| `/pet size <size>` | How tall the pane is: `small` (6 rows) or `medium` (9, the default) |
| `/pet play` | Play Pet Run: `j` jumps, `r` runs again, `Esc` stops |
| `/pet quest [stage]` | Play Pet Quest, an auto-running side-scroller: `j` jumps (again while rising to go higher), `r` retries, `n` goes on |
| `/pet status` | Level, experience and counts |
| `/pet bye` | Close the pane |

`ctrl+x x` also closes the pane.

## Growth

Every species is its own pet, with its own name and its own level. Switching with `/pet choose` leaves the others where they were.

| Event | Experience |
|-------|------------|
| Tool call | 1 |
| Pet Run snack | 1 |
| Pat | 2 |
| Finished turn | 5 |
| 1,000 output tokens | 1 |
| Gift, lucky pat | 5 to 100, by luck |

Only output tokens count. Input and cache reads grow with how long the conversation is, not with how much work was done.

A pet reaches level `n + 1` at `25 × n²` experience: level 2 at 25, level 5 at 400, level 10 at 2,025, level 50 at 60,025. Early levels come within an evening; later ones take longer and there is no cap.

### Stages

| Stage | From | Looks |
|-------|------|-------|
| Baby | Lv 1 | As drawn |
| Teen | Lv 15 | A taller body of its own, and its accessory: the cat and the bunny a ribbon, the chick a flower, the dog a scarf, the slime and the frog a crown, the hamster a leaf, the penguin a knit hat |
| Adult | Lv 40 | Evolves by its nature at that moment (worker, scholar, gamer, sweetie or curious), and twinkles |

One evolution in twenty (with `luck` on) takes the **rare form** instead: the celestial cat, the phoenix chick, the moon wolf, the king slime, the moon bunny, the golden hamster, the emperor penguin, the prince frog.

An adult with a drawing of its own for its nature wears it: so far the cat, in overalls, a scholar's robe and glasses, a hoodie, or extra fluff. The others are their teen in their nature's gear until theirs are drawn. The small size keeps the mini sprite at every stage.

The form is settled when it reaches Lv 40 and kept from then on. A toast says when it becomes a teen and what it evolves into.

## Pet Run

`/pet play` opens a runner in its own pane. The pet runs along the grass: jump the bugs (`j`, or the Jump button), and snap up the snacks floating over them. It gets faster as it goes. `r` runs again after a bug, `Esc` stops.

Every snack is 1 experience for the pet, and its best score is kept (`/pet status`). Off the terminal (desktop, mobile) the course is drawn as an SVG and the buttons take the taps.

## Pet Quest

`/pet quest` opens the next stage of an auto-running side-scroller. The pet runs on its own; `j` jumps, and a second `j` while it is rising takes it higher, even off the top of the view (a little arrow shows where it will come down). Stomp the bugs from above, knock the gift boxes from below for snacks, hop the stumps and the pits, and reach the snack bowl. A wall stops it until it jumps.

Eight stages, each opened by clearing the one before (`/pet quest 3` replays one already open). Snacks are experience as in Pet Run, and `/pet status` counts the stages cleared.

Stages are tile maps in [`hooks/quest.ts`](hooks/quest.ts), one character per 4×4 tile, so all eight take about 5 KB. A test searches every stage for a way through, so a stage that cannot be cleared fails the build.

## Nature and rhythm

As it grows the pet takes after you. Its **nature** comes from what it has seen most, once it has seen enough:

| Nature | From | How it shows |
|--------|------|--------------|
| worker | tool calls | holds up a laptop while tools run; as an adult, carries a pickaxe and swings it |
| scholar | turns and output | ambles and stops now and then to read; as an adult, wears a graduation cap |
| sweetie | pats | pauses for a heart; as an adult, wears a flower pin |
| gamer | Pet Run and Pet Quest snacks | runs faster and kicks a ball along; as an adult, wears a headset |
| curious | (until one side stands out) | sniffs around |

Its **rhythm** comes from the hours your finished turns keep: night owl, early bird, daytimer or evening type. Babies and teens show their nature in how they act; the gear comes with evolving, and a cap, a headset or a pin takes the place of a head accessory. Both show in the stats and in `/pet status`, and the pet muses about them now and then.

The yard follows your clock: the morning sun, the midday sun, the evening sun, the moon and stars at night (the card off the terminal turns night blue). The local time comes from `date` on your machine.

## Luck

- **Gifts**: one finished turn in ten turns up a gift: mostly a cookie (+5 xp), sometimes a toy (+15) or a treasure (+40), now and then the jackpot (+100), and one gift in a hundred is a sparkle stone.
- **Lucky pats**: one pat in ten is worth three times as much.
- **Shiny pets**: a species met for the first time is a shiny one time in 32, in colors of its own (`✦` beside its name in the stats). A sparkle stone makes the pet that is out shiny; a second one is a jackpot.

Turn it off with the plugin's `luck` setting (`/config`).

## Sizes

`/pet size` picks how much room the pet takes, and it is kept across sessions:

| Size | Sprite | Terminal rows |
|------|--------|---------------|
| `small` | 8×8 | 6 |
| `medium` | 12×12 | 9 |

The pane opens at that height. A height you drag the pane to yourself wins over it.

## Adding a species

A species is drawn twice in [`hooks/species.ts`](hooks/species.ts), one character per pixel: `big` at 12×12 and `mini` at 8×8 for the small size.

```ts
big: {
  rows: [
    '.o........o.',
    '.oo......oo.',
    '.opoooooopo.',
    'oooooooooooo',
    'oowkoooowkoo',   // eyes: 2×2, a white glint in the top corner
    'ookkooookkoo',
    'oppoommooppo',   // blush and a small mouth
    // ...12 rows of 12 characters
  ],
  eyesShut: { 4: 'oooooooooooo' },   // the eyes' top row turns to fur: a closed, happy line
  tear: { 6: 'obpoommooppo' },
  feetApart: { 11: '..oo....oo..' },
},
ink: { o: 0xffd787, w: 0xfffaf0, p: 0xffafd7, k: 0x5f4b4b, m: 0xd08770, b: 0x87d7ff },
```

`.` is empty; every other character needs a color in `ink`. Draw it facing left, with a big head and a small body. Then supply, by row index, the rows that replace the eyes (`eyesShut`), the cheek row (`tear`) and the feet (`feetApart`). A test checks every row's width and colors.

## Development

```bash
claude plugin validate .claude-plugin/plugin.json   # manifest and hooks module
claude plugin test .                                # tests/*.test.ts
```

The species images and the demo GIF in `assets/` are generated from the sprite data with the plugin's own drawing code. Regenerate them after adding or changing a species, or the drawing (Node 22.18+, no dependencies):

```bash
node scripts/sprites.mjs
node scripts/demo.mjs
```

Once Claude Code has loaded the plugin from this folder it lays its type declarations in `.claude-plugin/types/`, and `tsc -p .` type-checks the plugin.

On the terminal the pet is one `Raster` element of half-block cells. Surfaces without `Raster` (desktop, VS Code, mobile) draw the same pixels as an `Svg` card, with a name tag, a speech bubble and a grass mound. The drawing lives in [`hooks/scene.ts`](hooks/scene.ts), which has no `$`, so tests can draw exactly what the pane does.

## On mobile

The pet runs wherever Claude Code runs; the Claude mobile app is one more surface drawing the pane, so the plugin has to be loaded by the session the app is looking at:

- **Remote Control**: install the plugin on your computer, run `claude remote-control` in the folder you work in, and open that session in the Claude Code app on your phone. Type `/pet` there.
- **Claude Code on the web**: a cloud session loads the plugins its repository's `.claude/settings.json` enables (`extraKnownMarketplaces` and `enabledPlugins`), so add `pets@claude-pets` there and open that session in the app.

The app has no `Raster`, so it draws the SVG card.

## License

MIT
