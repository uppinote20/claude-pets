// Writes the README's showcase, all drawn by the plugin's own code: assets/run.gif and
// assets/quest.gif (each game played by a simple autopilot), assets/stages.svg (every species
// as a baby, a teen, an adult of each nature and its rare form) and assets/yards.svg (the yard
// each leaning grows, and the night).
// Run with Node 22.18+ (TypeScript imports): node scripts/showcase.mjs
// @handbook 4.4-readme-asset-generation
import { writeFileSync } from 'node:fs'

import { gif } from './gif.mjs'
import './ts-resolve.mjs'

const { advance, jump, newRun, paintRun } = await import('../hooks/run.ts')
const { advanceQuest, jumpQuest, newQuest, paintQuest } = await import('../hooks/quest.ts')
const { bodyOf, dressingOf, hex, paint, spriteRows } = await import('../hooks/scene.ts')
const { SPECIES } = await import('../hooks/species.ts')

const BACKDROP = 0x1e1e2e
const LABEL = '#c8c8d8'
const FONT = "font-family=\"ui-rounded, 'SF Pro Rounded', system-ui, sans-serif\""
const write = (name, data, note) => {
  writeFileSync(new URL(`../assets/${name}`, import.meta.url), data)
  console.log(`assets/${name} ${note}`)
}

/** Pixels as SVG rects from (`left`, `top`), `unit` a pixel, runs of one color merged. */
function rects(pixels, unit, left, top) {
  const out = []
  pixels.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const color = row[x]
      let end = x + 1
      while (end < row.length && row[end] === color) {
        end += 1
      }
      if (color !== null && color !== undefined) {
        out.push(`<rect x="${left + x * unit}" y="${top + y * unit}" width="${(end - x) * unit}" height="${unit}" fill="${hex(color)}"/>`)
      }
      x = end
    }
  })

  return out.join('')
}

// Pet Run: jump a bug once it is a few pixels ahead, and run until the course is long enough to show.
{
  const cat = SPECIES.cat
  // Seed 3 and a jump 6–12 pixels ahead keep it going past the frames kept (found by trying a few).
  let run = jump(newRun(56, 3))
  const frames = []
  for (let tick = 0; tick < 400 && run.phase === 'running'; tick += 1) {
    const ahead = run.things.some(thing => thing.kind === 'bug' && thing.x > 6 && thing.x < 12)
    if (ahead && run.lift === 0) {
      run = jump(run)
    }
    run = advance(run, cat)
    if (tick % 2 === 0) {
      frames.push(paintRun(run, cat, 'baby'))
    }
  }
  // As the quest's: an autopilot that no longer lasts the course fails here, not as a short GIF.
  if (run.phase !== 'running') {
    throw new Error(`run.gif: the autopilot hit a bug after ${frames.length * 2} ticks (seed or physics changed?)`)
  }
  write('run.gif', gif(frames, frames[0][0].length, frames[0].length, { pixel: 5, delay: 10, backdrop: BACKDROP }), `${frames.length} frames`)
}

// Pet Quest: stage 1 with a jump every fourth tick clears it; a little of the clear is kept.
{
  const chick = SPECIES.chick
  let quest = newQuest(0, 48)
  const frames = []
  for (let tick = 0, after = 0; tick < 600 && after < 16; tick += 1) {
    if (quest.phase === 'running' || quest.phase === 'ready') {
      if (tick % 4 === 0) {
        quest = jumpQuest(quest)
      }
      quest = advanceQuest(quest)
    } else {
      after += 1
    }
    if (tick % 2 === 0) {
      frames.push(paintQuest(quest, chick, 'baby'))
    }
  }
  if (quest.phase !== 'clear') {
    throw new Error(`quest.gif: the autopilot did not clear stage 1 (${quest.phase})`)
  }
  write('quest.gif', gif(frames, frames[0][0].length, frames[0].length, { pixel: 4, delay: 10, backdrop: BACKDROP }), `${frames.length} frames`)
}

// Stages: one row per species, from baby to its rare form, drawn as the 12×12 pane draws them.
{
  const columns = [
    ['baby', 'baby', 'curious'],
    ['teen', 'teen', 'curious'],
    ['worker', 'adult', 'worker'],
    ['scholar', 'adult', 'scholar'],
    ['sweetie', 'adult', 'sweetie'],
    ['gamer', 'adult', 'gamer'],
    ['rare', 'adult', 'rare'],
  ]
  const unit = 5
  const cell = 20 * unit
  const labelWidth = 90
  const head = 28
  const one = { x: 0, dir: -1, frame: 2, mood: 'walk', hold: 0, idle: 0 }
  const kinds = Object.entries(SPECIES)
  const width = labelWidth + columns.length * cell
  const height = head + kinds.length * cell
  const parts = [`<rect width="${width}" height="${height}" rx="12" fill="${hex(BACKDROP)}"/>`]

  columns.forEach(([label], at) => {
    parts.push(`<text x="${labelWidth + at * cell + cell / 2}" y="20" text-anchor="middle" font-size="14" fill="${LABEL}" ${FONT}>${label}</text>`)
  })
  kinds.forEach(([id, kind], row) => {
    const top = head + row * cell
    parts.push(`<text x="${labelWidth - 12}" y="${top + cell / 2 + 5}" text-anchor="end" font-size="14" fill="${LABEL}" ${FONT}>${id}</text>`)
    columns.forEach(([, stage, form], at) => {
      const sprite = stage === 'baby' ? kind.big : bodyOf(kind, stage, form)
      const isRare = stage === 'adult' && form === 'rare'
      const ink = { ...kind.ink, ...(sprite.ink ?? {}), ...(isRare ? kind.rare.ink : {}) }
      // A canvas with room around the sprite for what it wears (a hat, a mark above its head).
      const pixels = Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => null))
      const stamp = (rows, colors, left, upper) =>
        rows.forEach((line, y) =>
          [...line].forEach((mark, x) => {
            const color = colors[mark]
            if (color !== undefined && pixels[upper + y]?.[left + x] !== undefined) {
              pixels[upper + y][left + x] = color
            }
          }),
        )
      stamp(spriteRows(one, sprite, false), ink, 4, 5)
      for (const overlay of dressingOf(kind, sprite, true, stage, form, one.dir, false, one.frame)) {
        stamp(overlay.rows, overlay.ink, 4 + overlay.x, 5 + overlay.y)
      }
      parts.push(rects(pixels, unit, labelWidth + at * cell, top))
    })
  })
  write(
    'stages.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-label="Every species as a baby, a teen, an adult of each nature, and its rare form">${parts.join('')}</svg>\n`,
    `${kinds.length}×${columns.length} pets`,
  )
}

// Banner: every species out on the grass at night, under the name.
{
  const { PALETTE } = await import('../hooks/scene.ts')
  const unit = 8
  const across = 160
  const rows = 20
  const grassTop = 17
  const pixels = Array.from({ length: rows }, () => Array.from({ length: across }, () => null))
  const put = (x, y, color) => {
    if (pixels[y]?.[x] !== undefined) {
      pixels[y][x] = color
    }
  }
  // Grass: a tufted top row over deeper ones, a flower now and then.
  for (let x = 0; x < across; x += 1) {
    put(x, grassTop, x % 4 === 1 ? PALETTE.tuft : PALETTE.grass)
    for (let y = grassTop + 1; y < rows; y += 1) {
      put(x, y, PALETTE.grassDeep)
    }
  }
  for (const [x, color] of [[11, PALETTE.pink], [47, PALETTE.yellow], [86, PALETTE.pink], [124, PALETTE.yellow], [153, PALETTE.pink]]) {
    put(x, grassTop, color)
  }
  // The eight, facing one way and the other, mid-step.
  Object.values(SPECIES).forEach((kind, at) => {
    const one = { x: 0, dir: at % 2 === 0 ? 1 : -1, frame: at % 2 === 0 ? 2 : 1, mood: 'walk', hold: 0, idle: 0 }
    const sprite = kind.big
    const left = 6 + at * 19
    spriteRows(one, sprite, false).forEach((line, y) =>
      [...line].forEach((mark, x) => {
        const color = kind.ink[mark]
        if (color !== undefined) {
          put(left + x, grassTop - sprite.rows.length + y, color)
        }
      }),
    )
  })
  const width = across * unit
  const height = 150 + rows * unit
  // The moon and a few stars in the sky above, beside the name.
  const sky = Array.from({ length: 16 }, () => Array.from({ length: 60 }, () => null))
  for (const [y, line] of ['..mm', '.m..', '.m..', '..mm'].entries()) {
    ;[...line].forEach((mark, x) => mark === 'm' && (sky[3 + y][48 + x] = 0xfff3b0))
  }
  for (const [x, y] of [[6, 4], [19, 9], [30, 3], [41, 12], [57, 8], [24, 14]]) {
    sky[y][x] = 0xfffaf0
  }
  write(
    'banner.svg',
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-label="claude-pets: eight pixel pets on the grass at night">`,
      `<clipPath id="card"><rect width="${width}" height="${height}" rx="16"/></clipPath>`,
      `<g clip-path="url(#card)">`,
      `<rect width="${width}" height="${height}" fill="${hex(BACKDROP)}"/>`,
      rects(sky, unit, width - 60 * unit, 0),
      `<text x="48" y="92" font-size="72" font-weight="800" fill="#ffd787" ${FONT}>claude-pets</text>`,
      `<text x="52" y="132" font-size="24" fill="${LABEL}" ${FONT}>a pixel pet that lives in your Claude Code pane</text>`,
      rects(pixels, unit, 0, 150),
      '</g>',
      '</svg>',
      '',
    ].join(''),
    `${Object.keys(SPECIES).length} pets`,
  )
}

// Yards: the props and grass each leaning grows, a mixed one, and the night.
{
  const panels = [
    ['worker: a building site', [1, 0, 0, 0], 'day'],
    ['scholar: a library corner', [0, 1, 0, 0], 'day'],
    ['sweetie: a garden', [0, 0, 1, 0], 'day'],
    ['gamer: an arcade', [0, 0, 0, 1], 'day'],
    ['a mixed leaning', [0.4, 0.1, 0.35, 0.15], 'morning'],
    ['at night', [0, 0, 0, 0], 'night'],
  ]
  const unit = 4
  const across = 48
  const one = { x: 6, dir: -1, frame: 2, mood: 'walk', hold: 0, idle: 0 }
  const scenes = panels.map(([, leaning, daypart]) => paint(one, SPECIES.cat, 'medium', across, 20, { stage: 'baby', leaning, daypart, nature: 'curious' }).pixels)
  const panelWidth = across * unit
  const panelHeight = scenes[0].length * unit + 26
  const gap = 16
  const width = gap + 2 * (panelWidth + gap)
  const height = gap + 3 * (panelHeight + gap)
  const parts = [`<rect width="${width}" height="${height}" rx="12" fill="${hex(BACKDROP)}"/>`]

  panels.forEach(([label], at) => {
    const left = gap + (at % 2) * (panelWidth + gap)
    const top = gap + Math.floor(at / 2) * (panelHeight + gap)
    parts.push(`<text x="${left}" y="${top + 14}" font-size="14" fill="${LABEL}" ${FONT}>${label}</text>`)
    parts.push(rects(scenes[at], unit, left, top + 26))
  })
  write(
    'yards.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" role="img" aria-label="The yard each leaning grows, a mixed one, and the yard at night">${parts.join('')}</svg>\n`,
    `${panels.length} yards`,
  )
}
