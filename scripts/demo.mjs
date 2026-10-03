// Writes assets/demo.gif: each species walking, working, cheering, being patted and napping,
// drawn by the plugin's own scene code, so the GIF shows the pane's exact pixels and moves.
// Run with Node 22.18+ (TypeScript imports): node scripts/demo.mjs
import { writeFileSync } from 'node:fs'

import { paint } from '../hooks/scene.ts'
import { SPECIES } from '../hooks/species.ts'

const PIXEL = 6
const WIDTH = 40
const STEPS = 20
const DELAY_CS = 30
const BACKDROP = 0x1e1e2e

/** One beat of the demo: a mood held for some ticks, the pet stepping as it does in the pane. */
const BEATS = [
  { mood: 'walk', ticks: 12 },
  { mood: 'work', ticks: 6 },
  { mood: 'happy', ticks: 6 },
  { mood: 'love', ticks: 6 },
  { mood: 'sleep', ticks: 6 },
]

function framesOf(kind) {
  const frames = []
  let pet = { x: 6, dir: 1, frame: 0, mood: 'walk', hold: 0, idle: 0 }

  for (const { mood, ticks } of BEATS) {
    for (let tick = 0; tick < ticks; tick += 1) {
      const isWalking = mood === 'walk'
      const x = isWalking ? Math.min(STEPS, Math.max(0, pet.x + pet.dir)) : pet.x
      const dir = isWalking && (x === 0 || x === STEPS) ? -pet.dir : pet.dir

      pet = { ...pet, x, dir, mood, frame: pet.frame + 1 }
      frames.push(paint(pet, kind, 'medium', false, WIDTH, STEPS).pixels)
    }
  }

  return frames
}

/** The variable-length LZW code stream of one frame's indices, packed into sub-blocks. */
function lzw(indices, minSize) {
  const clear = 1 << minSize
  const end = clear + 1
  const bytes = []
  let bits = 0
  let held = 0
  let size = minSize + 1
  let table = new Map()
  let next = end + 1
  const put = code => {
    held |= code << bits
    bits += size
    while (bits >= 8) {
      bytes.push(held & 0xff)
      held >>= 8
      bits -= 8
    }
  }

  put(clear)
  let prefix = String(indices[0])
  for (let i = 1; i < indices.length; i += 1) {
    const key = `${prefix},${indices[i]}`

    if (table.has(key)) {
      prefix = key
      continue
    }
    put(prefix.includes(',') ? table.get(prefix) : Number(prefix))
    if (next < 4096) {
      table.set(key, next)
      next += 1
      if (next > 1 << size && size < 12) {
        size += 1
      }
    } else {
      put(clear)
      table = new Map()
      next = end + 1
      size = minSize + 1
    }
    prefix = String(indices[i])
  }
  put(prefix.includes(',') ? table.get(prefix) : Number(prefix))
  put(end)
  if (bits > 0) {
    bytes.push(held & 0xff)
  }

  const blocks = []
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255)
    blocks.push(chunk.length, ...chunk)
  }

  return [...blocks, 0]
}

function gif(frames, width, height) {
  // The backdrop is slot 0 (the screen's background color), so a sprite of the same color must not take a second slot.
  const colors = [BACKDROP, ...new Set(frames.flatMap(frame => frame.flat()).filter(color => color !== null && color !== BACKDROP))]
  const depth = Math.max(1, Math.ceil(Math.log2(colors.length)))
  const table = colors.concat(Array.from({ length: (1 << depth) - colors.length }, () => 0))
  const index = new Map(colors.map((color, i) => [color, i]))
  const word = value => [value & 0xff, value >> 8]
  const out = [
    ...Buffer.from('GIF89a'),
    ...word(width * PIXEL),
    ...word(height * PIXEL),
    0xf0 | (depth - 1),
    0,
    0,
    ...table.flatMap(color => [color >> 16, (color >> 8) & 0xff, color & 0xff]),
    // Loop forever.
    0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0'), 0x03, 0x01, 0x00, 0x00, 0x00,
  ]

  for (const frame of frames) {
    const indices = []
    for (let y = 0; y < height * PIXEL; y += 1) {
      const row = frame[Math.floor(y / PIXEL)] ?? []
      for (let x = 0; x < width * PIXEL; x += 1) {
        indices.push(index.get(row[Math.floor(x / PIXEL)] ?? BACKDROP) ?? 0)
      }
    }
    out.push(0x21, 0xf9, 0x04, 0x00, ...word(DELAY_CS), 0x00, 0x00)
    out.push(0x2c, 0, 0, 0, 0, ...word(width * PIXEL), ...word(height * PIXEL), 0x00)
    out.push(Math.max(2, depth), ...lzw(indices, Math.max(2, depth)))
  }
  out.push(0x3b)

  return Uint8Array.from(out)
}

const frames = Object.values(SPECIES).flatMap(framesOf)
const height = frames[0]?.length ?? 0
writeFileSync(new URL('../assets/demo.gif', import.meta.url), gif(frames, WIDTH, height))
console.log(`assets/demo.gif ${frames.length} frames`)
