/**
 * The hooks module: state, the /pet command, session reactions and the Pane render.
 * @handbook 1.1-mod-registration
 * @handbook 1.2-state-layers
 * @handbook 1.3-event-flow
 * @handbook 2.1-defensive-store-read
 * @handbook 2.2-grow-write-once
 * @handbook 2.3-name-sanitizing
 * @handbook 3.1-xp-level-curve
 * @handbook 3.2-mood-state-machine
 * @handbook 3.3-pet-command
 * @handbook 4.2-pixel-pipeline
 * @handbook 4.3-surface-branch
 * @tested tests/pet.test.ts
 */
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Pet, PetProfile, PetStats } from '../types'
import { DEFAULT_SPECIES, SPECIES } from './species'
import type { Species } from './species'

const PANE = 'pets'
const TITLE = 'Pet'
const PANE_ROWS = 10
const PROFILE_KEY = 'profile'
const NAME_LIMIT = 20
const TICK_MS = 600
const YARD = 20
const NAP_AFTER = 200
const WORRY_PERCENT = 80
const SPRITE_CELLS = 12
const HEART_CELLS = 4
const SCENE_PIXELS = 14
const DEFAULT_COLOR = 0x01000000
const HEART_INK = 0xff87af
const HEART = ['h.h', 'hhh', '.h.'] as const
const XP_PER_TURN = 5
const XP_PER_PAT = 2
const TOKENS_PER_XP = 1000
const XP_CURVE = 25
/** What follows `/pet`: the command's description and its usage line are both built from this. */
const VERBS = ['pat', 'name <name>', 'choose <species>', 'status', 'bye'] as const

const PASTEL = { yellow: '#ffd787', pink: '#ffafd7', green: '#afd7af', gray: '#b2b2b2' } as const
const NEWBORN: Pet = { x: 0, dir: 1, frame: 0, mood: 'walk', hold: 0, idle: 0 }
const UNMET: PetStats = { name: '', pats: 0, tools: 0, turns: 0, tokens: 0 }
const STRANGER: PetProfile = { species: DEFAULT_SPECIES, pets: {} }

const pet = atom({ plugin: 'pets', key: 'pet' } as const, NEWBORN)
const profile = atom({ plugin: 'pets', key: 'profile' } as const, STRANGER)
const isWorried = atom({ plugin: 'pets', key: 'isWorried' } as const, false)

function speciesOf(who: PetProfile): Species {
  return SPECIES[who.species] ?? SPECIES[DEFAULT_SPECIES]!
}

/** The pet that is out: a species never chosen before starts from nothing. */
function statsOf(who: PetProfile): PetStats {
  return who.pets[who.species] ?? UNMET
}

function withStats(who: PetProfile, change: (stats: PetStats) => PetStats): PetProfile {
  return { ...who, pets: { ...who.pets, [who.species]: change(statsOf(who)) } }
}

function calledOf(who: PetProfile): string {
  const { name } = statsOf(who)

  return name === '' ? `The ${speciesOf(who).label}` : name
}

/**
 * A tool call is 1, a pat 2, a finished turn 5, and every thousand output tokens 1.
 * Output only: input and cache reads grow with the conversation's length, not with the work done.
 */
function xpOf(stats: PetStats): number {
  return stats.tools + stats.turns * XP_PER_TURN + stats.pats * XP_PER_PAT + Math.floor(stats.tokens / TOKENS_PER_XP)
}

/**
 * Level 1 at birth, level `n + 1` once it has `XP_CURVE * n²` experience.
 * Quadratic, so an evening reaches level 5 and a year of heavy use stays in the low hundreds.
 */
function levelOf(stats: PetStats): number {
  return 1 + Math.floor(Math.sqrt(xpOf(stats) / XP_CURVE))
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStats(fields: Record<string, unknown>): PetStats {
  return {
    name: typeof fields.name === 'string' ? cleanName(fields.name) : '',
    pats: count(fields.pats),
    tools: count(fields.tools),
    turns: count(fields.turns),
    tokens: count(fields.tokens),
  }
}

/** What `$.store` holds may be from another version, or nothing: read it field by field. */
function toProfile(kept: unknown): PetProfile {
  if (!isRecord(kept)) {
    return STRANGER
  }

  const species = typeof kept.species === 'string' && kept.species in SPECIES ? kept.species : DEFAULT_SPECIES

  // 0.1.0 before per-pet levels kept one pet's fields beside `species`.
  if (!isRecord(kept.pets)) {
    return { species, pets: { [species]: toStats(kept) } }
  }

  const pets: Record<string, PetStats> = {}

  for (const [kind, fields] of Object.entries(kept.pets)) {
    if (kind in SPECIES && isRecord(fields)) {
      pets[kind] = toStats(fields)
    }
  }

  return { species, pets }
}

function compact(tokens: number): string {
  if (tokens >= 1e9) {
    return `${(tokens / 1e9).toFixed(1)}B`
  }
  if (tokens >= 1e6) {
    return `${(tokens / 1e6).toFixed(1)}M`
  }

  return tokens >= 1e3 ? `${(tokens / 1e3).toFixed(1)}K` : String(tokens)
}

function statusOf(who: PetProfile): string {
  const stats = statsOf(who)
  const level = levelOf(stats)
  const others = Object.entries(who.pets)
    .filter(([kind]) => kind !== who.species)
    .map(([kind, other]) => `${other.name === '' ? kind : `${other.name} the ${kind}`} Lv ${levelOf(other)}`)

  return [
    `${calledOf(who)} the ${speciesOf(who).label} · Lv ${level} · ${xpOf(stats)} xp (next at ${XP_CURVE * level * level})`,
    `${stats.pats} pats, ${stats.turns} turns, ${stats.tools} tool calls, ${compact(stats.tokens)} output tokens`,
    ...(others.length === 0 ? [] : [`Also: ${others.join(', ')}`]),
  ].join(' · ')
}

/** What a typed name is kept as: one line, no control characters, at most `NAME_LIMIT` characters. */
function cleanName(typed: string): string {
  return [...typed.replace(/\p{Cc}/gu, ' ').trim()].slice(0, NAME_LIMIT).join('')
}

function act(one: Pet, mood: Pet['mood'], hold: number): Pet {
  return { ...one, mood, hold, idle: 0 }
}

/** One tick: a held mood runs out, a quiet session naps, else it paces. */
function step(one: Pet): Pet {
  const frame = one.frame + 1

  if (one.hold > 1) {
    return { ...one, frame, hold: one.hold - 1 }
  }
  if (one.hold === 1) {
    return { ...one, frame, hold: 0, mood: 'walk' }
  }
  if (one.mood === 'sleep') {
    return { ...one, frame }
  }
  if (one.idle >= NAP_AFTER) {
    return { ...one, frame, mood: 'sleep' }
  }

  const x = Math.min(YARD, Math.max(0, one.x + one.dir))
  const dir = x === 0 ? 1 : x === YARD ? -1 : one.dir

  return { ...one, frame, x, dir, mood: 'walk', idle: one.idle + 1 }
}

function saysOf(one: Pet, who: PetProfile, isSad: boolean): string {
  const beat = one.frame % 2

  switch (one.mood) {
    case 'sleep':
      return beat === 0 ? 'z' : 'z Z'
    case 'happy':
      return 'nice work!'
    case 'work':
      return beat === 0 ? '. .' : '. . .'
    case 'love':
      return `${speciesOf(who).purr} ×${statsOf(who).pats}`
    case 'walk':
      return isSad ? 'limits are close…' : ''
  }
}

/** The sprite's twelve pixel rows for this tick: eyes, tear and feet by mood, flipped to face its way. */
function spriteRows(one: Pet, kind: Species, isSad: boolean): string[] {
  const rows: string[] = [...kind.rows]
  const isBlinking = one.mood === 'walk' && one.frame % 9 === 0

  if (one.mood === 'sleep' || one.mood === 'happy' || one.mood === 'love' || isBlinking) {
    rows[4] = kind.eyesShut[0]
    rows[5] = kind.eyesShut[1]
  }
  if (one.mood === 'walk' && isSad) {
    rows[6] = kind.tear
  }
  if (one.mood !== 'sleep' && one.frame % 2 === 1) {
    rows[11] = kind.feetApart
  }

  // Sprites are drawn facing left; mirrored when it walks right.
  return one.dir === 1 ? rows.map(row => [...row].reverse().join('')) : rows
}

/** The scene as pixels, `SCENE_PIXELS` rows of `width`: null where nothing is drawn. */
function paint(one: Pet, kind: Species, isSad: boolean, width: number): (number | null)[][] {
  const pixels: (number | null)[][] = Array.from({ length: SCENE_PIXELS }, () =>
    Array.from({ length: width }, () => null),
  )
  const stamp = (rows: readonly string[], ink: Readonly<Record<string, number>>, left: number, top: number) => {
    rows.forEach((row, y) => {
      [...row].forEach((mark, x) => {
        const line = pixels[top + y]
        const color = ink[mark]

        if (line !== undefined && left + x < width && color !== undefined) {
          line[left + x] = color
        }
      })
    })
  }

  const left = Math.round((one.x / YARD) * Math.max(0, width - SPRITE_CELLS - HEART_CELLS))
  const isBouncy = one.mood === 'walk' || one.mood === 'happy'
  const top = isBouncy && one.frame % 2 === 1 ? 1 : 2

  stamp(spriteRows(one, kind, isSad), kind.ink, left, top)
  if (one.mood === 'love') {
    stamp(HEART, { h: HEART_INK }, left + SPRITE_CELLS + 1, one.frame % 2)
  }

  return pixels
}

type Cell = { glyph: string; fg: number | null; bg: number | null }

/** Folds each pair of pixel rows into one row of half-block cells. */
function toCells(pixels: (number | null)[][]): Cell[][] {
  const lines: Cell[][] = []

  for (let y = 0; y + 1 < pixels.length; y += 2) {
    const upper = pixels[y] ?? []
    const lower = pixels[y + 1] ?? []

    lines.push(
      upper.map((top, x) => {
        const bottom = lower[x] ?? null

        if (top === null) {
          return bottom === null ? { glyph: ' ', fg: null, bg: null } : { glyph: '▄', fg: bottom, bg: null }
        }

        return top === bottom ? { glyph: '█', fg: top, bg: null } : { glyph: '▀', fg: top, bg: bottom }
      }),
    )
  }

  return lines
}

/** `Raster`'s packing: little-endian u32 triplets `[codePoint, foreground, background]`, base64. */
function pack(lines: Cell[][]): string {
  const words = new Uint32Array(lines.flat().flatMap(cell => [
    cell.glyph.codePointAt(0) ?? 0x20,
    cell.fg ?? DEFAULT_COLOR,
    cell.bg ?? DEFAULT_COLOR,
  ]))

  // The environment has Uint8Array.prototype.toBase64; the es2023 lib does not declare it yet.
  const bytes = new Uint8Array(words.buffer) as Uint8Array & { toBase64(): string }

  return bytes.toBase64()
}

type Run = { text: string; color?: string; backgroundColor?: string }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

/** One line of cells as runs of equal style: what a surface without `Raster` draws as `Text`. */
function toRuns(line: Cell[]): Run[] {
  const runs: (Run & { fg: number | null; bg: number | null })[] = []

  for (const cell of line) {
    const last = runs.at(-1)

    if (last !== undefined && last.fg === cell.fg && last.bg === cell.bg) {
      last.text += cell.glyph
    } else {
      runs.push({
        text: cell.glyph,
        fg: cell.fg,
        bg: cell.bg,
        ...(cell.fg === null ? {} : { color: hex(cell.fg) }),
        ...(cell.bg === null ? {} : { backgroundColor: hex(cell.bg) }),
      })
    }
  }

  return runs.map(({ fg, bg, ...run }) => run)
}

async function openPane($: EngineInterface): Promise<void> {
  await $.ui.open({ id: PANE, title: TITLE, rows: PANE_ROWS })
}

/**
 * Applies `change` to the pet that is out and keeps the result across sessions.
 * It reads the store first, so what another session saved meanwhile is added to, not overwritten.
 */
async function grow($: EngineInterface, change: (stats: PetStats) => PetStats): Promise<PetProfile> {
  const { species } = await read($, profile)
  const now = withStats({ ...toProfile(await $.store.get(PROFILE_KEY)), species }, change)
  await $.store.set(PROFILE_KEY, now)
  await update($, profile, () => now)

  return now
}

export const register: Register = on => {
  // Tool calls since the last save: the store is written once a turn, not on every call.
  let unsavedTools = 0
  // The level last seen for the pet that is out, so a level-up is announced once.
  let shownLevel = 1

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pet',
      description: `Let your pixel pet out; /pet ${VERBS.join(', ')}`,
    })
    const kept = toProfile(await $.store.get(PROFILE_KEY))
    await update($, profile, () => kept)
    shownLevel = levelOf(statsOf(kept))
    $.clock.every(TICK_MS, () => void update($, pet, step))

    return next(e)
  })

  on('command.run', { command: 'pet' }, async ($, e) => {
    const [verb = '', ...rest] = e.args.trim().split(/\s+/)
    const who = await read($, profile)
    const called = calledOf(who)

    switch (verb) {
      case '':
        await openPane($)

        return { text: `${called} is out.` }
      case 'pat': {
        await update($, pet, one => act(one, 'love', 8))
        await grow($, stats => ({ ...stats, pats: stats.pats + 1 }))
        await openPane($)

        return { text: `${called} is pleased.` }
      }
      case 'name': {
        const given = cleanName(rest.join(' '))

        if (given === '') {
          return { text: `${called} is listening. Name it with /pet name <name>.` }
        }

        await grow($, stats => ({ ...stats, name: given }))
        await openPane($)

        return { text: `${called} is now ${given}.` }
      }
      case 'choose': {
        const wanted = rest[0] ?? ''

        if (!(wanted in SPECIES)) {
          return { text: `Choose one of: ${Object.keys(SPECIES).join(', ')}` }
        }

        await update($, profile, last => ({ ...last, species: wanted }))
        const now = await grow($, stats => stats)
        shownLevel = levelOf(statsOf(now))
        await openPane($)

        return { text: `${calledOf(now)} is out.` }
      }
      case 'status':
        return { text: statusOf(who) }
      case 'bye':
        await $.ui.close({ id: PANE })

        return { text: `${called} went back inside.` }
      default:
        return { text: `Usage: ${['/pet', ...VERBS.map(verb => `/pet ${verb}`)].join(', ')}` }
    }
  })

  on('tool.call', async ($, e, next) => {
    unsavedTools += 1
    await update($, pet, one => act(one, 'work', 8))
    await update($, profile, who => withStats(who, stats => ({ ...stats, tools: stats.tools + 1 })))

    return next(e)
  })

  // A subagent's turn adds its tokens; only the main conversation's counts as a turn.
  on('turn.complete', async ($, e, next) => {
    const isMain = e.agentId === undefined
    const tools = unsavedTools
    const tokens = e.usage?.output_tokens ?? 0
    unsavedTools = 0

    const now = await grow($, stats => ({
      ...stats,
      tools: stats.tools + tools,
      turns: stats.turns + (isMain ? 1 : 0),
      tokens: stats.tokens + tokens,
    }))

    if (isMain) {
      await update($, pet, one => act(one, 'happy', 10))
    }
    const level = levelOf(statsOf(now))

    if (level > shownLevel) {
      $.ui.toast(`${calledOf(now)} reached Lv ${level}!`)
    }
    shownLevel = level

    return next(e)
  })

  // A rate-limit window running out is the one thing that makes it cry.
  on('session.measure', async ($, e, next) => {
    const isClose = e.rateLimits.some(limit => limit.percentUsed > WORRY_PERCENT)
    await update($, isWorried, () => isClose)

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const [one, who, isSad] = await Promise.all([read($, pet), read($, profile), read($, isWorried)])
    const stats = statsOf(who)
    const yard = Math.max(SPRITE_CELLS + HEART_CELLS, Math.min(40, e.props.bodyColumns - 2))
    const scene = toCells(paint(one, speciesOf(who), isSad, yard))
    const grass = (cells: number) => '‿'.repeat(Math.max(0, cells))
    let petView

    if (e.surface === 'terminal') {
      const { Raster } = $.ui.resolve(e)
      petView = <Raster key="pet" columns={yard} rows={scene.length} cells={pack(scene)} />
    } else {
      petView = scene.map(line => (
        <Box>
          {toRuns(line).map(({ text, ...style }) => (
            <Text {...style}>{text}</Text>
          ))}
        </Box>
      ))
    }

    return (
      <Box flexDirection="column">
        <Box>
          {stats.name !== '' && <Text color={PASTEL.pink} bold>{stats.name} </Text>}
          <Text color={PASTEL.gray}>Lv {levelOf(stats)}  </Text>
          <Text color={PASTEL.yellow}>{saysOf(one, who, isSad)}</Text>
        </Box>
        {petView}
        <Box>
          <Text color={PASTEL.green}>{grass(3)}</Text>
          <Text color={PASTEL.pink}>✿</Text>
          <Text color={PASTEL.green}>{grass(yard - 14)}</Text>
          <Text color={PASTEL.yellow}>❀</Text>
          <Text color={PASTEL.green}>{grass(9)}</Text>
        </Box>
      </Box>
    )
  })
}
