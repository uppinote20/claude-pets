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
 * @handbook 3.4-pet-run
 * @handbook 4.2-pixel-pipeline
 * @handbook 4.3-surface-branch
 * @tested tests/pet.test.ts
 */
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Pet, PetProfile, PetSize, PetStats, QuestView, RunView } from '../types'
import { DEFAULT_SIZE, SIZES, cardWidthFor, lookOf, pixelsSvg, stageOf, minWidth, pack, paint, terminalRows, toCells, toSvg } from './scene'
import { QUEST_HEIGHT, QUEST_TICK_MS, STAGES, advanceQuest, jumpQuest, newQuest, paintQuest, questScore } from './quest'
import type { Quest } from './quest'
import { RUN_HEIGHT, RUN_TICK_MS, advance, jump, newRun, paintRun, scoreOf } from './run'
import type { Run } from './run'
import { DEFAULT_SPECIES, SPECIES } from './species'
import type { Species } from './species'

const PANE = 'pets'
const PLAY = 'pets-run'
const PLAY_TITLE = 'Pet Run'
const QUEST = 'pets-quest'
const QUEST_TITLE = 'Pet Quest'
/** The Pet Run course's width bounds, in pixels (terminal columns). */
const RUN_MIN = 40
const RUN_MAX = 80
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
const XP_PER_SNACK = 1
const TOKENS_PER_XP = 1000
const XP_CURVE = 25
/** What follows `/pet`: the command's description and its usage line are both built from this. */
const VERBS = ['pat', 'name <name>', 'choose <species>', 'size <small|medium>', 'play', 'quest [stage]', 'status', 'bye'] as const
const BAR_CELLS = 5
/** The stats column beside the yard: its width, and the bar's inside it. */
const PANEL = 28
const PANEL_BAR = 20

const PASTEL = { yellow: '#ffd787', pink: '#ffafd7', green: '#afd7af', ink: '#3a2a2a', gray: '#b2b2b2', dim: '#5f5f5f' } as const
const NEWBORN: Pet = { x: 0, dir: 1, frame: 0, mood: 'walk', hold: 0, idle: 0 }
const UNMET: PetStats = { name: '', pats: 0, tools: 0, turns: 0, tokens: 0, snacks: 0, best: 0, cleared: 0 }
const STRANGER: PetProfile = { species: DEFAULT_SPECIES, size: DEFAULT_SIZE, pets: {} }

const pet = atom({ plugin: 'pets', key: 'pet' } as const, NEWBORN)
const profile = atom({ plugin: 'pets', key: 'profile' } as const, STRANGER)
const isWorried = atom({ plugin: 'pets', key: 'isWorried' } as const, false)
const runView = atom({ plugin: 'pets', key: 'run' } as const, { phase: 'ready', score: 0, snacks: 0 } as RunView)

// Pet Run's course lives here rather than in $.state: it changes twenty times a second and the
// terminal repaints it with $.ui.blit, without a redraw. `runView` carries what the text shows.
let course: Run | null = null
let ticker: { cancel: () => void } | null = null
// Redraw on every tick when a surface without Raster (desktop, VS Code, mobile) is attached.
let isRemote = false
// The level last seen for the pet that is out, so a level-up is announced once, whether it came
// from a turn, a pat or a run.
let shownLevel = 1
// Pet Quest's stage in play, as Pet Run's course.
let quest: Quest | null = null
let questTicker: { cancel: () => void } | null = null
const questView = atom({ plugin: 'pets', key: 'quest' } as const, { stage: 0, phase: 'ready', score: 0, snacks: 0 } as QuestView)

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
 * A tool call is 1, a pat 2, a finished turn 5, a Pet Run snack 1, and every thousand output tokens 1.
 * Output only: input and cache reads grow with the conversation's length, not with the work done.
 */
function xpOf(stats: PetStats): number {
  return (
    stats.tools +
    stats.turns * XP_PER_TURN +
    stats.pats * XP_PER_PAT +
    Math.floor(stats.tokens / TOKENS_PER_XP) +
    stats.snacks * XP_PER_SNACK
  )
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
    snacks: count(fields.snacks),
    best: count(fields.best),
    cleared: count(fields.cleared),
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
    ...(stats.best === 0 ? [] : [`Pet Run best ${stats.best}, ${stats.snacks} snacks`]),
    ...(stats.cleared === 0 ? [] : [`Pet Quest ${stats.cleared}/${STAGES.length} stages cleared`]),
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

function viewOf(run: Run): RunView {
  return { phase: run.phase, score: scoreOf(run), snacks: run.snacks }
}

/** Cells of the course for the terminal's Raster. */
function runCells(run: Run, who: PetProfile): string {
  return pack(toCells(paintRun(run, speciesOf(who), stageOf(levelOf(statsOf(who))))))
}

/**
 * Keeps a finished (or abandoned) run: its snacks feed the pet, its score may be the best, and a
 * level the snacks reach is announced like any other.
 */
async function keepRun($: EngineInterface, run: Run): Promise<PetProfile> {
  const score = scoreOf(run)
  const kept = await grow($, stats => ({ ...stats, snacks: stats.snacks + run.snacks, best: Math.max(stats.best, score) }))
  shownLevel = announce($, kept, shownLevel)

  return kept
}

/**
 * One tick of Pet Run: moves the course on, repaints it in place on the terminal, and
 * updates the text when the score or the phase changes. A run that just ended is kept.
 */
async function tickRun($: EngineInterface): Promise<void> {
  const run = course
  if (run === null || run.phase !== 'running') {
    return
  }
  const who = await read($, profile)
  // Closed or started over while the profile was read: that course is no longer this one to move.
  if (course !== run) {
    return
  }
  const now = advance(run, speciesOf(who))
  course = now

  void $.ui.blit({ requestId: PLAY, key: 'run', cells: runCells(now, who) })
  if (now.phase === 'over') {
    await update($, runView, () => viewOf(now))
    $.ui.toast(`${calledOf(who)} ran ${scoreOf(now)} and ate ${now.snacks} snacks.`)
    await keepRun($, now)
  } else if (isRemote || now.tick % 10 === 0) {
    await update($, runView, () => viewOf(now))
  }
}

function questViewOf(stage: Quest): QuestView {
  return { stage: stage.stage, phase: stage.phase, score: questScore(stage), snacks: stage.snacks }
}

function questCells(stage: Quest, who: PetProfile): string {
  return pack(toCells(paintQuest(stage, speciesOf(who), stageOf(levelOf(statsOf(who))))))
}

/** Keeps what a stage gave: its snacks feed the pet, and a cleared stage opens the next. */
async function keepQuest($: EngineInterface, stage: Quest): Promise<PetProfile> {
  return grow($, stats => ({
    ...stats,
    snacks: stats.snacks + stage.snacks,
    cleared: stage.phase === 'clear' ? Math.max(stats.cleared, stage.stage + 1) : stats.cleared,
  }))
}

/** One tick of Pet Quest, as `tickRun`: on, repainted in place, kept once it ends. */
async function tickQuest($: EngineInterface): Promise<void> {
  if (quest === null || quest.phase !== 'running') {
    return
  }
  const who = await read($, profile)
  const now = advanceQuest(quest)
  quest = now

  void $.ui.blit({ requestId: QUEST, key: 'quest', cells: questCells(now, who) })
  if (now.phase !== 'running') {
    await update($, questView, () => questViewOf(now))
    const kept = await keepQuest($, now)

    $.ui.toast(
      now.phase === 'clear'
        ? `Stage ${now.stage + 1} clear! ${calledOf(kept)} ate ${now.snacks} snacks.`
        : `${calledOf(kept)} will try stage ${now.stage + 1} again.`,
    )
  } else if (isRemote || now.tick % 10 === 0) {
    await update($, questView, () => questViewOf(now))
  }
}

/**
 * Toasts a level reached since `shown`, the level last seen: growing up and starting to shine
 * say so. Resolves to the level now seen.
 */
function announce($: EngineInterface, now: PetProfile, shown: number): number {
  const level = levelOf(statsOf(now))

  if (level > shown) {
    const stage = stageOf(level)
    const called = calledOf(now)

    $.ui.toast(
      stage === stageOf(shown)
        ? `${called} reached Lv ${level}!`
        : stage === 'star'
          ? `${called} is a star now! (Lv ${level})`
          : `${called} grew up! (Lv ${level})`,
    )
  }

  return level
}

export const register: Register = on => {
  // Tool calls since the last save: the store is written once a turn, not on every call.
  let unsavedTools = 0

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
        const now = await grow($, stats => ({ ...stats, pats: stats.pats + 1 }))
        shownLevel = announce($, now, shownLevel)

        return { text: `${called} is pleased.${await openPane($, now)}` }
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
      case 'play': {
        // A run still going is kept before a new one takes its place, as closing the pane would.
        const going = course
        ticker?.cancel()
        ticker = null
        course = newRun(course?.width ?? RUN_MIN, Math.floor(Math.random() * 2 ** 31))
        if (going !== null && going.phase === 'running') {
          await keepRun($, going)
        }
        isRemote = (await $.session.surfaces()).some(surface => surface !== 'terminal')
        await update($, runView, () => viewOf(course ?? newRun(RUN_MIN)))
        const opened = await $.ui.open({ id: PLAY, title: PLAY_TITLE, rows: RUN_HEIGHT / 2 + 2, focus: true, closeOnEscape: true })
        // Only a placed pane can be closed, and closing is what stops the clock.
        if (opened.isPlaced) {
          ticker = $.clock.every(RUN_TICK_MS, () => void tickRun($))
        }

        return {
          text: opened.isPlaced
            ? `${called} is ready to run: j to jump, r to start over, Esc to stop.`
            : `${called} is ready to run, but the pane is not on screen: ${opened.reason}`,
        }
      }
      case 'quest': {
        const cleared = statsOf(who).cleared
        const open = Math.min(cleared, STAGES.length - 1)
        const asked = rest[0] === undefined ? open + 1 : Number(rest[0])

        if (!Number.isInteger(asked) || asked < 1 || asked > open + 1) {
          return { text: `Stages open: 1 to ${open + 1} of ${STAGES.length}.` }
        }
        quest = newQuest(asked - 1, quest?.width ?? RUN_MIN)
        isRemote = (await $.session.surfaces()).some(surface => surface !== 'terminal')
        await update($, questView, () => questViewOf(quest ?? newQuest(0, RUN_MIN)))
        questTicker?.cancel()
        questTicker = $.clock.every(QUEST_TICK_MS, () => void tickQuest($))
        const opened = await $.ui.open({ id: QUEST, title: QUEST_TITLE, rows: QUEST_HEIGHT / 2 + 2, focus: true, closeOnEscape: true })

        return {
          text: opened.isPlaced
            ? `Stage ${asked}: j to start and jump (again while rising to go higher), r to retry, n for the next stage, Esc to stop.`
            : `Stage ${asked} is ready, but the pane is not on screen: ${opened.reason}`,
        }
      }
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
    shownLevel = announce($, now, shownLevel)

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
      const scene = paint(one, kind, who.size, columns, STEPS, { isSad, stage: stageOf(levelOf(stats)) })
      const cells = toCells(scene.pixels)
      const width = cells[0]?.length ?? 0
      const level = levelOf(stats)
      const stage = stageOf(level)
      const hasPanel = isDocked || isBeside
      const progress = progressOf(stats)
      const [filled, empty] = barOf(progress)
      const [wide, rest] = barOf(progress, PANEL_BAR)
      const yard = <Raster key="pet" columns={width} rows={cells.length} cells={pack(cells)} />
      const panel = (
        <Box flexDirection="column" width={PANEL} paddingLeft={isBeside ? 2 : 0}>
          <Text color={PASTEL.gray} dimColor>{stage === 'baby' ? kind.label.toUpperCase() : `${kind.label.toUpperCase()} · ${stage.toUpperCase()}`}</Text>
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
    const scene = paint(one, kind, who.size, across, STEPS, { isSad, withGrass: false, stage: stageOf(levelOf(stats)) })
    const caption = { name: stats.name, level: levelOf(stats), progress: progressOf(stats), says, tally }
    const alt = `${titleOf(who)}, Lv ${levelOf(stats)}${says === '' ? '' : `: ${says}`}`

    return <Svg source={toSvg(scene, who.size, caption)} alt={alt} />
  })

  // Closing Pet Run stops its clock; a run still going is kept as it stands.
  on('ui.close', { id: PLAY }, async ($, e, next) => {
    ticker?.cancel()
    ticker = null
    if (course !== null && course.phase === 'running') {
      await keepRun($, course)
    }
    course = null

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PLAY }, async ($, e) => {
    const who = await read($, profile)
    const view = await read($, runView)
    const fits = Math.max(RUN_MIN, Math.min(RUN_MAX, e.props.bodyColumns - 2))

    // A course not yet started takes the pane's width; one under way keeps its own.
    if (course === null || (course.phase === 'ready' && course.width !== fits)) {
      course = newRun(fits, course?.seed ?? 1)
    }
    const run = course
    // A run just over counts before it is kept, so both surfaces show the new best at once.
    const best = Math.max(statsOf(who).best, view.phase === 'over' ? view.score : 0)
    const hint = view.phase === 'ready' ? 'press j to start' : view.phase === 'over' ? 'ouch! r to run again' : ''
    const onJump = () => {
      if (course !== null) {
        const before = course.phase
        course = jump(course)
        if (course.phase !== before) {
          void update($, runView, () => viewOf(course ?? run))
        }
      }
    }
    const onRestart = () => {
      if (course !== null && course.phase !== 'running') {
        course = newRun(course.width, Math.floor(Math.random() * 2 ** 31))
        void update($, runView, () => viewOf(course ?? run))
      }
    }
    if (e.surface === 'terminal') {
      const { Box, Text, Raster, Button } = $.ui.resolve(e)

      return (
        <Box flexDirection="column">
          <Box>
            <Text color={PASTEL.pink} bold>{`${calledOf(who)} `}</Text>
            <Text color={PASTEL.gray}>{`score ${view.score}  best ${best}  snacks ${view.snacks}`}</Text>
            {hint !== '' && <Text color={PASTEL.yellow}>{`  ${hint}`}</Text>}
          </Box>
          <Raster key="run" columns={run.width} rows={RUN_HEIGHT / 2} cells={runCells(run, who)} />
          <Box gap={1}>
            <Button key="jump" hotkey="j" plain onPress={onJump}>Jump</Button>
            <Button key="restart" hotkey="r" plain onPress={onRestart}>Again</Button>
          </Box>
        </Box>
      )
    }

    const { Box, Text, Svg, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text>{`${calledOf(who)} · score ${view.score} · best ${best} · snacks ${view.snacks}${hint === '' ? '' : ` · ${hint}`}`}</Text>
        <Svg source={pixelsSvg(paintRun(run, speciesOf(who), stageOf(levelOf(statsOf(who)))), 6)} alt={`Pet Run, score ${view.score}`} />
        <Box gap={1}>
          <Button key="jump" hotkey="j" onPress={onJump}>Jump</Button>
          <Button key="restart" hotkey="r" onPress={onRestart}>Again</Button>
        </Box>
      </Box>
    )
  })

  on('ui.close', { id: QUEST }, async ($, e, next) => {
    questTicker?.cancel()
    questTicker = null
    if (quest !== null && quest.phase === 'running') {
      await keepQuest($, quest)
    }
    quest = null

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: QUEST }, async ($, e) => {
    const who = await read($, profile)
    const view = await read($, questView)
    const fits = Math.max(RUN_MIN, Math.min(RUN_MAX, e.props.bodyColumns - 2))

    if (quest === null || (quest.phase === 'ready' && quest.width !== fits)) {
      quest = newQuest(quest?.stage ?? view.stage, fits)
    }
    const stage = quest
    const hasNext = view.phase === 'clear' && stage.stage + 1 < STAGES.length
    const hint =
      view.phase === 'ready'
        ? 'press j to start'
        : view.phase === 'over'
          ? 'oops! r to retry'
          : view.phase === 'clear'
            ? hasNext
              ? 'clear! n for the next stage'
              : 'all stages clear!'
            : ''
    const onJump = () => {
      if (quest !== null) {
        const before = quest.phase
        quest = jumpQuest(quest)
        if (quest.phase !== before) {
          void update($, questView, () => questViewOf(quest ?? stage))
        }
      }
    }
    const restart = (index: number) => {
      if (quest !== null && quest.phase !== 'running') {
        quest = newQuest(index, quest.width)
        void update($, questView, () => questViewOf(quest ?? stage))
      }
    }
    const onRetry = () => restart(quest?.stage ?? 0)
    const onNext = () => {
      if (quest !== null && quest.phase === 'clear' && quest.stage + 1 < STAGES.length) {
        restart(quest.stage + 1)
      }
    }
    const line = `stage ${view.stage + 1}/${STAGES.length}  score ${view.score}  snacks ${view.snacks}`

    if (e.surface === 'terminal') {
      const { Box, Text, Raster, Button } = $.ui.resolve(e)

      return (
        <Box flexDirection="column">
          <Box>
            <Text color={PASTEL.pink} bold>{`${calledOf(who)} `}</Text>
            <Text color={PASTEL.gray}>{line}</Text>
            {hint !== '' && <Text color={PASTEL.yellow}>{`  ${hint}`}</Text>}
          </Box>
          <Raster key="quest" columns={stage.width} rows={QUEST_HEIGHT / 2} cells={questCells(stage, who)} />
          <Box gap={1}>
            <Button key="jump" hotkey="j" plain onPress={onJump}>Jump</Button>
            <Button key="retry" hotkey="r" plain onPress={onRetry}>Retry</Button>
            <Button key="next" hotkey="n" plain onPress={onNext}>Next</Button>
          </Box>
        </Box>
      )
    }

    const { Box, Text, Svg, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text>{`${calledOf(who)} · ${line}${hint === '' ? '' : ` · ${hint}`}`}</Text>
        <Svg source={pixelsSvg(paintQuest(stage, speciesOf(who), stageOf(levelOf(statsOf(who)))), 5)} alt={`Pet Quest stage ${view.stage + 1}`} />
        <Box gap={1}>
          <Button key="jump" hotkey="j" onPress={onJump}>Jump</Button>
          <Button key="retry" hotkey="r" onPress={onRetry}>Retry</Button>
          <Button key="next" hotkey="n" onPress={onNext}>Next</Button>
        </Box>
      </Box>
    )
  })
}
