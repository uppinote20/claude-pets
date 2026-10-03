// A GIF89a encoder with no dependencies, for the README's animations: frames of pixels (a color
// or null per pixel) in, the file's bytes out. Shared by scripts/demo.mjs and scripts/showcase.mjs.
// @handbook 4.4-readme-asset-generation

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

/**
 * The frames as one looping GIF: each pixel `pixel` across and down, `delay` hundredths of a
 * second a frame, `backdrop` where nothing is drawn.
 */
export function gif(frames, width, height, { pixel, delay, backdrop }) {
  if (pixel === undefined || delay === undefined || backdrop === undefined) {
    throw new Error('gif: pixel, delay and backdrop are required')
  }
  // The backdrop is slot 0 (the screen's background color), so a sprite of the same color must not take a second slot.
  const colors = [backdrop, ...new Set(frames.flatMap(frame => frame.flat()).filter(color => color !== null && color !== backdrop))]
  if (colors.length > 256) {
    throw new Error(`gif: ${colors.length} colors, one GIF palette holds 256`)
  }
  const depth = Math.max(1, Math.ceil(Math.log2(colors.length)))
  const table = colors.concat(Array.from({ length: (1 << depth) - colors.length }, () => 0))
  const index = new Map(colors.map((color, i) => [color, i]))
  const word = value => [value & 0xff, value >> 8]
  const out = [
    ...Buffer.from('GIF89a'),
    ...word(width * pixel),
    ...word(height * pixel),
    0xf0 | (depth - 1),
    0,
    0,
    ...table.flatMap(color => [color >> 16, (color >> 8) & 0xff, color & 0xff]),
    // Loop forever.
    0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0'), 0x03, 0x01, 0x00, 0x00, 0x00,
  ]

  for (const frame of frames) {
    const indices = []
    for (let y = 0; y < height * pixel; y += 1) {
      const row = frame[Math.floor(y / pixel)] ?? []
      for (let x = 0; x < width * pixel; x += 1) {
        indices.push(index.get(row[Math.floor(x / pixel)] ?? backdrop) ?? 0)
      }
    }
    out.push(0x21, 0xf9, 0x04, 0x00, ...word(delay), 0x00, 0x00)
    out.push(0x2c, 0, 0, 0, 0, ...word(width * pixel), ...word(height * pixel), 0x00)
    out.push(Math.max(2, depth), ...lzw(indices, Math.max(2, depth)))
  }
  out.push(0x3b)

  return Uint8Array.from(out)
}
