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
 * @handbook 3.5-pet-quest
 * @handbook 3.6-luck
 * @handbook 3.7-nature-rhythm
 * @handbook 4.2-pixel-pipeline
 * @handbook 4.3-surface-branch
 * @tested tests/pet.test.ts
 */
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Pet, PetProfile, PetSize, PetStats, QuestView, RunView } from '../types'
import { artOf } from './art'
import type { Art } from './art'
import { DEFAULT_SIZE, SIZES, STAGE_LEVELS, cardWidthFor, lookOf, pixelsSvg, stageOf, toRgba, minWidth, pack, paint, terminalRows, toCells, toSvg } from './scene'
import { QUEST_HEIGHT, QUEST_TICK_MS, STAGES, advanceQuest, jumpQuest, newQuest, paintQuest, questScore } from './quest'
import type { Quest } from './quest'
import type { Form } from './scene'
import { DAYPARTS, SIDES, daypartOf, driftLeaning, isKnown, lifetimeLeaning, musingOf, natureOf, reformOf, rhythmOf } from './nature'
import type { Daypart, Nature, Side } from './nature'
import { GIFT_CHANCE, LUCKY_PAT_CHANCE, RARE_CHANCE, SHINY_CHANCE, giftOf, worthOf } from './luck'
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
const UNMET: PetStats = { name: '', pats: 0, tools: 0, turns: 0, tokens: 0, snacks: 0, best: 0, cleared: 0, gifts: 0, bonus: 0, shiny: false, hours: [0, 0, 0, 0], form: '', leaning: [], day: '', brought: [0, 0, 0, 0] }
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
// Whether the terminal draws images (kitty, Ghostty), read once a session from its variables.
let isImageTerminal = false
// The `art` setting: 'pixel' keeps half blocks everywhere.
let wantsArt = true

/**
 * The hi-res art to draw the pet in, where there is some for its species and stage: not for a
 * shiny or a rare adult, whose colors the art does not have yet.
 */
function artFor(who: PetProfile): Art | undefined {
  const stats = statsOf(who)
  const stage = stageOf(levelOf(stats))

  return wantsArt && !stats.shiny && !(stage === 'adult' && formOf(stats) === 'rare') ? artOf(who.species, stage) : undefined
}
// The `luck` setting, as register last read it: the rare form is luck too.
let isLuckOn = true
const FORMS: readonly string[] = ['worker', 'scholar', 'sweetie', 'gamer', 'curious', 'rare'] satisfies readonly Form[]

function isForm(value: string): value is Form {
  return FORMS.includes(value)
}

/** An adult's form: as kept, else what it would become now. */
function formOf(stats: PetStats): Form {
  return isForm(stats.form) ? stats.form : natureOf(stats)
}

/** The leaning the yard shows: none until the pet knows you, then the kept one (or its life's). */
function yardLeaning(stats: PetStats): readonly number[] {
  if (!isKnown(stats)) {
    return []
  }

  return stats.leaning.length === SIDES.length ? stats.leaning : lifetimeLeaning(stats)
}

/** `scholar`, or for the rare form its own name (`celestial`). */
function formName(kind: Species, form: Form): string {
  return form === 'rare' ? kind.rare.name : form
}
// The host's offset from UTC in minutes: the module's own clock is UTC, so `date` says.
let utcOffset = 0
// The engine's clock as of the last tick (tests move it with mock.clock).
let clockNow = Date.now()

/** The person's local date, `YYYY-MM-DD`: the leaning moves once a day. */
function dayNow(): string {
  return new Date(clockNow + utcOffset * 60_000).toISOString().slice(0, 10)
}

/**
 * Tallies what something brought into the day's count; when the day has changed, first moves
 * the leaning toward the day before and lets an adult follow it.
 */
function tally(stats: PetStats, brought: Readonly<Record<Side, number>>, today: string): PetStats {
  const isNewDay = stats.day !== '' && stats.day !== today
  const start = stats.leaning.length === SIDES.length ? stats.leaning : lifetimeLeaning(stats)
  const leaning = isNewDay
    ? driftLeaning(start, Object.fromEntries(SIDES.map((side, at) => [side, stats.brought[at] ?? 0])) as Record<Side, number>)
    : start
  const kept = isNewDay ? [0, 0, 0, 0] : stats.brought

  return {
    ...stats,
    leaning,
    form: isNewDay ? reformOf(stats.form, leaning) : stats.form,
    day: today,
    brought: SIDES.map((side, at) => (kept[at] ?? 0) + brought[side]),
  }
}

/** The quarter of the day it is where the person is. */
function daypartNow(): Daypart {
  return daypartOf(new Date(clockNow + utcOffset * 60_000).getUTCHours())
}
// Pet Quest's stage in play, as Pet Run's course.
let quest: Quest | null = null
let questTicker: { cancel: () => void } | null = null
const questView = atom({ plugin: 'pets', key: 'quest' } as const, { stage: 0, phase: 'ready', score: 0, snacks: 0 } as QuestView)

/** The species of the pet that is out, in its shiny colors when it is one. */
function speciesOf(who: PetProfile): Species {
  const kind = SPECIES[who.species] ?? SPECIES[DEFAULT_SPECIES]!

  return who.pets[who.species]?.shiny === true ? { ...kind, ink: { ...kind.ink, ...kind.shiny } } : kind
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
  const { name, shiny } = statsOf(who)
  const label = `${shiny ? 'shiny ' : ''}${speciesOf(who).label}`

  return name === '' ? `The ${label}` : `${name} the ${label}`
}

/**
 * A tool call is 1, a pat 2, a finished turn 5, a game snack 1, every thousand output tokens 1,
 * and whatever luck brought (gifts, lucky pats).
 * Output only: input and cache reads grow with the conversation's length, not with the work done.
 */
function xpOf(stats: PetStats): number {
  return (
    stats.tools +
    stats.turns * XP_PER_TURN +
    stats.pats * XP_PER_PAT +
    Math.floor(stats.tokens / TOKENS_PER_XP) +
    stats.snacks * XP_PER_SNACK +
    stats.bonus
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
    gifts: count(fields.gifts),
    bonus: count(fields.bonus),
    shiny: fields.shiny === true,
    hours: DAYPARTS.map((_, at) => count(Array.isArray(fields.hours) ? fields.hours[at] : 0)),
    form: typeof fields.form === 'string' && isForm(fields.form) ? fields.form : '',
    leaning:
      Array.isArray(fields.leaning) && fields.leaning.length === SIDES.length && fields.leaning.every(share => typeof share === 'number' && share >= 0 && share <= 1)
        ? (fields.leaning as number[])
        : [],
    day: typeof fields.day === 'string' && /^\d{4}-\d\d-\d\d$/.test(fields.day) ? fields.day : '',
    brought: SIDES.map((_, at) => (Array.isArray(fields.brought) && typeof fields.brought[at] === 'number' && fields.brought[at] >= 0 ? fields.brought[at] : 0)),
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
    ...(stats.best === 0 ? [] : [`Pet Run best ${stats.best}`]),
    ...(stats.cleared === 0 ? [] : [`Pet Quest ${stats.cleared}/${STAGES.length} stages cleared`]),
    // Snacks from both games, one count.
    ...(stats.snacks === 0 ? [] : [`${stats.snacks} snacks`]),
    ...(stats.gifts === 0 ? [] : [`${stats.gifts} gifts found`]),
    `${natureLine(stats)}`,
    ...(others.length === 0 ? [] : [`Also: ${others.join(', ')}`]),
  ].join(' · ')
}

/** Its nature, and its rhythm once it shows: `worker · night owl`. */
function natureLine(stats: PetStats): string {
  const rhythm = rhythmOf(stats.hours)

  return `${natureOf(stats)}${rhythm === null ? '' : ` · ${rhythm}`}`
}

/** What a typed name is kept as: one line, no control characters, at most `NAME_LIMIT` characters. */
function cleanName(typed: string): string {
  return [...typed.replace(/\p{Cc}/gu, ' ').trim()].slice(0, NAME_LIMIT).join('')
}

function act(one: Pet, mood: Pet['mood'], hold: number): Pet {
  return { ...one, mood, hold, idle: 0 }
}

/** One tick: a held mood runs out, a quiet session naps, else it paces. */
/**
 * One tick, by its nature: a scholar ambles and stops to read, a gamer runs, a sweetie
 * pauses for a heart. Pauses keep counting toward its nap.
 */
function step(one: Pet, nature: Nature = 'curious'): Pet {
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

  const idle = one.idle + 1
  if (nature === 'scholar' && frame % 40 === 0) {
    return { ...one, frame, mood: 'work', hold: 6, idle }
  }
  if (nature === 'sweetie' && frame % 30 === 0) {
    return { ...one, frame, mood: 'love', hold: 4, idle }
  }
  const pace = nature === 'scholar' ? (frame % 2 === 0 ? 1 : 0) : nature === 'gamer' && frame % 3 === 0 ? 2 : 1
  const x = Math.min(STEPS, Math.max(0, one.x + one.dir * pace))
  const dir = x === 0 ? 1 : x === STEPS ? -1 : one.dir

  return { ...one, frame, x, dir, mood: 'walk', idle }
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
    case 'gift':
      return 'a gift!'
    case 'walk': {
      if (isSad) {
        return 'limits are close…'
      }
      // Now and then it muses, by its nature and the hour.
      return one.frame % 40 < 6 && one.frame > 0 ? musingOf(natureOf(statsOf(who)), daypartNow(), Math.floor(one.frame / 40)) : ''
    }
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
  // The form is settled the first time it is seen at Lv 40: its nature then, or by luck the rare one.
  const settle = (stats: PetStats): PetStats =>
    stats.form === '' && levelOf(stats) >= STAGE_LEVELS.adult
      ? { ...stats, form: isLuckOn && Math.random() < RARE_CHANCE ? 'rare' : natureOf(stats) }
      : stats
  const now = withStats({ ...toProfile(await $.store.get(PROFILE_KEY)), species, size }, stats => settle(change(stats)))
  await $.store.set(PROFILE_KEY, now)
  await update($, profile, () => now)

  return now
}

/**
 * Grows the pet that is out and tallies what the change brought into today's leaning, as it is
 * kept: pats, game snacks and turns each count the moment they are saved, so none is missed
 * between turns or sessions. An adult that follows a new day's leaning says so.
 */
async function growTallied($: EngineInterface, change: (stats: PetStats) => PetStats, brought: Partial<Record<Side, number>>): Promise<PetProfile> {
  let reformed = ''
  const now = await grow($, stats => {
    const tallied = tally(stats, { worker: 0, scholar: 0, sweetie: 0, gamer: 0, ...brought }, dayNow())
    reformed = tallied.form !== stats.form ? tallied.form : ''

    return change(tallied)
  })
  if (reformed !== '') {
    $.ui.toast(`${calledOf(now)} took after you: a ${reformed} ${speciesOf(now).label} now.`)
  }

  return now
}

/** The pet's own tick: a step by its nature. */
async function tickPet($: EngineInterface): Promise<void> {
  const nature = natureOf(statsOf(await read($, profile)))
  clockNow = await $.clock.now()

  await update($, pet, one => step(one, nature))
}

function viewOf(run: Run): RunView {
  return { phase: run.phase, score: scoreOf(run), snacks: run.snacks }
}

/** Cells of the course for the terminal's Raster. */
function runCells(run: Run, who: PetProfile): string {
  return pack(toCells(paintRun(run, speciesOf(who), stageOf(levelOf(statsOf(who))), formOf(statsOf(who)))))
}

/**
 * Keeps a finished (or abandoned) run: its snacks feed the pet, its score may be the best, and a
 * level the snacks reach is announced like any other.
 */
async function keepRun($: EngineInterface, run: Run): Promise<PetProfile> {
  const score = scoreOf(run)
  const kept = await growTallied($, stats => ({ ...stats, snacks: stats.snacks + run.snacks, best: Math.max(stats.best, score) }), { gamer: run.snacks * XP_PER_SNACK })
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
  return pack(toCells(paintQuest(stage, speciesOf(who), stageOf(levelOf(statsOf(who))), formOf(statsOf(who)))))
}

/**
 * Keeps what a stage gave: its snacks feed the pet, a cleared stage opens the next, and a level
 * the snacks reach is announced like any other.
 */
async function keepQuest($: EngineInterface, stage: Quest): Promise<PetProfile> {
  const kept = await growTallied(
    $,
    stats => ({
      ...stats,
      snacks: stats.snacks + stage.snacks,
      cleared: stage.phase === 'clear' ? Math.max(stats.cleared, stage.stage + 1) : stats.cleared,
    }),
    { gamer: stage.snacks * XP_PER_SNACK },
  )
  shownLevel = announce($, kept, shownLevel)

  return kept
}

/**
 * Keeps a run or a stage still going and sets it back to the start, before the pet that earned
 * it stops being the one out.
 */
async function settleGames($: EngineInterface): Promise<void> {
  const run = course
  const stage = quest

  if (run !== null && run.phase === 'running') {
    course = newRun(run.width, Math.floor(Math.random() * 2 ** 31))
    await update($, runView, () => viewOf(course ?? run))
    await keepRun($, run)
  }
  if (stage !== null && stage.phase === 'running') {
    quest = newQuest(stage.stage, stage.width)
    await update($, questView, () => questViewOf(quest ?? stage))
    await keepQuest($, stage)
  }
}

/** One tick of Pet Quest, as `tickRun`: on, repainted in place, kept once it ends. */
async function tickQuest($: EngineInterface): Promise<void> {
  const stage = quest
  if (stage === null || stage.phase !== 'running') {
    return
  }
  const who = await read($, profile)
  // Closed or started over while the profile was read: that stage is no longer this one to move.
  if (quest !== stage) {
    return
  }
  const now = advanceQuest(stage)
  quest = now

  void $.ui.blit({ requestId: QUEST, key: 'quest', cells: questCells(now, who) })
  if (now.phase !== 'running') {
    await update($, questView, () => questViewOf(now))
    $.ui.toast(
      now.phase === 'clear'
        ? `Stage ${now.stage + 1} clear! ${calledOf(who)} ate ${now.snacks} snacks.`
        : `${calledOf(who)} will try stage ${now.stage + 1} again.`,
    )
    await keepQuest($, now)
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
        : stage === 'adult'
          ? `${called} evolved into a ${formName(speciesOf(now), formOf(statsOf(now)))} ${speciesOf(now).label}! (Lv ${level})`
          : `${called} grew into a teen! (Lv ${level})`,
    )
  }

  return level
}

export const register: Register = (on, options) => {
  // Off, nothing is left to chance: no gifts, no lucky pats, no shiny pets, no rare forms.
  const hasLuck = options.luck !== false
  isLuckOn = hasLuck
  wantsArt = options.art !== 'pixel'
  const lucky = (chance: number) => hasLuck && Math.random() < chance

  // Tool calls since the last save: the store is written once a turn, not on every call.
  let unsavedTools = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pet',
      description: `Let your pixel pet out; /pet ${VERBS.join(', ')}`,
    })
    const kept = toProfile(await $.store.get(PROFILE_KEY))
    await update($, profile, () => kept)
    // The pet out is met here when nothing was kept of it yet (the very first cat), so it gets the
    // same one roll at being shiny that `/pet choose` gives a pet met for the first time.
    const met = kept.species in kept.pets ? kept : await grow($, stats => (lucky(SHINY_CHANCE) ? { ...stats, shiny: true } : stats))
    shownLevel = levelOf(statsOf(met))
    try {
      const { exitCode, stdout } = await $.process.run(['date', '+%z'], { timeoutMs: 2000 })
      const offset = /^([+-])(\d\d)(\d\d)/.exec(stdout.trim())
      if (exitCode === 0 && offset !== null) {
        utcOffset = (offset[1] === '-' ? -1 : 1) * (Number(offset[2]) * 60 + Number(offset[3]))
      }
    } catch {
      // No `date` (Windows): the hours are UTC's.
    }
    try {
      const term = (await $.env.get('TERM')) ?? ''
      const program = (await $.env.get('TERM_PROGRAM')) ?? ''
      isImageTerminal = term.includes('kitty') || program.toLowerCase() === 'ghostty' || term.includes('ghostty')
    } catch {
      // Unknown: half blocks, which every terminal draws.
      isImageTerminal = false
    }
    $.clock.every(TICK_MS, () => void tickPet($))

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
        const isLucky = lucky(LUCKY_PAT_CHANCE)
        await update($, pet, one => act(one, 'love', 8))
        const now = await growTallied($, stats => ({ ...stats, pats: stats.pats + 1, bonus: stats.bonus + (isLucky ? XP_PER_PAT * 2 : 0) }), { sweetie: XP_PER_PAT })
        shownLevel = announce($, now, shownLevel)

        return { text: `${called} is pleased.${isLucky ? ` Lucky pat! +${XP_PER_PAT * 3} xp` : ''}${await openPane($, now)}` }
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

        // What a game in progress earned belongs to the pet that played it.
        await settleGames($)
        // A pet met for the first time may be a rare shiny.
        const isNew = !(wanted in who.pets)
        const isShiny = isNew && lucky(SHINY_CHANCE)
        await update($, profile, last => ({ ...last, species: wanted }))
        const now = await grow($, stats => (isShiny ? { ...stats, shiny: true } : stats))
        shownLevel = levelOf(statsOf(now))

        return { text: `${calledOf(now)} is out.${isShiny ? ` A shiny ${wanted}! It is rare: one in ${Math.round(1 / SHINY_CHANCE)}.` : ''}${await openPane($, now)}` }
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
        // A stage still going is kept before another takes its place, as closing the pane would.
        const going = quest
        questTicker?.cancel()
        questTicker = null
        quest = newQuest(asked - 1, quest?.width ?? RUN_MIN)
        if (going !== null && going.phase === 'running') {
          await keepQuest($, going)
        }
        isRemote = (await $.session.surfaces()).some(surface => surface !== 'terminal')
        await update($, questView, () => questViewOf(quest ?? newQuest(0, RUN_MIN)))
        const opened = await $.ui.open({ id: QUEST, title: QUEST_TITLE, rows: QUEST_HEIGHT / 2 + 2, focus: true, closeOnEscape: true })
        // Only a placed pane can be closed, and closing is what stops the clock.
        if (opened.isPlaced) {
          questTicker = $.clock.every(QUEST_TICK_MS, () => void tickQuest($))
        }

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

    // Now and then a finished turn of the main conversation turns up a gift.
    const gift = isMain && lucky(GIFT_CHANCE) ? giftOf(Math.random()) : null
    const part = daypartNow()
    let worth = { xp: 0, makesShiny: false }
    // The turn adds its tools and its own work to the day's tally (pats and snacks count as they are kept).
    const now = await growTallied(
      $,
      stats => {
        worth = gift === null ? worth : worthOf(gift, stats.shiny)

        return {
          ...stats,
          tools: stats.tools + tools,
          turns: stats.turns + (isMain ? 1 : 0),
          tokens: stats.tokens + tokens,
          gifts: stats.gifts + (gift === null ? 0 : 1),
          bonus: stats.bonus + worth.xp,
          shiny: stats.shiny || worth.makesShiny,
          hours: isMain ? stats.hours.map((count, at) => (DAYPARTS[at] === part ? count + 1 : count)) : stats.hours,
        }
      },
      { worker: tools, scholar: (isMain ? XP_PER_TURN : 0) + tokens / TOKENS_PER_XP },
    )

    if (gift !== null) {
      await update($, pet, one => act(one, 'gift', 12))
      $.ui.toast(
        worth.makesShiny
          ? `${calledOf(now)} found a sparkle stone and turned shiny!`
          : `${calledOf(now)} found ${gift.kind === 'xp' ? gift.name : 'another sparkle stone'}! +${worth.xp} xp`,
      )
    } else if (isMain) {
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
      const { Box, Text, Raster, Image } = $.ui.resolve(e)
      // In kitty and Ghostty the pet can be its hi-res art, the yard an image of the same cells.
      const art = isImageTerminal ? artFor(who) : undefined
      // Stats go beside the yard above a wide prompt, under it in the tall, narrow dock,
      // and nowhere when neither has room: then the level line carries them.
      const isDocked = e.props.placement === 'dock'
      const isBeside = !isDocked && e.props.bodyColumns >= fewest + PANEL + 4
      const room = isBeside ? e.props.bodyColumns - PANEL - 4 : e.props.bodyColumns - 2
      const columns = Math.max(fewest, Math.min(MAX_YARD, room))
      const scene = paint(one, kind, who.size, columns, STEPS, { isSad, stage: stageOf(levelOf(stats)), form: formOf(stats), nature: natureOf(stats), daypart: daypartNow(), leaning: yardLeaning(stats), ...(art === undefined ? {} : { art }) })
      const cells = toCells(scene.pixels)
      const width = cells[0]?.length ?? 0
      const level = levelOf(stats)
      const stage = stageOf(level)
      const hasPanel = isDocked || isBeside
      const progress = progressOf(stats)
      const [filled, empty] = barOf(progress)
      const [wide, rest] = barOf(progress, PANEL_BAR)
      const yard =
        scene.pet === undefined ? (
          <Raster key="pet" columns={width} rows={cells.length} cells={pack(cells)} />
        ) : (
          <Image key="pet" source={toRgba(scene)} columns={width} rows={cells.length} alt={`${titleOf(who)}, Lv ${levelOf(stats)}`} />
        )
      const panel = (
        <Box flexDirection="column" width={PANEL} paddingLeft={isBeside ? 2 : 0}>
          <Text color={PASTEL.gray} dimColor>{`${kind.label.toUpperCase()}${stats.shiny ? ' ✦' : ''}${stage === 'baby' ? '' : stage === 'teen' ? ' · TEEN' : ` · ${formName(kind, formOf(stats)).toUpperCase()}`}`}</Text>
          <Box>
            <Text color={PASTEL.pink} bold>{`Lv ${level}`}</Text>
            <Text color={PASTEL.gray}>{`  ${xpOf(stats)} / ${XP_CURVE * level * level} xp`}</Text>
          </Box>
          <Box>
            <Text color={PASTEL.pink}>{wide}</Text>
            <Text color={PASTEL.dim}>{rest}</Text>
          </Box>
          {who.size !== 'small' && <Text color={PASTEL.pink} dimColor>{natureLine(stats)}</Text>}
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
    const art = artFor(who)
    const scene = paint(one, kind, who.size, across, STEPS, { isSad, withGrass: false, stage: stageOf(levelOf(stats)), form: formOf(stats), nature: natureOf(stats), daypart: daypartNow(), leaning: yardLeaning(stats), ...(art === undefined ? {} : { art }) })
    const caption = { name: stats.name, level: levelOf(stats), progress: progressOf(stats), says, tally, daypart: daypartNow() }
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
        <Svg source={pixelsSvg(paintRun(run, speciesOf(who), stageOf(levelOf(statsOf(who))), formOf(statsOf(who))), 6)} alt={`Pet Run, score ${view.score}`} />
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
        <Svg source={pixelsSvg(paintQuest(stage, speciesOf(who), stageOf(levelOf(statsOf(who))), formOf(statsOf(who))), 5)} alt={`Pet Quest stage ${view.stage + 1}`} />
        <Box gap={1}>
          <Button key="jump" hotkey="j" onPress={onJump}>Jump</Button>
          <Button key="retry" hotkey="r" onPress={onRetry}>Retry</Button>
          <Button key="next" hotkey="n" onPress={onNext}>Next</Button>
        </Box>
      </Box>
    )
  })
}
