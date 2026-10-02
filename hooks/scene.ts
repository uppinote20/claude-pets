/**
 * The yard as pixels, and the two ways it is drawn: half-block cells on the terminal,
 * an SVG card on the surfaces that draw `Svg` (desktop, VS Code, mobile).
 *
 * Pure: no `$`, so a test's render is exactly what the pane draws.
 *
 * @handbook 4.2-pixel-pipeline
 * @handbook 4.3-surface-branch
 * @tested tests/pet.test.ts
 */
import type { Pet } from '../types'
import type { Daypart, Nature } from './nature'
import type { Accessory, Head, Species, Sprite } from './species'

export type Size = 'small' | 'medium'

export const SIZES: readonly Size[] = ['small', 'medium']
export const DEFAULT_SIZE: Size = 'medium'

/** How far a pet has grown: a baby, a teen with its accessory, an adult in its form. */
export type Stage = 'baby' | 'teen' | 'adult'

/** What an adult became at Lv 40: its nature then, or one time in twenty the rare form. */
export type Form = Nature | 'rare'

/** The levels each stage begins at. */
export const STAGE_LEVELS = { teen: 15, adult: 40 } as const

export function stageOf(level: number): Stage {
  return level >= STAGE_LEVELS.adult ? 'adult' : level >= STAGE_LEVELS.teen ? 'teen' : 'baby'
}

type Look = {
  sprite: 'mini' | 'big'
  /** Pixel rows above the sprite: room to bounce and for the heart. */
  headroom: number
  /** Pixel rows of grass below it. */
  ground: number
  /** CSS pixels per sprite pixel on the surfaces that draw `Svg`. */
  unit: number
  /** The card's text size, in CSS pixels: what `cardWidthFor` measures and `toSvg` draws. */
  font: number
}

const LOOKS: Readonly<Record<Size, Look>> = {
  small: { sprite: 'mini', headroom: 1, ground: 1, unit: 6, font: 10 },
  medium: { sprite: 'big', headroom: 2, ground: 2, unit: 8, font: 12 },
}

export const PALETTE = {
  yellow: 0xffd787,
  pink: 0xffafd7,
  heart: 0xff87af,
  sparkle: 0xffe98a,
  grass: 0xafd7af,
  tuft: 0xc9e8c4,
  grassDeep: 0x8fc98f,
  shadow: 0x6fa86f,
  petal: 0xfff3dc,
} as const

const HEART = ['hh.hh', 'hhhhh', '.hhh.', '..h..'] as const
/** The happy sparkle, and a star's twinkle. */
const SPARKLE = ['.s.', 'sws', '.s.'] as const
const GIFT = ['y.y..', '.y...', 'ppypp', 'ppypp', 'ppypp'] as const

/** What each nature holds up while a tool runs. */
const PROPS: Readonly<Record<Nature, { rows: readonly string[]; ink: Readonly<Record<string, number>> } | null>> = {
  // The worker's is its pickaxe, swung while tools run.
  worker: null,
  scholar: { rows: ['bbwbb', 'bbwbb', 'bbwbb'], ink: { b: 0x6fa8dc, w: 0xfffaf0 } },
  sweetie: { rows: ['h.h', 'hhh', '.h.'], ink: { h: 0xff87af } },
  gamer: { rows: ['.....', 'kkkkk', 'kgkrk', 'kkkkk'], ink: { k: 0x8a8a9a, g: 0x7cc576, r: 0xff6b8a } },
  curious: null,
}

const SKY: Readonly<Record<Daypart, { rows: readonly string[]; ink: Readonly<Record<string, number>> }>> = {
  night: { rows: ['.mm', 'm..', 'm..', '.mm'], ink: { m: 0xfff3b0 } },
  morning: { rows: ['.s.', 'sss', '.s.'], ink: { s: 0xffc46b } },
  day: { rows: ['.ss.', 'ssss', 'ssss', '.ss.'], ink: { s: 0xffe36e } },
  evening: { rows: ['.ss.', 'ssss'], ink: { s: 0xff9a76 } },
}
const STARS = [3, 11, 19, 27, 35] as const

/** Pixels laid over the sprite, facing left, from its top left. */
type Overlay = { rows: readonly string[]; x: number; y: number; ink: Readonly<Record<string, number>> }

const GEAR_INK = {
  k: 0x4f5584, // cap, headset band
  h: 0x8a90b8, // the cap's top, catching the light
  y: 0xffd447, // tassel
  r: 0xff6b8a, // headset cups
  g: 0xc0c4d0, // pickaxe head
  b: 0x9a6a44, // pickaxe handle
  p: 0xffafd7, // hairpin petals
  c: 0xffe36e, // hairpin heart
} as const

/**
 * What its nature puts on it, by where its head is: the worker's pickaxe held out in front
 * (raised and lowered while tools run), the scholar's cap, the gamer's headset, the
 * sweetie's flower pin. Nothing for the curious.
 */
export function gearOf(nature: Nature, head: Head, isBig: boolean, isWorking: boolean, frame: number): Overlay[] {
  const middle = Math.round((head.left + head.right) / 2)

  switch (nature) {
    case 'worker': {
      const swing = isWorking && frame % 2 === 1 ? -1 : 0
      const rows = isBig ? ['.ggg.', 'gg.gg', 'g.b.g', '..b..', '..b..'] : ['ggg', 'g.g', '.b.']

      return [{ rows, x: head.left - (isBig ? 4 : 3), y: head.eye + swing + (isBig ? 1 : 0), ink: GEAR_INK }]
    }
    case 'scholar': {
      const rows = isBig ? ['...h...', 'hhhhhhh', '.kkkkky', '......y'] : ['.hhh.', 'hhhhh', '.kkky']
      const width = rows[1]?.length ?? 0

      return [{ rows, x: middle - Math.floor(width / 2), y: head.top - (isBig ? 2 : 1), ink: GEAR_INK }]
    }
    case 'gamer': {
      const across = head.right - head.left + 1
      const band = '.'.repeat(2) + 'k'.repeat(Math.max(0, across - 4)) + '.'.repeat(2)
      const side = '.k' + '.'.repeat(Math.max(0, across - 4)) + 'k.'
      const cup = 'rr' + '.'.repeat(Math.max(0, across - 4)) + 'rr'
      const reach = Math.max(1, head.eye - head.top)
      const rows = [band, ...Array.from({ length: reach - 1 }, () => side), cup, ...(isBig ? [cup] : [])]

      return [{ rows, x: head.left, y: head.top - 1, ink: GEAR_INK }]
    }
    case 'sweetie':
      return [{ rows: isBig ? ['p.p', '.c.', 'p.p'] : ['pc'], x: head.right - (isBig ? 3 : 2), y: head.top - 1, ink: GEAR_INK }]
    case 'curious':
      return []
  }
}

/** An overlay's rows and left edge for the way the pet faces: mirrored with it. */
function facing(overlay: Overlay, spriteWidth: number, dir: Pet['dir']): Overlay {
  if (dir !== 1) {
    return overlay
  }
  const across = overlay.rows[0]?.length ?? 0

  return { ...overlay, rows: overlay.rows.map(row => [...row].reverse().join('')), x: spriteWidth - overlay.x - across }
}
const BALL = ['rw', 'wr'] as const
const GIFT_INK = { p: 0xff9ec4, y: 0xffe36e } as const
/** Columns kept free beside the sprite for the heart or sparkle. */
const BADGE = 6

export type Pixels = (number | null)[][]

/** What `paint` drew: the pixels, and where the sprite sits in them. */
export type Scene = { pixels: Pixels; left: number; top: number; spriteWidth: number; ground: number }

export function lookOf(size: Size): Look {
  return LOOKS[size]
}

/** The big sprite for a stage: the baby, the teen, or an adult's own drawing where it has one. */
export function bodyOf(kind: Species, stage: Stage, form: Form): Sprite {
  if (stage === 'baby') {
    return kind.big
  }
  if (stage === 'adult' && form !== 'rare') {
    return kind.adults?.[form] ?? kind.teen
  }

  return kind.teen
}

function spriteOf(kind: Species, size: Size): Sprite {
  return kind[LOOKS[size].sprite]
}

/** Pixel rows of the yard: headroom, sprite and grass. Even, so it folds into whole cells. */
export function sceneHeight(kind: Species, size: Size): number {
  const look = LOOKS[size]
  const rows = look.headroom + spriteOf(kind, size).rows.length + look.ground

  return rows + (rows % 2)
}

/** Terminal rows of the yard at `size`. */
export function terminalRows(kind: Species, size: Size): number {
  return sceneHeight(kind, size) / 2
}

/** The narrowest yard, in sprite pixels: the sprite and its badge. */
export function minWidth(kind: Species, size: Size): number {
  return (spriteOf(kind, size).rows[0]?.length ?? 0) + BADGE
}

/** The sprite's pixel rows for this tick: eyes, tear and feet by mood, flipped to face its way. */
export function spriteRows(one: Pet, sprite: Sprite, isSad: boolean): string[] {
  const rows: string[] = [...sprite.rows]
  const isBlinking = one.mood === 'walk' && one.frame % 9 === 0
  const swap = (with_: Readonly<Record<number, string>>) => {
    for (const [at, row] of Object.entries(with_)) {
      rows[Number(at)] = row
    }
  }

  if (one.mood === 'sleep' || one.mood === 'happy' || one.mood === 'love' || one.mood === 'gift' || isBlinking) {
    swap(sprite.eyesShut)
  }
  if (one.mood === 'walk' && isSad) {
    swap(sprite.tear)
  }
  if (one.mood !== 'sleep' && one.frame % 2 === 1) {
    swap(sprite.feetApart)
  }

  // Sprites are drawn facing left; mirrored when it walks right.
  return one.dir === 1 ? rows.map(row => [...row].reverse().join('')) : rows
}

/** How the yard is painted beyond the pet and its size. */
export type PaintOptions = {
  /** Its tear when a rate limit is nearly used up. */
  isSad?: boolean
  /** The SVG card draws its own grass, so it asks for none. */
  withGrass?: boolean
  stage?: Stage
  /** An adult's form; ignored before Lv 40. */
  form?: Form
  /** What it carries while it works, and what stands in its corner of the yard. */
  nature?: Nature
  /** The sun, the evening sun, or the moon and stars, by the local hour. */
  daypart?: Daypart
}

/** The accessory's rows and left edge for the way the pet faces: mirrored with it. */
export function worn(accessory: Accessory, spriteWidth: number, dir: Pet['dir']): { rows: string[]; x: number } {
  if (dir !== 1) {
    return { rows: [...accessory.rows], x: accessory.x }
  }
  const across = accessory.rows[0]?.length ?? 0

  return { rows: accessory.rows.map(row => [...row].reverse().join('')), x: spriteWidth - accessory.x - across }
}

/**
 * The yard, `width` pixels across: the pet at step `one.x` of `steps` along it, what it wears
 * at its stage, its heart or sparkle, and a strip of grass with two flowers and its shadow.
 */
export function paint(one: Pet, kind: Species, size: Size, width: number, steps: number, options: PaintOptions = {}): Scene {
  const { isSad = false, withGrass = true, stage = 'baby', nature = 'curious', daypart = 'day', form = 'curious' } = options
  const look = LOOKS[size]
  // The small pane keeps the mini sprite at every stage; the big one grows and takes its form.
  const isBig = look.sprite === 'big'
  const isRare = isBig && stage === 'adult' && form === 'rare'
  const sprite = isBig ? bodyOf(kind, stage, form) : spriteOf(kind, size)
  const ink = { ...kind.ink, ...(sprite.ink ?? {}), ...(isRare ? kind.rare.ink : {}) }
  const height = sceneHeight(kind, size)
  const spriteWidth = sprite.rows[0]?.length ?? 0
  const pixels: Pixels = Array.from({ length: height }, () => Array.from({ length: width }, () => null))
  const put = (x: number, y: number, color: number) => {
    const line = pixels[y]

    if (line !== undefined && x >= 0 && x < width) {
      line[x] = color
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

  // Grass: a tufted top row over a deeper one, a pink and a yellow flower.
  const grassTop = height - look.ground
  if (withGrass) {
    for (let x = 0; x < width; x += 1) {
      put(x, grassTop, x % 4 === 1 ? PALETTE.tuft : PALETTE.grass)
      for (let y = grassTop + 1; y < height; y += 1) {
        put(x, y, PALETTE.grassDeep)
      }
    }
    put(2, grassTop, PALETTE.pink)
    put(width - 6, grassTop, PALETTE.yellow)
  }

  // The sky in the top right corner, and at night a few stars that twinkle.
  const sky = SKY[daypart]
  stamp(sky.rows, sky.ink, width - (sky.rows[0]?.length ?? 0) - 1, 0)
  if (daypart === 'night') {
    STARS.forEach((x, at) => {
      if ((one.frame + at) % 5 !== 0 && x < width - 6) {
        put(x, at % 2, 0xfffaf0)
      }
    })
  }

  const left = Math.round((one.x / steps) * Math.max(0, width - spriteWidth - BADGE))
  const isBouncy = one.mood === 'walk' || one.mood === 'happy' || one.mood === 'gift'
  const rest = grassTop - sprite.rows.length
  const top = isBouncy && one.frame % 2 === 1 ? rest - 1 : rest

  // Its shadow on the grass, narrower than it, so the feet stand on something.
  if (withGrass) {
    for (let x = left + 2; x < left + spriteWidth - 2; x += 1) {
      put(x, grassTop, PALETTE.shadow)
    }
  }
  stamp(spriteRows(one, sprite, isSad), ink, left, top)
  // A cap, a headset or a pin takes the place of a head accessory; a rare adult wears its mark.
  const gear = gearOf(nature, sprite.head ?? kind.head[look.sprite], isBig, one.mood === 'work', one.frame)
  const isHeadCovered = nature === 'scholar' || nature === 'gamer' || nature === 'sweetie'
  if (isRare) {
    const { rows, x } = worn(kind.rare.overlay, spriteWidth, one.dir)

    stamp(rows, kind.rare.overlay.ink, left + x, top + kind.rare.overlay.y)
  } else if (stage !== 'baby' && !(isHeadCovered && kind.accessory.slot === 'head')) {
    const accessory = (isBig ? sprite.accessory : undefined) ?? kind.accessory[look.sprite]
    const { rows, x } = worn(accessory, spriteWidth, one.dir)

    stamp(rows, accessory.ink, left + x, top + accessory.y)
  }
  for (const overlay of gear) {
    const placed = facing(overlay, spriteWidth, one.dir)

    stamp(placed.rows, placed.ink, left + placed.x, top + placed.y)
  }
  // An adult twinkles beside its head every other tick, high then low, unless a heart or a
  // sparkle already shows there. The head is on the side it faces; with no room there, at the
  // yard's left edge, it takes the badge columns on the right.
  if (stage === 'adult' && (one.mood === 'walk' || one.mood === 'work' || one.mood === 'sleep') && one.frame % 2 === 0) {
    const ahead = left - SPARKLE[0].length - 1
    const x = one.dir === -1 && ahead >= 0 ? ahead : left + spriteWidth + 1

    stamp(SPARKLE, { s: PALETTE.sparkle, w: PALETTE.petal }, x, one.frame % 4 === 0 ? top : top + 3)
  }

  if (one.mood === 'love') {
    stamp(HEART, { h: PALETTE.heart }, left + spriteWidth + 1, Math.max(0, top - 1 + (one.frame % 2)))
  }
  const prop = PROPS[nature]
  if (one.mood === 'work' && prop !== null) {
    stamp(prop.rows, prop.ink, left + spriteWidth + 1, Math.max(0, top + 1))
  }
  // A gamer kicks a ball along ahead of it.
  if (nature === 'gamer' && one.mood === 'walk') {
    const ahead = one.dir === 1 ? left + spriteWidth + 1 : left - 3
    stamp(one.frame % 2 === 0 ? BALL : [BALL[1], BALL[0]], { r: 0xff6b8a, w: 0xfffaf0 }, ahead, grassTop - 2)
  }
  if (one.mood === 'gift') {
    // The gift it found, bobbing beside it.
    stamp(GIFT, GIFT_INK, left + spriteWidth + 1, Math.max(0, top - 1 + (one.frame % 2)))
  }
  if (one.mood === 'happy') {
    const isLeft = one.frame % 2 === 0

    stamp(SPARKLE, { s: PALETTE.sparkle, w: PALETTE.petal }, isLeft ? left - 3 : left + spriteWidth, isLeft ? top + 1 : top - 1)
  }

  return { pixels, left, top, spriteWidth, ground: look.ground }
}

export type Cell = { glyph: string; fg: number | null; bg: number | null }

/** Folds each pair of pixel rows into one row of half-block cells. */
export function toCells(pixels: Pixels): Cell[][] {
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

const DEFAULT_COLOR = 0x01000000

/** `Raster`'s packing: little-endian u32 triplets `[codePoint, foreground, background]`, base64. */
export function pack(lines: Cell[][]): string {
  const words = new Uint32Array(
    lines.flat().flatMap(cell => [cell.glyph.codePointAt(0) ?? 0x20, cell.fg ?? DEFAULT_COLOR, cell.bg ?? DEFAULT_COLOR]),
  )

  // The environment has Uint8Array.prototype.toBase64; the es2023 lib does not declare it yet.
  const bytes = new Uint8Array(words.buffer) as Uint8Array & { toBase64(): string }

  return bytes.toBase64()
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

/** What the SVG card shows besides the yard: the name tag, what the pet says, and a line of counts. */
export type Caption = { name: string; level: number; progress: number; says: string; tally: string; daypart?: Daypart }

const CARD = { fill: '#fffaf3', edge: '#f3e2d2', ink: '#6b4f4f', tag: '#f48fb1', bubble: '#ffffff', grass: '#b5dcae', shadow: '#8fbf8a' } as const

/** The card's backdrop and the tally's color through the day: cream, a warm morning, peach, night blue. */
const CARD_SKY: Readonly<Record<Daypart, { fill: string; edge: string; tally: string }>> = {
  morning: { fill: '#fff6e6', edge: '#f3e2c8', tally: CARD.ink },
  day: { fill: CARD.fill, edge: CARD.edge, tally: CARD.ink },
  evening: { fill: '#ffe8de', edge: '#f2cfc0', tally: CARD.ink },
  night: { fill: '#2b3050', edge: '#3d4470', tally: '#d8dcf0' },
}

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, mark => `&#${mark.codePointAt(0)};`)
}

/** A rough width for `text` at `fontSize`: wide (CJK, Hangul) characters take 1 em, the rest 0.6 em. */
function textWidth(text: string, fontSize: number): number {
  return [...text].reduce((sum, mark) => sum + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿＀-｠]/u.test(mark) ? 1 : 0.6), 0) * fontSize
}

/** The narrowest yard, in sprite pixels, whose card fits `line` under the grass. */
export function cardWidthFor(size: Size, line: string): number {
  const { unit, font } = LOOKS[size]

  return Math.ceil(textWidth(line, font) / unit) + 2
}

/**
 * The scene as an SVG card, as the remote surfaces draw it: crisp pixels on a cream card,
 * a pink name tag with the level and its progress, and a speech bubble over the pet.
 */
export function toSvg(scene: Scene, size: Size, caption: Caption): string {
  const { unit, font } = LOOKS[size]
  const pad = unit * 2
  const band = font * 2 + 8
  const cols = scene.pixels[0]?.length ?? 0
  const width = cols * unit + pad * 2
  const foot = font + 10
  const height = band + scene.pixels.length * unit + pad + foot
  const parts: string[] = []
  const dots: string[] = []
  const text = (x: number, y: number, body: string, attrs: string) =>
    `<text x="${x}" y="${y}" font-family="ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" font-size="${font}" ${attrs}>${escapeXml(body)}</text>`

  const backdrop = CARD_SKY[caption.daypart ?? 'day']
  parts.push(`<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${unit * 3}" fill="${backdrop.fill}" stroke="${backdrop.edge}"/>`)

  // A rounded mound of grass with a scalloped top, three flowers, and the pet's shadow.
  const groundTop = band + (scene.pixels.length - scene.ground) * unit
  const bump = unit * 1.1
  const mound: string[] = [`<rect x="${pad}" y="${groundTop}" width="${cols * unit}" height="${scene.ground * unit + unit}" rx="${unit}" fill="${CARD.grass}"/>`]
  for (let x = pad + bump; x < pad + cols * unit - bump / 2; x += bump * 2) {
    mound.push(`<circle cx="${x}" cy="${groundTop + 1}" r="${bump}" fill="${CARD.grass}"/>`)
  }
  const flower = (x: number, petal: string) =>
    `<circle cx="${x}" cy="${groundTop + unit * 0.6}" r="${unit * 0.7}" fill="${petal}"/><circle cx="${x}" cy="${groundTop + unit * 0.6}" r="${unit * 0.28}" fill="#ffd36e"/>`
  mound.push(flower(pad + unit * 3, hex(PALETTE.pink)), flower(pad + cols * unit * 0.62, '#ffffff'), flower(pad + cols * unit - unit * 4, hex(PALETTE.pink)))
  mound.push(
    `<ellipse cx="${pad + (scene.left + scene.spriteWidth / 2) * unit}" cy="${groundTop + unit * 0.4}" rx="${(scene.spriteWidth / 2 - 1) * unit}" ry="${unit * 0.7}" fill="${CARD.shadow}"/>`,
  )
  parts.push(...mound)

  // Pixels, each row merged into runs of one color so the markup stays small.
  scene.pixels.forEach((row, y) => {
    let x = 0

    while (x < row.length) {
      const color = row[x]
      let end = x + 1

      while (end < row.length && row[end] === color) {
        end += 1
      }
      if (color !== null && color !== undefined) {
        dots.push(`<rect x="${pad + x * unit}" y="${band + y * unit}" width="${(end - x) * unit}" height="${unit}" fill="${hex(color)}"/>`)
      }
      x = end
    }
  })
  parts.push(`<g shape-rendering="crispEdges">${dots.join('')}</g>`)

  // The tag: name and level, and a thin bar of the way to the next level.
  const label = caption.name === '' ? `Lv ${caption.level}` : `${caption.name}  Lv ${caption.level}`
  const tagWidth = textWidth(label, font) + 16
  const tagHeight = font + 8
  parts.push(`<rect x="${pad}" y="6" width="${tagWidth}" height="${tagHeight}" rx="${tagHeight / 2}" fill="${CARD.tag}"/>`)
  parts.push(text(pad + 8, 6 + font + 1, label, 'fill="#ffffff" font-weight="700"'))
  const barLeft = pad + tagWidth + 6
  const barWidth = Math.min(48, Math.max(0, width - barLeft - pad))
  if (barWidth >= 16) {
    parts.push(`<rect x="${barLeft}" y="${6 + tagHeight / 2 - 2}" width="${barWidth}" height="4" rx="2" fill="${CARD.edge}"/>`)
    parts.push(
      `<rect x="${barLeft}" y="${6 + tagHeight / 2 - 2}" width="${Math.round(barWidth * Math.min(1, Math.max(0, caption.progress)))}" height="4" rx="2" fill="${CARD.tag}"/>`,
    )
  }

  // The bubble, centred over the pet and kept inside the card.
  if (caption.says !== '') {
    const bubbleWidth = textWidth(caption.says, font) + 14
    const bubbleHeight = font + 8
    const centre = pad + (scene.left + scene.spriteWidth / 2) * unit
    const x = Math.min(width - pad - bubbleWidth, Math.max(pad, centre - bubbleWidth / 2))
    const y = Math.max(tagHeight + 10, band + scene.top * unit - bubbleHeight - 6)
    const tail = Math.min(x + bubbleWidth - 8, Math.max(x + 8, centre))

    parts.push(`<path d="M${tail - 4} ${y + bubbleHeight - 1} L${tail} ${y + bubbleHeight + 5} L${tail + 4} ${y + bubbleHeight - 1} Z" fill="${CARD.bubble}" stroke="${CARD.edge}"/>`)
    parts.push(`<rect x="${x}" y="${y}" width="${bubbleWidth}" height="${bubbleHeight}" rx="${bubbleHeight / 2}" fill="${CARD.bubble}" stroke="${CARD.edge}"/>`)
    parts.push(`<rect x="${tail - 3.5}" y="${y + bubbleHeight - 2}" width="7" height="2" fill="${CARD.bubble}"/>`)
    parts.push(text(x + 7, y + font + 1, caption.says, `fill="${CARD.ink}" font-weight="600"`))
  }

  // The counts under the grass, centred.
  parts.push(text(width / 2, height - pad / 2 - 4, caption.tally, `fill="${backdrop.tally}" fill-opacity="0.7" text-anchor="middle"`))

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...parts,
    '</svg>',
  ].join('')
}

/** Pixels as an SVG on a dark rounded backdrop, `unit` CSS pixels each: Pet Run off the terminal. */
export function pixelsSvg(pixels: Pixels, unit: number): string {
  const width = (pixels[0]?.length ?? 0) * unit
  const height = pixels.length * unit
  const dots: string[] = []

  pixels.forEach((row, y) => {
    let x = 0

    while (x < row.length) {
      const color = row[x]
      let end = x + 1

      while (end < row.length && row[end] === color) {
        end += 1
      }
      if (color !== null && color !== undefined) {
        dots.push(`<rect x="${x * unit}" y="${y * unit}" width="${(end - x) * unit}" height="${unit}" fill="${hex(color)}"/>`)
      }
      x = end
    }
  })

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" rx="${unit * 2}" fill="#1e1e2e"/>`,
    `<g shape-rendering="crispEdges">${dots.join('')}</g>`,
    '</svg>',
  ].join('')
}
