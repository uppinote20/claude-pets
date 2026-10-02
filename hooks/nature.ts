/**
 * What kind of pet it is becoming: its nature, read off what it has lived through, and its
 * rhythm, read off the hours its sessions keep. Pure: counts in, words out.
 *
 * @handbook 3.7-nature-rhythm
 * @tested tests/pet.test.ts
 */
import type { PetStats } from '../types'
import { SIDES } from './scene'
import type { Side } from './scene'

/** `curious` until it knows you, or while no one side of you stands out. */
export type Nature = 'worker' | 'scholar' | 'sweetie' | 'gamer' | 'curious'

/** The four quarters of a day by local hour: 0–6, 6–12, 12–18, 18–24. */
export type Daypart = 'night' | 'morning' | 'day' | 'evening'

export type Rhythm = 'night owl' | 'early bird' | 'daytimer' | 'evening type'

/** Experience it takes before a nature shows, and the share one side must have. */
const KNOWN_AFTER = 60
const STANDS_OUT = 0.4
/** Finished turns it takes before a rhythm shows, and the share one quarter must have. */
const RHYTHM_AFTER = 20
const RHYTHM_SHARE = 0.35

export const DAYPARTS: readonly Daypart[] = ['night', 'morning', 'day', 'evening']
const RHYTHMS: Readonly<Record<Daypart, Rhythm>> = {
  night: 'night owl',
  morning: 'early bird',
  day: 'daytimer',
  evening: 'evening type',
}

export function daypartOf(hour: number): Daypart {
  return DAYPARTS[Math.min(3, Math.max(0, Math.floor(hour / 6)))] ?? 'day'
}

/**
 * Each side's weight, in experience as `xpOf` counts it: tools for the worker, turns and
 * output for the scholar, pats for the sweetie, game snacks for the gamer.
 */
export function sidesOf(stats: PetStats): Record<Exclude<Nature, 'curious'>, number> {
  return {
    worker: stats.tools,
    scholar: stats.turns * 5 + Math.floor(stats.tokens / 1000),
    sweetie: stats.pats * 2,
    gamer: stats.snacks,
  }
}

export { SIDES } from './scene'
export type { Side } from './scene'

/** How fast the leaning follows what each finished turn brought: a turn moves it 3% of the way. */
const DRIFT = 0.03

/** A weighting as shares that sum to 1, or all zero when there is nothing to share. */
function shares(weights: readonly number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  return weights.map(weight => (total > 0 ? weight / total : 0))
}

/** The leaning a pet starts from, before any turn has moved it: its whole life's shares. */
export function lifetimeLeaning(stats: PetStats): number[] {
  const sides = sidesOf(stats)

  return shares(SIDES.map(side => sides[side]))
}

/**
 * The leaning after a turn: each side moves a little toward what the turn brought (its tools,
 * itself and its output, the pats and game snacks since the last turn). Old habits fade, so a
 * pet that changes how it is kept changes with it, slowly.
 */
export function driftLeaning(leaning: readonly number[], brought: Readonly<Record<Side, number>>): number[] {
  const now = shares(SIDES.map(side => brought[side]))

  if (now.every(share => share === 0)) {
    return [...leaning]
  }
  if (leaning.every(share => share === 0)) {
    return now
  }

  return SIDES.map((_, at) => (leaning[at] ?? 0) * (1 - DRIFT) + (now[at] ?? 0) * DRIFT)
}

/** Whether it has seen enough of you for a nature to show. */
export function isKnown(stats: PetStats): boolean {
  return Object.values(sidesOf(stats)).reduce((sum, weight) => sum + weight, 0) >= KNOWN_AFTER
}

/** Where the largest of `values` is, or -1 when it is shared: a tie singles nothing out. */
function topOf(values: readonly number[]): number {
  const best = Math.max(...values)
  const at = values.indexOf(best)

  return values.indexOf(best, at + 1) === -1 ? at : -1
}

/** Its nature now: the side its leaning favors, once it knows you and one side stands out. */
export function natureOf(stats: PetStats): Nature {
  const sides = Object.values(sidesOf(stats))
  const total = sides.reduce((sum, weight) => sum + weight, 0)
  const leaning = stats.leaning.length === SIDES.length ? stats.leaning : lifetimeLeaning(stats)
  const top = topOf(leaning)

  return total >= KNOWN_AFTER && (leaning[top] ?? 0) >= STANDS_OUT ? SIDES[top] ?? 'curious' : 'curious'
}

/**
 * An adult's form after a turn: it keeps its form until its leaning has clearly moved on (the
 * new side well ahead, the old one faded), then takes the new side's. The rare form stays.
 */
export function reformOf(form: string, leaning: readonly number[]): string {
  const at = SIDES.indexOf(form as Side)
  // A tie has not clearly moved on anywhere.
  const top = topOf(leaning)
  const isFaded = at < 0 ? true : (leaning[at] ?? 0) <= 0.2

  return form !== 'rare' && form !== '' && top !== at && (leaning[top] ?? 0) >= 0.45 && isFaded ? SIDES[top] ?? form : form
}

export function rhythmOf(hours: readonly number[]): Rhythm | null {
  const total = hours.reduce((sum, count) => sum + count, 0)
  const top = topOf(hours)
  const part = DAYPARTS[top]

  return part !== undefined && total >= RHYTHM_AFTER && (hours[top] ?? 0) / total >= RHYTHM_SHARE ? RHYTHMS[part] : null
}

/** A line it says now and then while it wanders, by its nature and the time of day. */
export function musingOf(nature: Nature, daypart: Daypart, beat: number): string {
  const lines: Readonly<Record<Nature, readonly string[]>> = {
    worker: ['ship it!', 'one more test…', 'refactor time'],
    scholar: ['hmm, interesting', 'reading the docs', 'let me think…'],
    sweetie: ['pat me?', '♡', 'you are doing great'],
    gamer: ['wanna play?', 'new high score?', '/pet play!'],
    curious: ['what is that?', 'la la la', 'sniff sniff'],
  }
  const late = daypart === 'night' ? ['it is late…', 'stars are out'] : daypart === 'morning' ? ['good morning!'] : []
  const pool = [...lines[nature], ...late]

  return pool[beat % pool.length] ?? ''
}
