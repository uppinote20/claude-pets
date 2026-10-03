/**
 * A species is drawn twice, one character per pixel, facing left: `big` at 12×12 and
 * `mini` at 8×8 for the small pane. Two pixel rows make one terminal row of half blocks,
 * so the big sprite is 6 rows tall and the mini one 4.
 *
 * To add one: draw both sprites' `rows`, give every character a color in `ink` (`.` is
 * empty), and supply the rows that replace the eyes, the cheek row and the feet.
 *
 * @handbook 4.1-species-sprite-data
 * @tested tests/pet.test.ts
 */
export type Sprite = {
  rows: readonly string[]
  /** Rows replaced while it blinks, sleeps or is pleased, by index. */
  eyesShut: Readonly<Record<number, string>>
  /** Rows replaced when a rate limit is nearly used up, by index. */
  tear: Readonly<Record<number, string>>
  /** Rows replaced on every other tick so it steps, by index. */
  feetApart: Readonly<Record<number, string>>
}

export type Species = {
  label: string
  ink: Readonly<Record<string, number>>
  big: Sprite
  mini: Sprite
  purr: string
}

export const DEFAULT_SPECIES = 'cat'

export const SPECIES: Readonly<Record<string, Species>> = {
  cat: {
    label: 'cat',
    ink: { o: 0xffd787, w: 0xfff3dc, p: 0xffafd7, k: 0x5f5f5f, b: 0x87d7ff },
    big: {
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
      eyesShut: { 4: 'oooooooooooo', 5: 'okkkooookkko' },
      tear: { 6: 'opbowppwoppo' },
      feetApart: { 11: '.oo......oo.' },
    },
    mini: {
      rows: [
        '.o....o.',
        'opoooopo',
        'oooooooo',
        'okooooko',
        'poowwoop',
        '.oooooo.',
        '.owwwwoo',
        '..o..o..',
      ],
      eyesShut: { 3: 'okkookko' },
      tear: { 4: 'pbowwoop' },
      feetApart: { 7: '.o....o.' },
    },
    purr: 'purr',
  },
  chick: {
    label: 'chick',
    ink: { o: 0xffe98a, w: 0xfff6c9, p: 0xffafd7, k: 0x5f5f5f, y: 0xffaf5f, b: 0x87d7ff },
    big: {
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
      eyesShut: { 4: '..oooooooo..', 5: '..kkooookk..' },
      tear: { 6: '..oboyyopo..' },
      feetApart: { 11: '..yy....yy..' },
    },
    mini: {
      rows: [
        '........',
        '..oooo..',
        '.oooooo.',
        '.okooko.',
        '.poyyop.',
        'woooooow',
        '.oooooo.',
        '..y..y..',
      ],
      eyesShut: { 3: '.kkookk.' },
      tear: { 4: '.boyyop.' },
      feetApart: { 7: '.y....y.' },
    },
    purr: 'cheep',
  },
}
