// Writes assets/demo.gif: each species walking, working, cheering, being patted and napping,
// drawn by the plugin's own scene code, so the GIF shows the pane's exact pixels and moves.
// Run with Node 22.18+ (TypeScript imports): node scripts/demo.mjs
// @handbook 4.4-readme-asset-generation
import { writeFileSync } from 'node:fs'

import { gif } from './gif.mjs'

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
      frames.push(paint(pet, kind, 'medium', WIDTH, STEPS).pixels)
    }
  }

  return frames
}


const frames = Object.values(SPECIES).flatMap(framesOf)
const height = frames[0]?.length ?? 0
writeFileSync(new URL('../assets/demo.gif', import.meta.url), gif(frames, WIDTH, height, { pixel: PIXEL, delay: DELAY_CS, backdrop: BACKDROP }))
console.log(`assets/demo.gif ${frames.length} frames`)
