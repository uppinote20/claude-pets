/**
 * What kind of pet it is becoming: its nature, read off what it has lived through, and its
 * rhythm, read off the hours its sessions keep. Pure: counts in, words out.
 */
import type { PetStats } from '../types'

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

/** Where the largest of `values` is, or -1 when it is shared: a tie singles nothing out. */
function topOf(values: readonly number[]): number {
  const best = Math.max(...values)
  const at = values.indexOf(best)

  return values.indexOf(best, at + 1) === -1 ? at : -1
}

export function natureOf(stats: PetStats): Nature {
  const sides = Object.entries(sidesOf(stats)) as [Exclude<Nature, 'curious'>, number][]
  const total = sides.reduce((sum, [, weight]) => sum + weight, 0)
  const top = sides[topOf(sides.map(([, weight]) => weight))]

  return top !== undefined && total >= KNOWN_AFTER && top[1] / total >= STANDS_OUT ? top[0] : 'curious'
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
