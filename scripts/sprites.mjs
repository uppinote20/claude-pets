// Writes assets/<species>.svg from the sprite data, so the README shows the plugin's own pixels.
// Run with Node 24+: node scripts/sprites.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

import { SPECIES } from '../hooks/species.ts'

const PIXEL = 16
const MARGIN = 2
const BACKDROP = '#1e1e2e'

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true })

for (const [id, species] of Object.entries(SPECIES)) {
  const side = (species.rows.length + MARGIN * 2) * PIXEL
  const pixels = species.rows.flatMap((row, y) =>
    [...row].flatMap((mark, x) => {
      const color = species.ink[mark]

      return color === undefined
        ? []
        : [
            `<rect x="${(x + MARGIN) * PIXEL}" y="${(y + MARGIN) * PIXEL}" width="${PIXEL}" height="${PIXEL}" fill="#${color.toString(16).padStart(6, '0')}"/>`,
          ]
    }),
  )
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges" role="img" aria-label="${species.label}">`,
    `<rect width="${side}" height="${side}" rx="${PIXEL}" fill="${BACKDROP}"/>`,
    ...pixels,
    '</svg>',
    '',
  ].join('\n')

  writeFileSync(new URL(`../assets/${id}.svg`, import.meta.url), svg)
  console.log(`assets/${id}.svg ${pixels.length} pixels`)
}
