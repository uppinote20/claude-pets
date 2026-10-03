/**
 * Pet Quest: an auto-running side-scroller. The pet runs on its own; a press jumps, a second
 * press while rising jumps higher. Stomp the bugs, snap up the snacks, knock the gift boxes
 * from below, hop the stumps, and reach the snack bowl.
 *
 * Stages are tile maps, one character per 4×4 tile, as the sprites are pixels: the three
 * below take about 5 KB. Pure, like run.ts: `advance` and `paintQuest` are all there is.
 */
import type { Pet } from '../types'
import { PALETTE, spriteRows, worn } from './scene'
import type { Pixels, Stage } from './scene'
import type { Species } from './species'

export const QUEST_TICK_MS = 50
const TILE = 4
/** Rows of tiles in every stage; the view is this many tiles high. */
export const QUEST_ROWS = 7
export const QUEST_HEIGHT = QUEST_ROWS * TILE
const SPEED = 1
const GRAVITY = 0.45
const FALL_MAX = 4
const LIFT = 3.4
const BOOST = 1.5
const BOUNCE = 2.8
const FOE_SPEED = 0.4
/** The pet's box inside its 8×8 sprite. */
const BOX = { x: 1, y: 1, w: 6, h: 7 } as const
const SIDE = 8
const SNACK_POINTS = 10
const STOMP_POINTS = 20

/**
 * `.` sky, `#` ground, `=` brick, `g` a gift box holding a snack (`u` once it is opened), `T` a tree stump,
 * `c` a snack, `b` a bug (it walks, turning at walls and edges), `F` the goal column
 * (the snack bowl stands at its foot).
 */
export const STAGES: readonly (readonly string[])[] = [
  // 1
  [
    '.............c......................................................................',
    '................................................................................F...',
    '............g...........................g=g.....................................F...',
    '......................cc.......cc...===.............................#...........F...',
    '................................................TT.....ccc.........##...........F...',
    '..................TT......b.................b...TT............b...###...........F...',
    '##############################...###################################################',
  ],
  // 2
  [
    '.............................c..................................................................',
    '............................................................................................F...',
    '............................g.............cc....g......................ccc.............#....F...',
    '.....................cc...=====...#.#.........=====...........TT......................##....F...',
    '............TT...................##.##..................TT....TT.....................###....F...',
    '............TT..b...............###b###............b....TT....TT..b.............b...####....F...',
    '####################...##################...##########################....######################',
  ],
  // 3
  [
    '............................................................................................................',
    '....................................................................g...................................F...',
    '...............................ccc....g=g......................................cccc.=....#..............F...',
    '...............cc...................=======..........cc.....TT....====......==..........##..............F...',
    '......................TT....................................TT.........................###.#............F...',
    '..........b...........TT..b..................b..b...........TT..b.......b.............####b##...........F...',
    '##############...#############....##################....######################.....#########################',
  ],
  // 4
  [
    '..............................................................................................................',
    '.........................c...............c.................c...............c.................c............F...',
    '.................c..........................g.........................g...................................F...',
    '........................TT....cc........TT.....cc.........TT..............TT....cc..........TT............F...',
    '................TT......TT........TT....TT................TT......TT......TT........TT......TT............F...',
    '..........TT....TT..b...TT....b...TT....TT....b.....TT....TT..b...TT..b...TT....b...TT..b...TT............F...',
    '##############################################################################################################',
  ],
  // 5
  [
    '................................................................................................................',
    '............................................................................................................F...',
    '....................g........cc.........g.........c..............ccc........g.........c.....................F...',
    '..............cc............===................c.==.............====...............c.==.....................F...',
    '..............==...............==.............==..................................==........................F...',
    '......................b...............b.................b.b...............b...................b.............F...',
    '############......########........##########........##########........##########........########################',
  ],
  // 6
  [
    '........................................................................................................',
    '..........................................................................g.........................F...',
    '................c...c.....g.....c...c...............g.....c...c.................c...c...c...........F...',
    '..........................................====......................................................F...',
    '......................................................................TT............................F...',
    '..............b...b...b.......b...b...b.................b...b...b.....TT......b...b...b...b.........F...',
    '################################################...#####################################################',
  ],
  // 7
  [
    '.................................c....................c........................c....................................',
    '................c...............................................................................................F...',
    '.....................c..g........##........c..g........#..........c...g........##...........c........#..........F...',
    '................##..............####..................##.#....................####..................##..........F...',
    '...............####............######................###.##..................######................###..........F...',
    '..............######......b...########.b........b...####.###.b..........b...########..b...........####...b......F...',
    '####################...###################...###################....######################....######################',
  ],
  // 8
  [
    '........................................................................................................................................',
    '...............................c....................g......cc..............c...........................c....g..............#........F...',
    '...............cc.....................cc........g..........==.................g..........c......................cc........##........F...',
    '...............==.............TT.....===......#...........................TT..........c.==............TT.......===.......###........F...',
    '........................TT....TT.............##.....................TT....TT.........==.........TT....TT................####........F...',
    '..........b..........b..TT..b.TT..b.........###...b...b.........b...TT..b.TT....b.............b.TT..b.TT..b............#####..b.....F...',
    '##############....##################.....#################....######################......####################.....#####################',
  ],
]

const SOLID = new Set(['#', '=', 'g', 'u', 'T'])

type Foe = { x: number; y: number; dir: -1 | 1; isAlive: boolean }

export type QuestPhase = 'ready' | 'running' | 'clear' | 'over'

export type Quest = {
  stage: number
  phase: QuestPhase
  /** The stage's tiles as they stand: snacks eaten and blocks knocked are gone. */
  tiles: string[]
  /** The view's width in pixels. */
  width: number
  x: number
  y: number
  rise: number
  isGrounded: boolean
  hasBoosted: boolean
  foes: Foe[]
  snacks: number
  stomps: number
  tick: number
}

export function newQuest(stage: number, width: number): Quest {
  const map = STAGES[stage] ?? STAGES[0] ?? []
  const foes: Foe[] = []
  const tiles = map.map((row, ty) =>
    [...row]
      .map((mark, tx) => {
        if (mark === 'b') {
          foes.push({ x: tx * TILE, y: ty * TILE, dir: -1, isAlive: true })

          return '.'
        }

        return mark
      })
      .join(''),
  )
  // Feet on the ground of the first column.
  const groundRow = tiles.findIndex(row => SOLID.has(row[1] ?? '.'))

  return {
    stage,
    phase: 'ready',
    tiles,
    width,
    x: TILE,
    y: (groundRow < 0 ? QUEST_ROWS - 1 : groundRow) * TILE - SIDE,
    rise: 0,
    isGrounded: true,
    hasBoosted: false,
    foes,
    snacks: 0,
    stomps: 0,
    tick: 0,
  }
}

export function questScore(quest: Quest): number {
  return quest.snacks * SNACK_POINTS + quest.stomps * STOMP_POINTS + (quest.phase === 'clear' ? 100 : 0)
}

function tileAt(tiles: readonly string[], tx: number, ty: number): string {
  if (tx < 0) {
    return '#'
  }

  return tiles[ty]?.[tx] ?? '.'
}

function isSolidAt(tiles: readonly string[], px: number, py: number): boolean {
  return SOLID.has(tileAt(tiles, Math.floor(px / TILE), Math.floor(py / TILE)))
}

/** Tiles under a box, as `[tx, ty]`. */
function tilesUnder(x: number, y: number, w: number, h: number): [number, number][] {
  const under: [number, number][] = []

  for (let ty = Math.floor(y / TILE); ty <= Math.floor((y + h - 0.01) / TILE); ty += 1) {
    for (let tx = Math.floor(x / TILE); tx <= Math.floor((x + w - 0.01) / TILE); tx += 1) {
      under.push([tx, ty])
    }
  }

  return under
}

function hitsSolid(tiles: readonly string[], x: number, y: number, w: number, h: number): boolean {
  return tilesUnder(x, y, w, h).some(([tx, ty]) => SOLID.has(tileAt(tiles, tx, ty)))
}

/** A press: starts the stage, jumps from the ground, or once per jump lifts it higher while rising. */
export function jumpQuest(quest: Quest): Quest {
  if (quest.phase === 'ready') {
    return { ...quest, phase: 'running', rise: LIFT, isGrounded: false }
  }
  if (quest.phase !== 'running') {
    return quest
  }
  if (quest.isGrounded) {
    return { ...quest, rise: LIFT, isGrounded: false, hasBoosted: false }
  }
  if (!quest.hasBoosted && quest.rise > 0) {
    return { ...quest, rise: quest.rise + BOOST, hasBoosted: true }
  }

  return quest
}

function setTile(tiles: string[], tx: number, ty: number, mark: string): void {
  const row = tiles[ty]

  if (row !== undefined && tx >= 0 && tx < row.length) {
    tiles[ty] = row.slice(0, tx) + mark + row.slice(tx + 1)
  }
}

/** One tick: run, fall or rise against the tiles, eat, knock, stomp, and end at a pit, a bug or the bowl. */
export function advanceQuest(quest: Quest): Quest {
  if (quest.phase !== 'running') {
    return quest
  }

  const tiles = [...quest.tiles]
  let { x, y, rise, isGrounded, hasBoosted, snacks, stomps } = quest

  // Across: the pet runs until a wall stops it.
  const ahead = x + SPEED
  if (!hitsSolid(tiles, ahead + BOX.x, y + BOX.y, BOX.w, BOX.h)) {
    x = ahead
  }

  // Down and up.
  rise = Math.max(-FALL_MAX, rise - GRAVITY)
  const next = y - rise
  if (rise <= 0) {
    if (hitsSolid(tiles, x + BOX.x, next + BOX.y, BOX.w, BOX.h)) {
      // Land on top of the tile under its feet.
      y = Math.floor((next + BOX.y + BOX.h) / TILE) * TILE - BOX.y - BOX.h
      rise = 0
      isGrounded = true
      hasBoosted = false
    } else {
      y = next
      isGrounded = false
    }
  } else {
    const head = tilesUnder(x + BOX.x, next + BOX.y, BOX.w, 0.5).filter(([tx, ty]) => SOLID.has(tileAt(tiles, tx, ty)))

    if (head.length > 0) {
      for (const [tx, ty] of head) {
        if (tileAt(tiles, tx, ty) === 'g') {
          setTile(tiles, tx, ty, 'u')
          snacks += 1
        }
      }
      y = (Math.floor((next + BOX.y) / TILE) + 1) * TILE - BOX.y
      rise = 0
    } else {
      y = next
    }
    isGrounded = false
  }

  // Snacks it touches.
  for (const [tx, ty] of tilesUnder(x + BOX.x, y + BOX.y, BOX.w, BOX.h)) {
    if (tileAt(tiles, tx, ty) === 'c') {
      setTile(tiles, tx, ty, '.')
      snacks += 1
    }
  }

  // Bugs near the view walk; a fall onto one stomps it, any other touch ends the run.
  let phase: QuestPhase = 'running'
  const foes = quest.foes.map(foe => {
    if (!foe.isAlive || foe.x > x + quest.width) {
      return foe
    }
    const step = foe.x + foe.dir * FOE_SPEED
    const front = foe.dir === 1 ? step + TILE : step
    const isBlocked = isSolidAt(tiles, front, foe.y + 1) || !isSolidAt(tiles, front, foe.y + TILE + 1)

    return isBlocked ? { ...foe, dir: (foe.dir === 1 ? -1 : 1) as Foe['dir'] } : { ...foe, x: step }
  })
  const pet = { x: x + BOX.x, y: y + BOX.y, w: BOX.w, h: BOX.h }
  for (const [i, foe] of foes.entries()) {
    if (!foe.isAlive) {
      continue
    }
    const isTouching = pet.x < foe.x + TILE && foe.x < pet.x + pet.w && pet.y < foe.y + TILE && foe.y + 1 < pet.y + pet.h
    if (!isTouching) {
      continue
    }
    // A stomp: falling, with its feet above the bug's back as the tick began.
    if (rise < 0 && quest.y + BOX.y + BOX.h <= foe.y + 2) {
      // A copy: the foe may still be the one the last tick's quest holds.
      foes[i] = { ...foe, isAlive: false }
      stomps += 1
      rise = BOUNCE
      isGrounded = false
    } else {
      phase = 'over'
    }
  }

  if (y > QUEST_HEIGHT) {
    phase = 'over'
  }
  const goal = tiles[QUEST_ROWS - 2]?.indexOf('F') ?? -1
  if (phase === 'running' && goal >= 0 && pet.x + pet.w >= goal * TILE) {
    phase = 'clear'
  }

  return { ...quest, tiles, x, y, rise, isGrounded, hasBoosted, foes, snacks, stomps, phase, tick: quest.tick + 1 }
}

/** Where the view starts: the pet a third of the way in, never past either end of the stage. */
export function cameraOf(quest: Quest): number {
  const length = (quest.tiles[0]?.length ?? 0) * TILE

  return Math.round(Math.max(0, Math.min(length - quest.width, quest.x - quest.width / 3)))
}

const INK = {
  dirt: 0x9c7a5b,
  dirtDark: 0x7d6049,
  brick: 0xd9946a,
  mortar: 0xa86f4c,
  gift: 0xff9ec4,
  ribbon: 0xffe36e,
  opened: 0xa88a8f,
  bark: 0xa0704c,
  barkDark: 0x7a5236,
  rings: 0xe2bf8f,
  bowl: 0x87b7ff,
  bowlDark: 0x5f8fd8,
  heart: 0xff87af,
  marker: 0xffafd7,
  snack: 0xffc46b,
  cloud: 0x3c3c50,
} as const

const BUG = ['a..a', 'bbbb', 'bkbk', 'b..b'] as const
const BUG_INK = { a: 0x5f4b5f, b: 0xb48ead, k: 0x3a2a3a } as const
const CLOUD = ['..ccc...', '.cccccc.', 'cccccccc'] as const

/** One tile's 4×4 pixels, by what is around it. */
function tilePixels(tiles: readonly string[], tx: number, ty: number, tick: number): (number | null)[][] | null {
  const mark = tileAt(tiles, tx, ty)
  const above = tileAt(tiles, tx, ty - 1)
  const fill = (color: number): (number | null)[][] => Array.from({ length: TILE }, () => Array.from({ length: TILE }, () => color))

  switch (mark) {
    case '#': {
      const tile = fill(INK.dirt)
      tile[2]![(tx * 3) % 4] = INK.dirtDark
      if (!SOLID.has(above)) {
        tile[0] = [PALETTE.grass, (tx % 3 === 0 ? PALETTE.tuft : PALETTE.grass), PALETTE.grass, PALETTE.grass]
        tile[1] = [PALETTE.grassDeep, PALETTE.grassDeep, PALETTE.grassDeep, PALETTE.grassDeep]
      }

      return tile
    }
    case '=': {
      const tile = fill(INK.brick)
      tile[3] = [INK.mortar, INK.mortar, INK.mortar, INK.mortar]
      tile[1]![tx % 2 === 0 ? 1 : 3] = INK.mortar

      return tile
    }
    case 'g': {
      // A gift box: pink, a yellow ribbon each way; the bow twinkles now and then.
      const tile = fill(INK.gift)
      tile[1] = [INK.ribbon, INK.ribbon, INK.ribbon, INK.ribbon]
      for (const row of tile) {
        row[2] = INK.ribbon
      }
      tile[0]![2] = Math.floor(tick / 6) % 4 === 0 ? 0xffffff : INK.ribbon

      return tile
    }
    case 'u': {
      const tile = fill(INK.opened)
      tile[0] = [null, null, null, null]

      return tile
    }
    case 'T': {
      // A tree stump: bark down the sides, rings on top.
      const isLeft = tileAt(tiles, tx - 1, ty) !== 'T'
      const row: number[] = isLeft ? [INK.barkDark, INK.bark, INK.bark, INK.bark] : [INK.bark, INK.bark, INK.bark, INK.barkDark]
      const tile = Array.from({ length: TILE }, (_, y) => (y % 2 === 1 ? row.map((color, x) => (x === 2 ? INK.barkDark : color)) : [...row]))
      if (above !== 'T') {
        tile[0] = Array.from({ length: TILE }, (_, x) => (x === (isLeft ? 3 : 0) ? INK.bark : INK.rings))
      }

      return tile
    }
    case 'c': {
      const bob = Math.floor(tick / 5) % 2
      const tile: (number | null)[][] = Array.from({ length: TILE }, () => Array.from({ length: TILE }, () => null))
      tile[bob]![1] = tile[bob + 1]![0] = tile[bob + 1]![1] = tile[bob + 1]![2] = tile[bob + 2]![1] = INK.snack

      return tile
    }
    case 'F': {
      // The goal: a snack bowl at the foot of the column, a heart bobbing over it.
      const tile: (number | null)[][] = Array.from({ length: TILE }, () => Array.from({ length: TILE }, () => null))
      const below = tileAt(tiles, tx, ty + 1)
      if (below !== 'F') {
        tile[0] = [INK.snack, INK.snack, INK.snack, INK.snack]
        tile[1] = [INK.bowl, INK.bowl, INK.bowl, INK.bowl]
        tile[2] = [null, INK.bowlDark, INK.bowlDark, null]
        tile[3] = [null, INK.bowl, INK.bowl, null]
      } else if (tileAt(tiles, tx, ty + 2) !== 'F') {
        const bob = Math.floor(tick / 6) % 2
        tile[bob]![0] = tile[bob]![2] = tile[bob + 1]![0] = tile[bob + 1]![1] = tile[bob + 1]![2] = tile[bob + 2]![1] = INK.heart
      }

      return tile
    }
    default:
      return null
  }
}

/** The view as pixels, `quest.width` across and `QUEST_HEIGHT` down. */
export function paintQuest(quest: Quest, kind: Species, stage: Stage): Pixels {
  const width = quest.width
  const camera = cameraOf(quest)
  const pixels: Pixels = Array.from({ length: QUEST_HEIGHT }, () => Array.from({ length: width }, () => null))
  const put = (x: number, y: number, color: number | null | undefined) => {
    const line = pixels[Math.round(y)]
    const at = Math.round(x) - camera

    if (line !== undefined && color !== null && color !== undefined && at >= 0 && at < width) {
      line[at] = color
    }
  }
  const stamp = (rows: readonly string[], ink: Readonly<Record<string, number>>, left: number, top: number) => {
    rows.forEach((row, y) => {
      ;[...row].forEach((mark, x) => put(left + x, top + y, ink[mark]))
    })
  }

  // Clouds far off move at a quarter of the camera.
  for (const at of [10, 52, 97, 140]) {
    stamp(CLOUD, { c: INK.cloud }, at + (camera * 3) / 4, 1 + (at % 4))
  }

  const first = Math.floor(camera / TILE)
  for (let ty = 0; ty < QUEST_ROWS; ty += 1) {
    for (let tx = first; tx <= first + Math.ceil(width / TILE); tx += 1) {
      tilePixels(quest.tiles, tx, ty, quest.tick)?.forEach((row, y) => row.forEach((color, x) => put(tx * TILE + x, ty * TILE + y, color)))
    }
  }

  for (const foe of quest.foes) {
    if (foe.isAlive) {
      // Legs swap as it walks.
      const rows = Math.floor(foe.x) % 2 === 0 ? BUG : [BUG[0], BUG[1], BUG[2], '.bb.']

      stamp(rows, BUG_INK, Math.round(foe.x), foe.y)
    }
  }

  const sprite = kind.mini
  const one: Pet = {
    x: 0,
    dir: 1,
    frame: quest.isGrounded && quest.phase === 'running' ? Math.floor(quest.tick / 3) : 0,
    mood: quest.phase === 'over' ? 'sleep' : quest.phase === 'clear' ? 'happy' : 'walk',
    hold: 0,
    idle: 0,
  }
  const top = Math.round(quest.y)
  stamp(spriteRows(one, sprite, false), kind.ink, Math.round(quest.x), top)
  // Off the top of the view: a little arrow where it will come down.
  if (top + BOX.y < 0) {
    const at = Math.round(quest.x) + 3

    put(at, 0, INK.marker)
    put(at + 1, 0, INK.marker)
    put(at - 1, 1, INK.marker)
    put(at + 2, 1, INK.marker)
  }
  if (stage !== 'baby') {
    const accessory = kind.accessory.mini
    const { rows, x } = worn(accessory, SIDE, 1)

    stamp(rows, accessory.ink, Math.round(quest.x) + x, top + accessory.y)
  }

  return pixels
}
