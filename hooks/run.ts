/**
 * Pet Run: the pet runs along the grass, jumps the bugs and snaps up the snacks above them.
 *
 * Pure, like scene.ts: `advance` moves one tick on, `paintRun` draws it as pixels. The hooks
 * module owns the clock, the keys and the pane; tests drive the same functions.
 */
import type { Pet } from '../types'
import { PALETTE, spriteRows, worn } from './scene'
import type { Pixels, Stage } from './scene'
import type { Species } from './species'

/** Ticks a second the hooks module runs it at. */
export const RUN_TICK_MS = 50
/** Pixel rows: sky above two rows of grass. */
export const RUN_HEIGHT = 22
const GROUND = 2
const PET_X = 4
const GRAVITY = 0.6
const LIFT = -3.6
const SPEED_START = 1
const SPEED_MAX = 2.6
/** Distance the speed takes to climb one step of 0.1. */
const SPEED_EVERY = 120
const SNACK_POINTS = 10

const BUG = ['.a.a.', 'bbbbb', 'bkbkb', '.b.b.'] as const
const BUG_INK = { a: 0x5f4b5f, b: 0xb48ead, k: 0x3a2a3a } as const
const SNACK = ['.c.', 'ccc', '.c.'] as const
const SNACK_INK = { c: 0xffc46b } as const
const CLOUD = ['..ccc...', '.cccccc.', 'cccccccc'] as const
const CLOUD_INK = { c: 0x3c3c50 } as const

export type Phase = 'ready' | 'running' | 'over'

type Thing = { kind: 'bug' | 'snack'; x: number; y: number }

export type Run = {
  phase: Phase
  width: number
  /** Ticks since the run began: the score, and what animates. */
  tick: number
  /** The pet's top above its place on the grass, in pixels, and its upward speed. */
  lift: number
  rise: number
  things: Thing[]
  /** Pixels until the next bug. */
  gap: number
  snacks: number
  seed: number
}

/** A small seeded random: the same seed runs the same course, so tests can replay it. */
function random(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, (seed + 0x6d2b79f5) | 0]
}

export function newRun(width: number, seed = 1): Run {
  return { phase: 'ready', width, tick: 0, lift: 0, rise: 0, things: [], gap: width, snacks: 0, seed }
}

export function scoreOf(run: Run): number {
  return Math.floor(run.tick / 2) + run.snacks * SNACK_POINTS
}

export function speedOf(run: Run): number {
  return Math.min(SPEED_MAX, SPEED_START + Math.floor(run.tick / SPEED_EVERY) / 10)
}

/** A jump: starts a ready run, leaves the grass in a running one, and does nothing midair. */
export function jump(run: Run): Run {
  if (run.phase === 'over') {
    return run
  }
  if (run.phase === 'ready') {
    return { ...run, phase: 'running', rise: -LIFT }
  }

  return run.lift === 0 ? { ...run, rise: -LIFT } : run
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/**
 * One tick: the pet rises and falls, the course scrolls by the speed, a new bug comes when
 * the gap closes (a snack sometimes floats over it), a snack touched is eaten, a bug ends it.
 */
export function advance(run: Run, kind: Species): Run {
  if (run.phase !== 'running') {
    return run
  }

  const speed = speedOf(run)
  const sprite = kind.mini
  const side = sprite.rows.length
  const groundTop = RUN_HEIGHT - GROUND
  let { seed, gap } = run
  let roll: number

  const rise = run.rise - GRAVITY
  const lift = Math.max(0, run.lift + rise)
  const things = run.things.map(thing => ({ ...thing, x: thing.x - speed })).filter(thing => thing.x > -6)

  gap -= speed
  if (gap <= 0) {
    things.push({ kind: 'bug', x: run.width, y: groundTop - BUG.length })
    ;[roll, seed] = random(seed)
    if (roll < 0.45) {
      // Over the bug, at the height a jump passes through.
      things.push({ kind: 'snack', x: run.width + 1, y: groundTop - side - 6 - Math.floor(roll * 6) })
    }
    ;[roll, seed] = random(seed)
    gap = Math.round((26 + roll * 30) * (0.7 + speed * 0.3))
  }

  // The pet's box, a pixel in from each side so a graze is forgiven.
  const pet = { x: PET_X + 1, y: groundTop - side - lift + 1, w: side - 2, h: side - 2 }
  let snacks = run.snacks
  let isHit = false
  const kept = things.filter(thing => {
    const box =
      thing.kind === 'bug'
        ? { x: thing.x, y: thing.y + 1, w: BUG[0].length, h: BUG.length - 1 }
        : { x: thing.x, y: thing.y, w: SNACK[0].length, h: SNACK.length }

    if (!overlaps(pet, box)) {
      return true
    }
    if (thing.kind === 'snack') {
      snacks += 1

      return false
    }
    isHit = true

    return true
  })

  return {
    ...run,
    phase: isHit ? 'over' : 'running',
    tick: run.tick + 1,
    lift,
    rise: lift === 0 ? 0 : rise,
    things: kept,
    gap,
    snacks,
    seed,
  }
}

/** The run as pixels, `run.width` across and `RUN_HEIGHT` down: clouds, grass, things, the pet. */
export function paintRun(run: Run, kind: Species, stage: Stage): Pixels {
  const width = run.width
  const pixels: Pixels = Array.from({ length: RUN_HEIGHT }, () => Array.from({ length: width }, () => null))
  const put = (x: number, y: number, color: number) => {
    const line = pixels[y]
    const at = Math.round(x)

    if (line !== undefined && at >= 0 && at < width) {
      line[at] = color
    }
  }
  const stamp = (rows: readonly string[], ink: Readonly<Record<string, number>>, left: number, top: number) => {
    rows.forEach((row, y) => {
      ;[...row].forEach((mark, x) => {
        const color = ink[mark]

        if (color !== undefined) {
          put(left + x, top + y, color)
        }
      })
    })
  }
  const travelled = run.tick * speedOf(run)

  // Clouds drift at a fifth of the speed; the grass's tufts scroll with the course.
  for (const at of [6, 31, 57]) {
    const x = (((at - travelled / 5) % (width + 10)) + width + 10) % (width + 10) - 8

    stamp(CLOUD, CLOUD_INK, x, 2 + (at % 3))
  }
  const groundTop = RUN_HEIGHT - GROUND
  for (let x = 0; x < width; x += 1) {
    const mark = (x + Math.floor(travelled)) % 6

    put(x, groundTop, mark === 0 ? PALETTE.tuft : mark === 3 ? PALETTE.pink : PALETTE.grass)
    put(x, groundTop + 1, PALETTE.grassDeep)
  }

  for (const thing of run.things) {
    if (thing.kind === 'bug') {
      stamp(BUG, BUG_INK, thing.x, thing.y)
    } else {
      // Snacks bob a pixel.
      stamp(SNACK, SNACK_INK, thing.x, thing.y + (Math.floor(run.tick / 4) % 2))
    }
  }

  // The pet faces right, running: feet step every other tick, eyes shut and a tear once it is over.
  const sprite = kind.mini
  const side = sprite.rows.length
  const one: Pet = {
    x: 0,
    dir: 1,
    frame: run.phase === 'running' && run.lift === 0 ? Math.floor(run.tick / 2) : 0,
    mood: run.phase === 'over' ? 'sleep' : 'walk',
    hold: 0,
    idle: 0,
  }
  const top = groundTop - side - Math.round(run.lift)

  stamp(spriteRows(one, sprite, run.phase === 'over'), kind.ink, PET_X, top)
  if (stage !== 'baby') {
    const accessory = kind.accessory.mini
    const { rows, x } = worn(accessory, side, 1)

    stamp(rows, accessory.ink, PET_X + x, top + accessory.y)
  }

  return pixels
}
