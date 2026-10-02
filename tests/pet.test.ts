/**
 * Drives the plugin through its hooks: mocked clock and store, mounted Pane.
 * @handbook 5.1-plugin-test-harness
 * @handbook 5.2-ci-release-gates
 * @covers hooks/quest.ts
 * @covers hooks/register.tsx
 * @covers hooks/run.ts
 * @covers hooks/scene.ts
 * @covers hooks/species.ts
 */
import { expect, mock, test } from 'claude-code/testing'

import { giftOf, worthOf } from '../hooks/luck'
import { QUEST_ROWS, STAGES, advanceQuest, jumpQuest, newQuest } from '../hooks/quest'
import type { Quest } from '../hooks/quest'
import { advance, jump, newRun, scoreOf } from '../hooks/run'
import { stageOf } from '../hooks/scene'
import { SPECIES } from '../hooks/species'

const PROPS = {
  title: 'Pet',
  isFocused: true,
  bodyColumns: 40,
  placement: 'inline',
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
} as const
const PANE = { plugin: 'pets', component: 'Pane', requestId: 'pets', props: PROPS } as const

test('the pet paces, takes a pat, a name and a species, and leaves when told', { options: { luck: false } }, async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  // The 0.1.0 shape, one pet's fields beside `species`: 22 xp of the 25 that level 2 takes.
  // `turns` is not a number and reads as 0.
  mock.store(on, { profile: { species: 'cat', name: '초코', pats: 1, tools: 20, turns: 'many' } })
  const toasts: string[] = []
  on('ui.toast', async (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('turn.complete', async () => ({ text: '' }))
  const closed: string[] = []
  const opened: (number | undefined)[] = []
  on('ui.open', async (_, e) => {
    opened.push(e.rows)

    return { value: { isPlaced: true as const } }
  })
  on('ui.close', async (_, e) => {
    closed.push(e.id)

    return { value: undefined }
  })
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const cells = async () => (await pane.find({ type: 'Raster', key: 'pet' }))?.props.cells
  const run = async (args: string) =>
    (
      await $.command.run({
        command: 'pet',
        args,
        origin: { kind: 'composer' },
        presentation: { isFullscreen: false, columns: 80 },
      })
    ).text

  const atBirth = await cells()
  expect(typeof atBirth).toBe('string')
  await clock.advance(600 * 10)
  expect(await cells()).not.toBe(atBirth)
  expect(await pane.find({ type: 'Text', text: ' 초코 ' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /^ Lv 1 / })).toBeDefined()

  expect(await run('pat')).toBe('초코 is pleased.')
  expect(await pane.find({ type: 'Text', text: '  purr ×2' })).toBeDefined()
  await clock.advance(600 * 8)
  expect(await pane.find({ type: 'Text', text: /purr/ })).toBeUndefined()

  // The second pat is the 26th point of experience.
  expect(await run('pat')).toBe('초코 is pleased.')
  expect(await pane.find({ type: 'Text', text: /^ Lv 2 / })).toBeDefined()
  expect(await run('status')).toBe('초코 the cat · Lv 2 · 26 xp (next at 100) · 3 pats, 0 turns, 20 tool calls, 0 output tokens')

  expect(await run('name  나비\u0007 ')).toBe('초코 is now 나비.')
  expect(await pane.find({ type: 'Text', text: ' 나비 ' })).toBeDefined()

  const asCat = await cells()
  expect(await run('choose dragon')).toBe('Choose one of: cat, chick, dog, slime, bunny, hamster, penguin, frog')
  expect(await run('choose chick')).toBe('The chick is out.')
  expect(await cells()).not.toBe(asCat)
  expect(await pane.find({ type: 'Text', text: /^ Lv 1 / })).toBeDefined()

  // A turn is 5 xp and its 21,500 output tokens 21: the chick's own 26, and the cat keeps its level.
  const turn = { answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const
  const usage = { input_tokens: 9, cache_read_input_tokens: 900_000, cache_creation_input_tokens: 9, model: 'm' }
  await $.turn.complete({ ...turn, usage: { ...usage, output_tokens: 21_500 } })
  expect(toasts).toEqual(['초코 reached Lv 2!', 'The chick reached Lv 2!'])
  // A subagent's turn adds its tokens but is no turn of the conversation's.
  await $.turn.complete({ ...turn, agentId: 'a1', usage: { ...usage, output_tokens: 500 } })
  expect(await run('status')).toBe(
    'The chick · Lv 2 · 27 xp (next at 100) · 0 pats, 1 turns, 0 tool calls, 22.0K output tokens · Also: 나비 the cat Lv 2',
  )
  expect(await run('choose cat')).toBe('나비 is out.')

  // Sizes: the pane asks for the yard's rows and the line above it, and the yard follows.
  const rowsOf = async () => (await pane.find({ type: 'Raster', key: 'pet' }))?.props.rows
  expect(await rowsOf()).toBe(8)
  expect(await run('size')).toBe('나비 is medium. Choose one of: small, medium')
  expect(await run('size small')).toBe('나비 is small now.')
  expect(await rowsOf()).toBe(5)
  expect(await run('size large')).toMatch(/^나비 is small\. Choose/)
  expect(await run('size medium')).toBe('나비 is medium now.')
  expect(await rowsOf()).toBe(8)
  expect(opened.slice(-2)).toEqual([6, 9])

  expect(await run('dance')).toMatch(/^Usage/)
  expect(await run('bye')).toBe('나비 went back inside.')
  expect(closed).toEqual(['pets'])
  await pane.unmount()
})

test('surfaces without Raster draw the pet as an SVG card', async $ => {
  for (const surface of ['desktop', 'vscode', 'mobile'] as const) {
    const pane = await $.ui.mount({ ...PANE, surface })
    const card = await pane.find({ type: 'Svg' })

    expect(await pane.find({ type: 'Raster' })).toBeUndefined()
    expect(card?.props.alt).toBe('The cat, Lv 1')
    expect(card?.props.source).toMatch(/^<svg [^>]*width="\d+"/)
    expect(card?.props.source).toContain('#ffd787')
    await pane.unmount()
  }
})

test('a wide pane shows the stats beside the yard, the dock under it, a narrow one only the level', async $ => {
  for (const [bodyColumns, placement, isPanel] of [
    [100, 'inline', true],
    [40, 'dock', true],
    [40, 'inline', false],
  ] as const) {
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PROPS, bodyColumns, placement } })

    expect(await pane.find({ type: 'Raster', key: 'pet' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: 'tool calls    ' })).toEqual(isPanel ? expect.anything() : undefined)
    expect(await pane.find({ type: 'Text', text: /^ Lv 1 $/ })).toEqual(isPanel ? undefined : expect.anything())
    await pane.unmount()
  }
})

test('/pet says why when no surface places the pane', async ($, on) => {
  const reason = 'no attached surface places panes'
  on('ui.open', async () => ({ value: { isPlaced: false as const, reason } }))
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const { text } = await $.command.run({
    command: 'pet',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
  expect(text).toBe(`The cat is out. The pane is not on screen: ${reason}`)
})

test('the size is kept across sessions', async ($, on) => {
  // A store of its own rather than mock.store, to see what is written.
  const kept = new Map<string, unknown>([['profile', { species: 'chick', size: 'small', pets: { chick: { name: '삐약' } } }]])
  on('store.get', async (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', async (_, e) => {
    kept.set(e.key, e.value)

    return { value: undefined }
  })
  on('ui.open', async () => ({ value: { isPlaced: true as const } }))
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await pane.find({ type: 'Raster', key: 'pet' }))?.props.rows).toBe(5)
  await $.command.run({
    command: 'pet',
    args: 'size medium',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
  expect(kept.get('profile')).toMatchObject({ species: 'chick', size: 'medium', pets: { chick: { name: '삐약' } } })
  await pane.unmount()
})

test('every sprite row is as wide as its sprite, and every mark has a color', async () => {
  for (const [id, kind] of Object.entries(SPECIES)) {
    for (const [size, side] of [['big', 12], ['mini', 8]] as const) {
      const sprite = kind[size]
      const rows = [sprite.rows, sprite.eyesShut, sprite.tear, sprite.feetApart].flatMap(Object.values)

      expect(sprite.rows.length).toBe(side)
      for (const row of rows) {
        expect({ id, size, row, width: row.length }).toEqual({ id, size, row, width: side })
        expect([...row].filter(mark => mark !== '.' && !(mark in kind.ink))).toEqual([])
      }
    }
  }
})

test('a pet grows up at Lv 15 and wears its accessory, and is a star at Lv 40', { options: { luck: false } }, async ($, on) => {
  // 4,899 xp: one short of Lv 15.
  mock.store(on, { profile: { species: 'cat', pets: { cat: { name: '초코', tools: 4899 } } } })
  const toasts: string[] = []
  on('ui.toast', async (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('turn.complete', async () => ({ text: '' }))
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const pane = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PROPS, bodyColumns: 100 } })
  const card = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const ribbon = '#ff6b8a'
  expect((await card.find({ type: 'Svg' }))?.props.source).not.toContain(ribbon)
  expect(await pane.find({ type: 'Text', text: 'CAT' })).toBeDefined()

  const turn = { answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const
  await $.turn.complete(turn)
  expect(toasts).toEqual(['초코 grew up! (Lv 15)'])
  expect((await card.find({ type: 'Svg' }))?.props.source).toContain(ribbon)
  expect(await pane.find({ type: 'Text', text: 'CAT · GROWN' })).toBeDefined()
  await pane.unmount()
  await card.unmount()
})

test('stages begin at Lv 15 and Lv 40', () => {
  expect([1, 14, 15, 39, 40, 99].map(stageOf)).toEqual(['baby', 'baby', 'grown', 'grown', 'star', 'star'])
})

test('Pet Run: a jump starts it, a snack touched is eaten, a bug touched ends it', () => {
  const cat = SPECIES.cat!
  const ready = newRun(40, 7)

  expect(ready.phase).toBe('ready')
  expect(advance(ready, cat)).toBe(ready)

  const running = jump(ready)
  expect(running.phase).toBe('running')
  // Midair, a second jump does nothing.
  const airborne = advance(running, cat)
  expect(airborne.lift).toBeGreaterThan(0)
  expect(jump(airborne)).toBe(airborne)

  const grounded = { ...running, rise: 0, lift: 0 }
  const fed = advance({ ...grounded, things: [{ kind: 'snack' as const, x: 6, y: 13 }] }, cat)
  expect(fed.snacks).toBe(1)
  expect(fed.things).toEqual([])
  expect(scoreOf(fed)).toBe(10)

  const hit = advance({ ...grounded, things: [{ kind: 'bug' as const, x: 7, y: 16 }] }, cat)
  expect(hit.phase).toBe('over')
  expect(jump(hit)).toBe(hit)
})

test('/pet play opens Pet Run, j jumps, the course repaints in place, and the best run is kept', { options: { luck: false } }, async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  mock.store(on, { profile: { species: 'cat', pets: { cat: { name: '초코' } } } })
  const opened: unknown[] = []
  on('ui.open', async (_, e) => {
    opened.push({ id: e.id, focus: e.focus, closeOnEscape: e.closeOnEscape })

    return { value: { isPlaced: true as const } }
  })
  let blits = 0
  on('ui.blit', async (_, e) => {
    if (e.requestId === 'pets-run' && e.key === 'run') {
      blits += 1
    }

    return { value: {} }
  })
  on('ui.toast', async () => ({ value: undefined }))
  on('session.surfaces', async () => ({ value: ['terminal' as const] }))
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const run = async (args: string) =>
    (
      await $.command.run({
        command: 'pet',
        args,
        origin: { kind: 'composer' },
        presentation: { isFullscreen: false, columns: 80 },
      })
    ).text

  expect(await run('play')).toBe('초코 is ready to run: j to jump, r to start over, Esc to stop.')
  expect(opened).toEqual([{ id: 'pets-run', focus: true, closeOnEscape: true }])

  const game = await $.ui.mount({ ...PANE, requestId: 'pets-run', surface: 'terminal' })
  expect(await game.find({ type: 'Raster', key: 'run' })).toBeDefined()
  expect(await game.find({ type: 'Text', text: /press j to start/ })).toBeDefined()

  await game.press({ key: 'jump' })
  await clock.advance(50 * 20)
  expect(blits).toBeGreaterThan(10)

  // Left alone, the first bug ends it.
  await clock.advance(50 * 400)
  expect(await game.find({ type: 'Text', text: /ouch! r to run again/ })).toBeDefined()
  const status = await run('status')
  expect(status).toMatch(/Pet Run best \d+/)
  // No snack was eaten, so none is counted.
  expect(status).not.toMatch(/snacks/)

  await game.press({ key: 'restart' })
  expect(await game.find({ type: 'Text', text: /press j to start/ })).toBeDefined()
  await game.unmount()
})

test('/pet play during a run keeps the run so far before starting a new one', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  mock.store(on, { profile: { species: 'cat', pets: { cat: { name: '초코' } } } })
  on('ui.open', async () => ({ value: { isPlaced: true as const } }))
  on('ui.blit', async () => ({ value: {} }))
  on('ui.toast', async () => ({ value: undefined }))
  on('session.surfaces', async () => ({ value: ['terminal' as const] }))
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const run = async (args: string) =>
    (
      await $.command.run({
        command: 'pet',
        args,
        origin: { kind: 'composer' },
        presentation: { isFullscreen: false, columns: 80 },
      })
    ).text

  await run('play')
  const game = await $.ui.mount({ ...PANE, requestId: 'pets-run', surface: 'terminal' })
  await game.press({ key: 'jump' })
  // Twenty ticks in, still airborne from the first jump: running, and a score on the board.
  await clock.advance(50 * 20)
  expect(await run('status')).not.toMatch(/Pet Run/)

  await run('play')
  expect(await run('status')).toMatch(/Pet Run best [1-9]\d*/)
  expect(await game.find({ type: 'Text', text: /press j to start/ })).toBeDefined()
  await game.unmount()
})

test('Pet Run off the terminal is an SVG with Jump and Again buttons', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const game = await $.ui.mount({ ...PANE, requestId: 'pets-run', surface })

    expect(await game.find({ type: 'Raster' })).toBeUndefined()
    expect((await game.find({ type: 'Svg' }))?.props.source).toMatch(/^<svg /)
    expect(await game.find({ type: 'Button', key: 'jump' })).toBeDefined()
    expect(await game.find({ type: 'Button', key: 'restart' })).toBeDefined()
    await game.unmount()
  }
})

test('Pet Quest stages are whole maps: equal rows, known tiles, a flag', () => {
  for (const stage of STAGES) {
    expect(stage.length).toBe(QUEST_ROWS)
    expect(new Set(stage.map(row => row.length)).size).toBe(1)
    expect(stage.join('').replace(/[.#=gTcbF]/g, '')).toBe('')
    expect(stage.join('')).toContain('F')
  }
})

/** Searches for presses that clear a stage, a few hundred runs abreast: the stage is fair if one does. */
function clears(index: number): boolean {
  let beam: Quest[] = [jumpQuest(newQuest(index, 80))]

  for (let tick = 0; tick < 2000 && beam.length > 0; tick += 1) {
    const next = new Map<string, Quest>()

    for (const quest of beam) {
      for (const isPressed of [false, true]) {
        const pressed = isPressed ? jumpQuest(quest) : quest
        if (isPressed && pressed === quest) {
          continue
        }
        const now = advanceQuest(pressed)
        if (now.phase === 'clear') {
          return true
        }
        if (now.phase === 'running') {
          const alive = now.foes.filter(foe => foe.isAlive).length
          const key = `${Math.round(now.x)},${Math.round(now.y * 2)},${Math.round(now.rise * 4)},${now.isGrounded},${now.hasBoosted},${alive}`
          const seen = next.get(key)
          if (seen === undefined || seen.snacks < now.snacks) {
            next.set(key, now)
          }
        }
      }
    }
    beam = [...next.values()].sort((a, b) => b.x - a.x || b.snacks - a.snacks).slice(0, 400)
  }

  return false
}

for (const index of STAGES.keys()) {
  test(`Pet Quest stage ${index + 1} can be cleared`, () => {
    expect(clears(index)).toBe(true)
  })
}

test('Pet Quest: a gift box gives a snack, a fall stomps a bug, a pit ends it, the bowl clears it', () => {
  const open = (rows: string[]): Quest => ({ ...newQuest(0, 40), tiles: rows, foes: [], phase: 'running' as const })
  const floor = '#'.repeat(30)
  const sky = '.'.repeat(30)

  // A gift box right over its head, rising into it.
  const knocked = advanceQuest({ ...open([sky, sky, '..g' + sky.slice(3), sky, sky, sky, floor]), y: 11, rise: 2, isGrounded: false })
  expect(knocked.snacks).toBe(1)
  expect(knocked.tiles[2]?.[2]).toBe('u')

  // Falling onto a bug squashes it and bounces.
  const stomped = advanceQuest({ ...open([sky, sky, sky, sky, sky, sky, floor]), y: 13, rise: -2, isGrounded: false, foes: [{ x: 6, y: 20, dir: -1, isAlive: true }] })
  expect(stomped.stomps).toBe(1)
  expect(stomped.rise).toBeGreaterThan(0)

  let falling = { ...open([sky, sky, sky, sky, sky, sky, '..' + '.'.repeat(28)]), y: 16 }
  for (let tick = 0; tick < 40 && falling.phase === 'running'; tick += 1) {
    falling = advanceQuest(falling)
  }
  expect(falling.phase).toBe('over')

  // Off the top of the view it keeps going and comes back down.
  let high = { ...open([sky, sky, sky, sky, sky, sky, floor]), y: 2, rise: 4, isGrounded: false }
  high = advanceQuest(high)
  expect(high.y).toBeLessThan(0)
  for (let tick = 0; tick < 40; tick += 1) {
    high = advanceQuest(high)
  }
  expect(high.isGrounded).toBe(true)
  expect(high.phase).toBe('running')

  const flagged = advanceQuest({ ...open([sky, sky, sky, sky, sky, '..F' + sky.slice(3), floor]), x: 2 })
  expect(flagged.phase).toBe('clear')
})

test('/pet quest opens the next open stage, keeps later ones shut, and j starts it', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  mock.store(on, { profile: { species: 'cat', pets: { cat: { name: '초코' } } } })
  on('ui.open', async () => ({ value: { isPlaced: true as const } }))
  on('ui.blit', async () => ({ value: {} }))
  on('ui.toast', async () => ({ value: undefined }))
  on('session.surfaces', async () => ({ value: ['terminal' as const] }))
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const run = async (args: string) =>
    (
      await $.command.run({
        command: 'pet',
        args,
        origin: { kind: 'composer' },
        presentation: { isFullscreen: false, columns: 80 },
      })
    ).text

  expect(await run('quest 2')).toBe('Stages open: 1 to 1 of 8.')
  expect(await run('quest')).toMatch(/^Stage 1: j to start/)

  const game = await $.ui.mount({ ...PANE, requestId: 'pets-quest', surface: 'terminal' })
  expect(await game.find({ type: 'Raster', key: 'quest' })).toBeDefined()
  expect(await game.find({ type: 'Text', text: /press j to start/ })).toBeDefined()
  await game.press({ key: 'jump' })
  await clock.advance(50 * 40)
  expect(await game.find({ type: 'Text', text: /press j to start/ })).toBeUndefined()
  expect(await game.find({ type: 'Text', text: /stage 1\/8/ })).toBeDefined()
  // Retry does nothing mid-run.
  await game.press({ key: 'retry' })
  expect(await game.find({ type: 'Text', text: /press j to start/ })).toBeUndefined()
  await game.unmount()

  for (const surface of ['desktop', 'mobile'] as const) {
    const card = await $.ui.mount({ ...PANE, requestId: 'pets-quest', surface })
    expect((await card.find({ type: 'Svg' }))?.props.source).toMatch(/^<svg /)
    expect(await card.find({ type: 'Button', key: 'jump' })).toBeDefined()
    await card.unmount()
  }
})

/** Opens stage 1 and plays it, jumping every five ticks, until snacks are eaten and it still runs. */
async function questWithSnacks($: Parameters<Parameters<typeof test>[1]>[0], on: Parameters<Parameters<typeof test>[1]>[1]) {
  const clock = mock.clock(on, { now: 0 })
  mock.store(on, { profile: { species: 'cat', pets: { cat: { name: '초코' } } } })
  on('ui.open', async () => ({ value: { isPlaced: true as const } }))
  on('ui.blit', async () => ({ value: {} }))
  on('ui.toast', async () => ({ value: undefined }))
  on('session.surfaces', async () => ({ value: ['terminal' as const] }))
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const run = async (args: string) =>
    (
      await $.command.run({
        command: 'pet',
        args,
        origin: { kind: 'composer' },
        presentation: { isFullscreen: false, columns: 80 },
      })
    ).text

  await run('quest')
  const game = await $.ui.mount({ ...PANE, requestId: 'pets-quest', surface: 'terminal' })
  // Stage 1 jumped every five ticks eats its first snack by tick 46 and is still under way at 80.
  for (let beat = 0; beat < 16; beat += 1) {
    await game.press({ key: 'jump' })
    await clock.advance(50 * 5)
  }
  expect(await run('status')).not.toMatch(/snacks/)

  return { run, game }
}

test('/pet quest during a stage keeps its snacks before starting it again', async ($, on) => {
  const { run, game } = await questWithSnacks($, on)

  await run('quest')
  expect(await run('status')).toMatch(/· [1-9]\d* snacks/)
  expect(await game.find({ type: 'Text', text: /press j to start/ })).toBeDefined()
  await game.unmount()
})

test('/pet choose during a stage gives its snacks to the pet that played it', async ($, on) => {
  const { run, game } = await questWithSnacks($, on)

  expect(await run('choose chick')).toBe('The chick is out.')
  expect(await run('status')).not.toMatch(/snacks/)
  expect(await run('choose cat')).toBe('초코 is out.')
  expect(await run('status')).toMatch(/· [1-9]\d* snacks/)
  await game.unmount()
})

test('gifts are mostly small, sometimes a treasure, rarely the sparkle stone', () => {
  expect([0, 0.59, 0.6, 0.85, 0.95, 0.99].map(r => giftOf(r))).toEqual([
    { kind: 'xp', name: 'a cookie', xp: 5 },
    { kind: 'xp', name: 'a cookie', xp: 5 },
    { kind: 'xp', name: 'a toy', xp: 15 },
    { kind: 'xp', name: 'a treasure', xp: 40 },
    { kind: 'xp', name: 'the jackpot', xp: 100 },
    { kind: 'stone' },
  ])
  expect(worthOf({ kind: 'stone' }, false)).toEqual({ xp: 0, makesShiny: true })
  expect(worthOf({ kind: 'stone' }, true)).toEqual({ xp: 100, makesShiny: false })
})

test('with luck, finished turns turn up gifts that add experience', async ($, on) => {
  const kept = new Map<string, unknown>([['profile', { species: 'cat', pets: { cat: { name: '초코' } } }]])
  on('store.get', async (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', async (_, e) => {
    kept.set(e.key, e.value)

    return { value: undefined }
  })
  const toasts: string[] = []
  on('ui.toast', async (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('turn.complete', async () => ({ text: '' }))
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  // At one in ten, three hundred turns all coming up empty is a one in 10^13 chance.
  const turn = { answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as const
  for (let i = 0; i < 300; i += 1) {
    await $.turn.complete(turn)
  }
  const cat = (kept.get('profile') as { pets: { cat: { gifts: number; bonus: number; shiny: boolean } } }).pets.cat
  expect(cat.gifts).toBeGreaterThan(0)
  expect(cat.bonus > 0 || cat.shiny).toBe(true)
  expect(toasts.some(text => /^초코 found /.test(text))).toBe(true)
})

test('a shiny pet is drawn in its shiny colors and says so', async ($, on) => {
  mock.store(on, { profile: { species: 'slime', pets: { slime: { name: '말랑', shiny: true } } } })
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const card = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const source = (await card.find({ type: 'Svg' }))?.props.source
  expect(source).toContain('#ffb8dc')
  expect(source).not.toContain('#9fe0a8')
  expect((await card.find({ type: 'Svg' }))?.props.alt).toMatch(/^말랑 the shiny slime/)
  await card.unmount()

  const pane = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PROPS, bodyColumns: 100 } })
  expect(await pane.find({ type: 'Text', text: 'SLIME ✦' })).toBeDefined()
  await pane.unmount()
})
