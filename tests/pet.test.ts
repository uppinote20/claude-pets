/**
 * Drives the plugin through its hooks: mocked clock and store, mounted Pane.
 * @handbook 5.1-plugin-test-harness
 * @handbook 5.2-ci-release-gates
 * @covers hooks/register.tsx
 * @covers hooks/scene.ts
 * @covers hooks/species.ts
 */
import { expect, mock, test } from 'claude-code/testing'

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

test('the pet paces, takes a pat, a name and a species, and leaves when told', async ($, on) => {
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
  expect(toasts).toEqual(['The chick reached Lv 2!'])
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
