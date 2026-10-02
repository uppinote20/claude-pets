/**
 * A species is a 12×12 sprite, one character per pixel, drawn facing left.
 * Two pixel rows make one terminal row of half blocks, so a sprite is 6 rows tall.
 *
 * To add one: draw `rows`, give every character a color in `ink` (`.` is empty),
 * and supply the rows that replace the eyes, the cheek row and the feet.
 *
 * @handbook 4.1-species-sprite-data
 * @tested tests/pet.test.ts
 */
export type Species = {
  label: string
  ink: Readonly<Record<string, number>>
  rows: readonly string[]
  /** Replace rows 4 and 5 while it blinks, sleeps or is pleased. */
  eyesShut: readonly [string, string]
  /** Replaces row 6 when a rate limit is nearly used up. */
  tear: string
  /** Replaces row 11 on every other tick, so it steps. */
  feetApart: string
  purr: string
}

export const DEFAULT_SPECIES = 'cat'

export const SPECIES: Readonly<Record<string, Species>> = {
  cat: {
    label: 'cat',
    ink: { o: 0xffd787, w: 0xfff3dc, p: 0xffafd7, k: 0x5f5f5f, b: 0x87d7ff },
    rows: [
      '..o......o..',
      '.opo....opo.',
      '.oooooooooo.',
      'oooooooooooo',
      'ookooooookoo',
      'ookooooookoo',
      'oppowppwoppo',
      '.oowwwwwwoo.',
      '..oooooooo.o',
      '.oowwwwwwooo',
      '.oowwwwwwoo.',
      '..oo....oo..',
    ],
    eyesShut: ['oooooooooooo', 'okkkooookkko'],
    tear: 'opbowppwoppo',
    feetApart: '.oo......oo.',
    purr: 'purr',
  },
  chick: {
    label: 'chick',
    ink: { o: 0xffe98a, w: 0xfff6c9, p: 0xffafd7, k: 0x5f5f5f, y: 0xffaf5f, b: 0x87d7ff },
    rows: [
      '............',
      '....oooo....',
      '...oooooo...',
      '..oooooooo..',
      '..okooooko..',
      '..okooooko..',
      '..opoyyopo..',
      '.oooooooooo.',
      'woooooooooow',
      '.oooooooooo.',
      '..oooooooo..',
      '...yy..yy...',
    ],
    eyesShut: ['..oooooooo..', '..kkooookk..'],
    tear: '..oboyyopo..',
    feetApart: '..yy....yy..',
    purr: 'cheep',
  },
}
