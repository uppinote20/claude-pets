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
import type { Species, Sprite } from './species'

export type Size = 'small' | 'medium'

export const SIZES: readonly Size[] = ['small', 'medium']
export const DEFAULT_SIZE: Size = 'medium'

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
const SPARKLE = ['.s.', 'sws', '.s.'] as const
/** Columns kept free beside the sprite for the heart or sparkle. */
const BADGE = 6

export type Pixels = (number | null)[][]

/** What `paint` drew: the pixels, and where the sprite sits in them. */
export type Scene = { pixels: Pixels; left: number; top: number; spriteWidth: number; ground: number }

export function lookOf(size: Size): Look {
  return LOOKS[size]
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

  if (one.mood === 'sleep' || one.mood === 'happy' || one.mood === 'love' || isBlinking) {
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

/**
 * The yard, `width` pixels across: the pet at step `one.x` of `steps` along it, its heart or sparkle,
 * and a strip of grass with two flowers and the pet's shadow.
 */
export function paint(one: Pet, kind: Species, size: Size, isSad: boolean, width: number, steps: number, withGrass = true): Scene {
  const look = LOOKS[size]
  const sprite = spriteOf(kind, size)
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

  // Grass: a tufted top row over a deeper one, a pink and a yellow flower. The SVG card
  // draws its own, so it asks for none.
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

  const left = Math.round((one.x / steps) * Math.max(0, width - spriteWidth - BADGE))
  const isBouncy = one.mood === 'walk' || one.mood === 'happy'
  const rest = grassTop - sprite.rows.length
  const top = isBouncy && one.frame % 2 === 1 ? rest - 1 : rest

  // Its shadow on the grass, narrower than it, so the feet stand on something.
  if (withGrass) {
    for (let x = left + 2; x < left + spriteWidth - 2; x += 1) {
      put(x, grassTop, PALETTE.shadow)
    }
  }
  stamp(spriteRows(one, sprite, isSad), kind.ink, left, top)

  if (one.mood === 'love') {
    stamp(HEART, { h: PALETTE.heart }, left + spriteWidth + 1, Math.max(0, top - 1 + (one.frame % 2)))
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
export type Caption = { name: string; level: number; progress: number; says: string; tally: string }

const CARD = { fill: '#fffaf3', edge: '#f3e2d2', ink: '#6b4f4f', tag: '#f48fb1', bubble: '#ffffff', grass: '#b5dcae', shadow: '#8fbf8a' } as const

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

  parts.push(`<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${unit * 3}" fill="${CARD.fill}" stroke="${CARD.edge}"/>`)

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
  parts.push(text(width / 2, height - pad / 2 - 4, caption.tally, `fill="${CARD.ink}" fill-opacity="0.6" text-anchor="middle"`))

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...parts,
    '</svg>',
  ].join('')
}
