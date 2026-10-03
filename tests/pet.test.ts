/**
 * Drives the plugin through its hooks: mocked clock and store, mounted Pane.
 * @handbook 5.1-plugin-test-harness
 * @handbook 5.2-ci-release-gates
 * @covers hooks/art.ts
 * @covers hooks/luck.ts
 * @covers hooks/nature.ts
 * @covers hooks/quest.ts
 * @covers hooks/register.tsx
 * @covers hooks/run.ts
 * @covers hooks/scene.ts
 * @covers hooks/species.ts
 */
import { expect, mock, test } from 'claude-code/testing'

import { ART_SIDE, artOf } from '../hooks/art'
import { giftOf, worthOf } from '../hooks/luck'
import { daypartOf, driftLeaning, natureOf, reformOf, rhythmOf } from '../hooks/nature'
import { QUEST_ROWS, STAGES, advanceQuest, jumpQuest, newQuest } from '../hooks/quest'
import type { Quest } from '../hooks/quest'
import { advance, jump, newRun, scoreOf } from '../hooks/run'
import { bodyOf, paint, stageOf, yardOf } from '../hooks/scene'
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
  expect(await run('status')).toBe('초코 the cat · Lv 2 · 26 xp (next at 100) · 3 pats, 0 turns, 20 tool calls, 0 output tokens · curious')

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
    'The chick · Lv 2 · 27 xp (next at 100) · 0 pats, 1 turns, 0 tool calls, 22.0K output tokens · curious · Also: 나비 the cat Lv 2',
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
    // The baby cat has hi-res art: its fur, outline and glints come from it.
    expect(card?.props.source).toContain('#ffcf7d')
    expect(card?.props.source).toContain('#6b4636')
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

test('/pet says why when no surface places the pane', { options: { luck: false } }, async ($, on) => {
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
    const sprites = [
      ['big', kind.big, 12],
      ['mini', kind.mini, 8],
      ['teen', kind.teen, 12],
      ...Object.entries(kind.adults ?? {}).map(([form, sprite]) => [form, sprite, 12] as const),
    ] as const
    for (const [size, sprite, side] of sprites) {
      const rows = [sprite.rows, sprite.eyesShut, sprite.tear, sprite.feetApart].flatMap(Object.values)
      const ink = { ...kind.ink, ...(sprite.ink ?? {}) }

      expect(sprite.rows.length).toBe(side)
      for (const row of rows) {
        expect({ id, size, row, width: row.length }).toEqual({ id, size, row, width: side })
        expect([...row].filter(mark => mark !== '.' && !(mark in ink))).toEqual([])
      }
    }
  }
})

test('every species has hi-res baby and teen art, square, fully inked, its frames on rows of their own', () => {
  for (const id of Object.keys(SPECIES)) {
    for (const stage of ['baby', 'teen', 'adult'] as const) {
      const art = artOf(id, stage)
      if (art === undefined) {
        expect({ id, stage, hasArt: stage === 'adult' }).toEqual({ id, stage, hasArt: true })
        continue
      }
      const frames = [art.eyesShut, art.tear, art.feetApart].map(frame => Object.keys(frame))
      const rows = [art.rows, art.eyesShut, art.tear, art.feetApart].flatMap(Object.values)

      expect(art.rows.length).toBe(ART_SIDE)
      for (const row of rows) {
        expect({ id, stage, width: row.length }).toEqual({ id, stage, width: ART_SIDE })
        expect([...row].filter(mark => mark !== '.' && !(mark in art.ink))).toEqual([])
      }
      // A blink and a step can come on the same tick: neither may undo the other.
      expect(new Set(frames.flat()).size).toBe(frames.flat().length)
      expect(frames.every(frame => frame.length > 0)).toBe(true)
    }
  }
})

test('a pet grows into a teen at Lv 15 and wears its accessory', { options: { luck: false } }, async ($, on) => {
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
  expect(toasts).toEqual(['초코 grew into a teen! (Lv 15)'])
  expect((await card.find({ type: 'Svg' }))?.props.source).toContain(ribbon)
  expect(await pane.find({ type: 'Text', text: 'CAT · TEEN' })).toBeDefined()
  await pane.unmount()
  await card.unmount()
})

test('stages begin at Lv 15 and Lv 40', () => {
  expect([1, 14, 15, 39, 40, 99].map(stageOf)).toEqual(['baby', 'baby', 'teen', 'teen', 'adult', 'adult'])
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

test('/pet choose during a stage gives its snacks to the pet that played it', { options: { luck: false } }, async ($, on) => {
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

test('the very first cat is met when the session starts, so its roll at being shiny happens then', { options: { luck: false } }, async ($, on) => {
  const kept = new Map<string, unknown>()
  on('store.get', async (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', async (_, e) => {
    kept.set(e.key, e.value)

    return { value: undefined }
  })
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  // Kept at once (luck off here, so not shiny): a pat or a turn later no longer counts as meeting it.
  expect(kept.get('profile')).toMatchObject({ species: 'cat', pets: { cat: { shiny: false } } })
})

test('a cat already kept is not rolled again when a session starts', async ($, on) => {
  const kept = new Map<string, unknown>([['profile', { species: 'cat', pets: { cat: { name: '초코' } } }]])
  on('store.get', async (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', async (_, e) => {
    kept.set(e.key, e.value)

    return { value: undefined }
  })
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  // Luck is on, and still nothing is written: only a pet never met is rolled.
  expect(kept.get('profile')).toEqual({ species: 'cat', pets: { cat: { name: '초코' } } })
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

test('a nature shows once one side of it stands out, and a rhythm once its hours do', () => {
  const none = { name: '', pats: 0, tools: 0, turns: 0, tokens: 0, snacks: 0, best: 0, cleared: 0, gifts: 0, bonus: 0, shiny: false, hours: [0, 0, 0, 0], form: '', leaning: [], day: '', brought: [0, 0, 0, 0] }

  expect(natureOf({ ...none, tools: 30 })).toBe('curious')
  expect(natureOf({ ...none, tools: 300, turns: 10 })).toBe('worker')
  expect(natureOf({ ...none, turns: 40, tokens: 90_000, tools: 50 })).toBe('scholar')
  expect(natureOf({ ...none, pats: 60, tools: 20 })).toBe('sweetie')
  expect(natureOf({ ...none, snacks: 120, tools: 40 })).toBe('gamer')
  expect(natureOf({ ...none, tools: 100, pats: 50, snacks: 100 })).toBe('curious')
  // Two sides tied at the top, each well past the share that stands out: still neither.
  expect(natureOf({ ...none, tools: 200, snacks: 200 })).toBe('curious')

  expect(rhythmOf([3, 2, 2, 2])).toBeNull()
  // Two quarters tied at the top: no rhythm, whichever comes first.
  expect(rhythmOf([10, 10, 0, 0])).toBeNull()
  expect(rhythmOf([0, 12, 12, 0])).toBeNull()
  expect(rhythmOf([20, 4, 4, 6])).toBe('night owl')
  expect(rhythmOf([2, 14, 4, 6])).toBe('early bird')
  expect([0, 5, 6, 11, 12, 17, 18, 23].map(daypartOf)).toEqual(['night', 'night', 'morning', 'morning', 'day', 'day', 'evening', 'evening'])
})

test('a worker shows its nature in the stats, and the card turns night blue at night', async ($, on) => {
  // 02:00 UTC, the host's offset unknown here, so UTC.
  const clock = mock.clock(on, { now: Date.UTC(2026, 9, 2, 2, 0) })
  mock.store(on, { profile: { species: 'cat', pets: { cat: { name: '초코', tools: 400 } } } })
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await clock.advance(600)

  const pane = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PROPS, bodyColumns: 100 } })
  expect(await pane.find({ type: 'Text', text: 'worker' })).toBeDefined()
  await pane.unmount()

  const card = await $.ui.mount({ ...PANE, surface: 'mobile' })
  expect((await card.find({ type: 'Svg' }))?.props.source).toContain('#2b3050')
  await card.unmount()
})

test('snacks from a game that reach Lv 40 evolve it and say so, as any other experience does', { options: { luck: false } }, async ($, on) => {
  // 38,024 xp, all tool calls: one snack short of Lv 40 (38,025), and a worker.
  const kept = new Map<string, unknown>([['profile', { species: 'cat', pets: { cat: { name: '초코', tools: 38_024 } } }]])
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
  const clock = mock.clock(on, { now: 0 })
  on('ui.open', async () => ({ value: { isPlaced: true as const } }))
  on('ui.blit', async () => ({ value: {} }))
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
  expect(toasts).toEqual([])

  // Starting the stage again keeps the snacks so far: one is enough.
  await run('quest')
  expect(toasts).toContain('초코 evolved into a worker cat! (Lv 40)')
  expect(kept.get('profile')).toMatchObject({ pets: { cat: { form: 'worker' } } })
  await game.unmount()
})

test('at Lv 40 it evolves into the form of its nature, kept from then on', { options: { luck: false } }, async ($, on) => {
  // 38,020 xp, all tool calls: a turn short of Lv 40 (38,025), and a worker.
  const kept = new Map<string, unknown>([['profile', { species: 'cat', pets: { cat: { name: '초코', tools: 38_020 } } }]])
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

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })
  expect(toasts).toEqual(['초코 evolved into a worker cat! (Lv 40)'])
  expect((kept.get('profile') as { pets: { cat: { form: string } } }).pets.cat.form).toBe('worker')

  // The cat has a worker adult of its own: overalls.
  const card = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await card.find({ type: 'Svg' }))?.props.source).toContain('#5b7fb8')
  await card.unmount()
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PROPS, bodyColumns: 100 } })
  expect(await pane.find({ type: 'Text', text: 'CAT · WORKER' })).toBeDefined()
  await pane.unmount()
})

test('an adult without a drawing of its own is the teen in its gear, and the rare form wears its mark', () => {
  const dog = SPECIES.dog!
  const cat = SPECIES.cat!

  expect(bodyOf(dog, 'adult', 'worker')).toBe(dog.teen)
  expect(bodyOf(cat, 'adult', 'scholar')).toBe(cat.adults?.scholar)
  expect(bodyOf(cat, 'adult', 'rare')).toBe(cat.teen)

  const one = { x: 0, dir: -1 as const, frame: 2, mood: 'walk' as const, hold: 0, idle: 0 }
  const colors = (form: 'rare' | 'worker') => new Set(paint(one, dog, 'medium', 30, 20, { stage: 'adult', form }).pixels.flat())
  expect(colors('rare').has(0xc3cde0)).toBe(true)
  expect(colors('worker').has(0xc3cde0)).toBe(false)
})

test('the leaning drifts toward what a day brought, and an adult follows only once it has clearly moved on', () => {
  const worker = [0.9, 0.05, 0.03, 0.02]
  const after = driftLeaning(worker, { worker: 0, scholar: 10, sweetie: 0, gamer: 0 })

  expect(after.map(share => Math.round(share * 10_000) / 10_000)).toEqual([0.792, 0.164, 0.0264, 0.0176])
  expect(driftLeaning(worker, { worker: 0, scholar: 0, sweetie: 0, gamer: 0 })).toEqual(worker)

  expect(reformOf('worker', [0.45, 0.45, 0.05, 0.05])).toBe('worker')
  expect(reformOf('worker', [0.2, 0.6, 0.1, 0.1])).toBe('scholar')
  expect(reformOf('rare', [0.05, 0.9, 0.03, 0.02])).toBe('rare')
  expect(reformOf('', [0.05, 0.9, 0.03, 0.02])).toBe('')
})

test('the yard fills with props by share, one at a time', () => {
  expect(yardOf([], 4)).toEqual([0, 0, 0, 0])
  expect(yardOf([0.9, 0.05, 0.03, 0.02], 4)).toEqual([4, 0, 0, 0])
  expect(yardOf([0.55, 0.2, 0.15, 0.1], 4)).toEqual([2, 1, 1, 0])
  expect(yardOf([0.3, 0.3, 0.2, 0.2], 4)).toEqual([1, 1, 1, 1])

  // A worker's yard has its cone; the gamer's, its arcade cabinet.
  const one = { x: 10, dir: -1 as const, frame: 2, mood: 'walk' as const, hold: 0, idle: 0 }
  const colors = (leaning: number[]) => new Set(paint(one, SPECIES.cat!, 'medium', 40, 20, { leaning }).pixels.flat())
  expect(colors([0.9, 0.05, 0.03, 0.02]).has(0xff8a3d)).toBe(true)
  expect(colors([0.05, 0.05, 0.05, 0.85]).has(0x6a5aa8)).toBe(true)
  expect(colors([]).has(0xff8a3d)).toBe(false)
})

test('the leaning moves once a day, and an adult whose leaning has moved on takes the new side', { options: { luck: false } }, async ($, on) => {
  // A worker adult whose leaning has drifted to talk; yesterday was all talk too.
  const clock = mock.clock(on, { now: Date.UTC(2026, 9, 2, 12, 0) })
  const kept = new Map<string, unknown>([
    [
      'profile',
      {
        species: 'cat',
        pets: { cat: { name: '초코', tools: 40_000, form: 'worker', leaning: [0.22, 0.58, 0.1, 0.1], day: '2026-10-01', brought: [0, 60, 0, 0] } },
      },
    ],
  ])
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
  await clock.advance(600)

  // The first turn of a new day moves the leaning toward yesterday's talk; the worker fades.
  const turn = { answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as const
  await $.turn.complete(turn)
  expect(toasts).toEqual(['초코 took after you: a scholar cat now.'])
  const cat = () => (kept.get('profile') as { pets: { cat: { form: string; day: string; brought: number[]; leaning: number[] } } }).pets.cat
  expect(cat().form).toBe('scholar')
  expect(cat().day).toBe('2026-10-02')
  expect(cat().brought).toEqual([0, 5, 0, 0])

  // Later turns the same day only add to its tally: the leaning stays put.
  const leaning = cat().leaning
  await $.turn.complete(turn)
  expect(cat().leaning).toEqual(leaning)
  expect(cat().brought).toEqual([0, 10, 0, 0])
})

test('a pat counts toward the day the moment it is kept, before any turn and only once', { options: { luck: false } }, async ($, on) => {
  const clock = mock.clock(on, { now: Date.UTC(2026, 9, 2, 12, 0) })
  const kept = new Map<string, unknown>([['profile', { species: 'cat', pets: { cat: { name: '초코', day: '2026-10-02', brought: [0, 0, 0, 0] } } }]])
  on('store.get', async (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', async (_, e) => {
    kept.set(e.key, e.value)

    return { value: undefined }
  })
  on('ui.open', async () => ({ value: { isPlaced: true as const } }))
  on('turn.complete', async () => ({ text: '' }))
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await clock.advance(600)
  const brought = () => (kept.get('profile') as { pets: { cat: { brought: number[] } } }).pets.cat.brought

  // The first thing this session does is a pat: it is the sweetie side's, at once.
  await $.command.run({ command: 'pet', args: 'pat', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(brought()).toEqual([0, 0, 2, 0])

  // A turn then adds its own work, and does not count the pat again.
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' })
  expect(brought()).toEqual([0, 5, 2, 0])
})

test('the card grass takes the shade of the leaning, as the pane grass does', { options: { luck: false } }, async ($, on) => {
  // Known (well past 60 xp) and all for the worker: the grass leans its way.
  mock.store(on, { profile: { species: 'cat', pets: { cat: { name: '초코', tools: 400, leaning: [1, 0, 0, 0] } } } })
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const card = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const source = (await card.find({ type: 'Svg' }))?.props.source ?? ''
  // The plain green of a pet that leans nowhere is gone from the mound.
  expect(source).not.toContain('fill="#b5dcae"')
  await card.unmount()
})

test('with art set to pixel the card keeps the 12×12 sprite', { options: { art: 'pixel' } }, async $ => {
  const card = await $.ui.mount({ ...PANE, surface: 'mobile' })

  expect((await card.find({ type: 'Svg' }))?.props.source).toContain('#ffd787')
  expect((await card.find({ type: 'Svg' }))?.props.source).not.toContain('#6b4636')
  await card.unmount()
})

test('kitty draws the yard as an image with the hi-res pet; other terminals keep half blocks', { options: { luck: false } }, async ($, on) => {
  mock.env(on, { TERM: 'xterm-kitty' })
  mock.store(on)
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await pane.find({ type: 'Raster' })).toBeUndefined()
  const image = await pane.find({ type: 'Image', key: 'pet' })
  expect(image?.props.columns).toBe(38)
  expect(image?.props.rows).toBe(8)
  expect(image?.props.source).toMatchObject({ width: 38 * 8, height: 16 * 8 })
  // The picture is all there and drawn: four bytes a pixel, and the pet and grass opaque in it.
  const { rgba, width, height } = image?.props.source as { rgba: string; width: number; height: number }
  const bytes = Uint8Array.from(atob(rgba), mark => mark.charCodeAt(0))
  expect(bytes.length).toBe(width * height * 4)
  expect(bytes.filter((_, at) => at % 4 === 3 && bytes[at] === 0xff).length).toBeGreaterThan(width * height * 0.1)
  expect(await pane.find({ type: 'Raster' })).toBeUndefined()
  await pane.unmount()
})

test('Ghostty is an image terminal too, by its program name', { options: { luck: false } }, async ($, on) => {
  mock.env(on, { TERM: 'xterm-256color', TERM_PROGRAM: 'ghostty' })
  mock.store(on)
  on('command.register', async () => ({ value: { command: 'pet' } }))
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await pane.find({ type: 'Image', key: 'pet' })).toBeDefined()
  expect(await pane.find({ type: 'Raster' })).toBeUndefined()
  await pane.unmount()
})
