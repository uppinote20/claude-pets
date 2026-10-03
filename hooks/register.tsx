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

import type { Pet, PetProfile, PetSize, PetStats } from '../types'
import { DEFAULT_SIZE, SIZES, cardWidthFor, lookOf, minWidth, pack, paint, terminalRows, toCells, toSvg } from './scene'
import { DEFAULT_SPECIES, SPECIES } from './species'
import type { Species } from './species'

const PANE = 'pets'
const TITLE = 'Pet'
const PROFILE_KEY = 'profile'
const NAME_LIMIT = 20
const TICK_MS = 600
const STEPS = 20
const NAP_AFTER = 200
const WORRY_PERCENT = 80
/** The widest yard, in sprite pixels: room to roam above a wide prompt, and the SVG card's, where wider leaves the pet lost on it. */
const MAX_YARD = 80
/** The widest the SVG card grows to fill the slot, in sprite pixels. A tally line that needs more still widens it. */
const MAX_CARD = 30
/** The terminal's cell, in CSS pixels of a remote surface's code font, roughly. */
const CELL_PX = 8
const XP_PER_TURN = 5
const XP_PER_PAT = 2
const TOKENS_PER_XP = 1000
const XP_CURVE = 25
/** What follows `/pet`: the command's description and its usage line are both built from this. */
const VERBS = ['pat', 'name <name>', 'choose <species>', 'size <small|medium>', 'status', 'bye'] as const
const BAR_CELLS = 5
/** The stats column beside the yard: its width, and the bar's inside it. */
const PANEL = 28
const PANEL_BAR = 20

const PASTEL = { yellow: '#ffd787', pink: '#ffafd7', green: '#afd7af', ink: '#3a2a2a', gray: '#b2b2b2', dim: '#5f5f5f' } as const
const NEWBORN: Pet = { x: 0, dir: 1, frame: 0, mood: 'walk', hold: 0, idle: 0 }
const UNMET: PetStats = { name: '', pats: 0, tools: 0, turns: 0, tokens: 0 }
const STRANGER: PetProfile = { species: DEFAULT_SPECIES, size: DEFAULT_SIZE, pets: {} }

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

/** `초코 the cat`, or `The cat` while it has no name. */
function titleOf(who: PetProfile): string {
  const { name } = statsOf(who)

  return name === '' ? `The ${speciesOf(who).label}` : `${name} the ${speciesOf(who).label}`
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

/** How far it is from this level to the next, 0 to 1. */
function progressOf(stats: PetStats): number {
  const level = levelOf(stats)
  const from = XP_CURVE * (level - 1) ** 2
  const to = XP_CURVE * level ** 2

  return (xpOf(stats) - from) / (to - from)
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
  const size = isSize(kept.size) ? kept.size : DEFAULT_SIZE

  // 0.1.0 before per-pet levels kept one pet's fields beside `species`.
  if (!isRecord(kept.pets)) {
    return { species, size, pets: { [species]: toStats(kept) } }
  }

  const pets: Record<string, PetStats> = {}

  for (const [kind, fields] of Object.entries(kept.pets)) {
    if (kind in SPECIES && isRecord(fields)) {
      pets[kind] = toStats(fields)
    }
  }

  return { species, size, pets }
}

function isSize(value: unknown): value is PetSize {
  return typeof value === 'string' && (SIZES as readonly string[]).includes(value)
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
    `${titleOf(who)} · Lv ${level} · ${xpOf(stats)} xp (next at ${XP_CURVE * level * level})`,
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

  const x = Math.min(STEPS, Math.max(0, one.x + one.dir))
  const dir = x === 0 ? 1 : x === STEPS ? -1 : one.dir

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

/** The bar beside the level: filled cells for the way to the next one. */
function barOf(progress: number, cells = BAR_CELLS): [string, string] {
  const filled = Math.min(cells, Math.max(0, Math.floor(progress * cells)))

  return ['━'.repeat(filled), '━'.repeat(cells - filled)]
}

/** What it has lived through, as the stats rows show it: label, count, and what one is worth. */
function tallyOf(stats: PetStats): [string, string, string][] {
  return [
    ['tool calls', String(stats.tools), '+1'],
    ['turns', String(stats.turns), `+${XP_PER_TURN}`],
    ['pats', String(stats.pats), `+${XP_PER_PAT}`],
    ['output tokens', compact(stats.tokens), '1K +1'],
  ]
}

/** The same in one line, for the SVG card. */
function tallyLine(stats: PetStats): string {
  return `${stats.tools} tools · ${stats.turns} turns · ${stats.pats} pats · ${compact(stats.tokens)} tokens`
}

/**
 * Opens the pane, asking for the rows its size draws: the yard and the line above it.
 * Resolves to what the reply should add: nothing once drawn, else why it waits undrawn
 * (a surface that places no panes), so `/pet` never claims a pet nobody can see.
 */
async function openPane($: EngineInterface, who: PetProfile): Promise<string> {
  const opened = await $.ui.open({ id: PANE, title: TITLE, rows: terminalRows(speciesOf(who), who.size) + 1 })

  return opened.isPlaced ? '' : ` The pane is not on screen: ${opened.reason}`
}

/**
 * Applies `change` to the pet that is out and keeps the result, with the species and size
 * this session chose, across sessions.
 * It reads the store first, so what another session saved meanwhile is added to, not overwritten.
 */
async function grow($: EngineInterface, change: (stats: PetStats) => PetStats): Promise<PetProfile> {
  const { species, size } = await read($, profile)
  const now = withStats({ ...toProfile(await $.store.get(PROFILE_KEY)), species, size }, change)
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
        return { text: `${called} is out.${await openPane($, who)}` }
      case 'pat': {
        await update($, pet, one => act(one, 'love', 8))
        const unseen = await openPane($, await grow($, stats => ({ ...stats, pats: stats.pats + 1 })))

        return { text: `${called} is pleased.${unseen}` }
      }
      case 'name': {
        const given = cleanName(rest.join(' '))

        if (given === '') {
          return { text: `${called} is listening. Name it with /pet name <name>.` }
        }

        const unseen = await openPane($, await grow($, stats => ({ ...stats, name: given })))

        return { text: `${called} is now ${given}.${unseen}` }
      }
      case 'choose': {
        const wanted = rest[0] ?? ''

        if (!(wanted in SPECIES)) {
          return { text: `Choose one of: ${Object.keys(SPECIES).join(', ')}` }
        }

        await update($, profile, last => ({ ...last, species: wanted }))
        const now = await grow($, stats => stats)
        shownLevel = levelOf(statsOf(now))
        return { text: `${calledOf(now)} is out.${await openPane($, now)}` }
      }
      case 'size': {
        const wanted = rest[0] ?? ''

        if (!isSize(wanted)) {
          return { text: `${called} is ${who.size}. Choose one of: ${SIZES.join(', ')}` }
        }

        await update($, profile, last => ({ ...last, size: wanted }))
        const unseen = await openPane($, await grow($, stats => stats))

        return { text: `${called} is ${wanted} now.${unseen}` }
      }
      case 'status':
        return { text: statusOf(who) }
      case 'bye':
        await $.ui.close({ id: PANE })

        return { text: `${called} went back inside.` }
      default:
        return { text: `Usage: ${['/pet', ...VERBS.map(form => `/pet ${form}`)].join(', ')}` }
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
    const [one, who, isSad] = await Promise.all([read($, pet), read($, profile), read($, isWorried)])
    const kind = speciesOf(who)
    const stats = statsOf(who)
    const says = saysOf(one, who, isSad)
    const { unit } = lookOf(who.size)
    const fewest = minWidth(kind, who.size)

    if (e.surface === 'terminal') {
      const { Box, Text, Raster } = $.ui.resolve(e)
      // Stats go beside the yard above a wide prompt, under it in the tall, narrow dock,
      // and nowhere when neither has room: then the level line carries them.
      const isDocked = e.props.placement === 'dock'
      const isBeside = !isDocked && e.props.bodyColumns >= fewest + PANEL + 4
      const room = isBeside ? e.props.bodyColumns - PANEL - 4 : e.props.bodyColumns - 2
      const columns = Math.max(fewest, Math.min(MAX_YARD, room))
      const scene = paint(one, kind, who.size, isSad, columns, STEPS)
      const cells = toCells(scene.pixels)
      const width = cells[0]?.length ?? 0
      const level = levelOf(stats)
      const hasPanel = isDocked || isBeside
      const progress = progressOf(stats)
      const [filled, empty] = barOf(progress)
      const [wide, rest] = barOf(progress, PANEL_BAR)
      const yard = <Raster key="pet" columns={width} rows={cells.length} cells={pack(cells)} />
      const panel = (
        <Box flexDirection="column" width={PANEL} paddingLeft={isBeside ? 2 : 0}>
          <Text color={PASTEL.gray} dimColor>{kind.label.toUpperCase()}</Text>
          <Box>
            <Text color={PASTEL.pink} bold>{`Lv ${level}`}</Text>
            <Text color={PASTEL.gray}>{`  ${xpOf(stats)} / ${XP_CURVE * level * level} xp`}</Text>
          </Box>
          <Box>
            <Text color={PASTEL.pink}>{wide}</Text>
            <Text color={PASTEL.dim}>{rest}</Text>
          </Box>
          {who.size === 'small' ? (
            <>
              <Text color={PASTEL.gray}>{`${stats.tools} tools · ${stats.turns} turns`}</Text>
              <Text color={PASTEL.gray}>{`${stats.pats} pats · ${compact(stats.tokens)} tokens`}</Text>
            </>
          ) : (
            tallyOf(stats).map(([label, value, worth]) => (
              <Box key={label}>
                <Text color={PASTEL.gray}>{label.padEnd(14)}</Text>
                <Text>{value.padStart(6)}</Text>
                <Text color={PASTEL.green}>{`  ${worth}`}</Text>
              </Box>
            ))
          )}
        </Box>
      )

      return (
        <Box flexDirection="column">
          <Box>
            {stats.name !== '' && (
              <Text backgroundColor={PASTEL.pink} color={PASTEL.ink} bold>
                {` ${stats.name} `}
              </Text>
            )}
            {!hasPanel && <Text color={PASTEL.gray}>{` Lv ${level} `}</Text>}
            {!hasPanel && <Text color={PASTEL.pink}>{filled}</Text>}
            {!hasPanel && <Text color={PASTEL.dim}>{empty}</Text>}
            {says !== '' && <Text color={PASTEL.yellow}>{`  ${says}`}</Text>}
          </Box>
          {isBeside ? (
            <Box>
              {yard}
              {panel}
            </Box>
          ) : (
            yard
          )}
          {isDocked && <Box marginTop={1}>{panel}</Box>}
        </Box>
      )
    }

    // Desktop, VS Code and mobile draw an SVG card: half blocks in a proportional line
    // height leave seams between rows, and an SVG scales to the slot's width.
    const { Svg } = $.ui.resolve(e)
    const tally = tallyLine(stats)
    const across = Math.max(fewest, cardWidthFor(who.size, tally), Math.min(MAX_CARD, Math.floor((e.props.bodyColumns * CELL_PX) / unit) - 4))
    const scene = paint(one, kind, who.size, isSad, across, STEPS, false)
    const caption = { name: stats.name, level: levelOf(stats), progress: progressOf(stats), says, tally }
    const alt = `${titleOf(who)}, Lv ${levelOf(stats)}${says === '' ? '' : `: ${says}`}`

    return <Svg source={toSvg(scene, who.size, caption)} alt={alt} />
  })
}
