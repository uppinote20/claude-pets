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
    ink: { o: 0xffd787, w: 0xfffaf0, c: 0xfff3dc, p: 0xffafd7, k: 0x5f4b4b, m: 0xd08770, b: 0x87d7ff },
    big: {
      rows: [
        '.o........o.',
        '.oo......oo.',
        '.opoooooopo.',
        'oooooooooooo',
        'oowkoooowkoo',
        'ookkooookkoo',
        'oppoommooppo',
        '.oooooooooo.',
        '..ooccccoo..',
        '..occcccco.o',
        '..occccccooo',
        '...oo..oo...',
      ],
      eyesShut: { 4: 'oooooooooooo' },
      tear: { 6: 'obpoommooppo' },
      feetApart: { 11: '..oo....oo..' },
    },
    mini: {
      rows: [
        'o......o',
        'oo....oo',
        'oooooooo',
        'okooooko',
        'poommoop',
        '.oooooo.',
        '.occccoo',
        '..o..o..',
      ],
      eyesShut: { 3: 'oooooooo' },
      tear: { 4: 'pbommoop' },
      feetApart: { 7: '.o....o.' },
    },
    purr: 'purr',
  },
  chick: {
    label: 'chick',
    ink: { o: 0xffe98a, w: 0xfffaf0, l: 0xfff6c9, p: 0xffafd7, k: 0x5f4b4b, y: 0xffaf5f, b: 0x87d7ff },
    big: {
      rows: [
        '.....oo.....',
        '....oo......',
        '...oooooo...',
        '..oooooooo..',
        '.oowkoowkoo.',
        '.ookkookkoo.',
        '.oppoyyoppo.',
        'looooooooooo',
        '.oooooooooo.',
        '..oooooooo..',
        '...oooooo...',
        '...yy..yy...',
      ],
      eyesShut: { 4: '.oooooooooo.' },
      tear: { 6: '.obpoyyoppo.' },
      feetApart: { 11: '..yy....yy..' },
    },
    mini: {
      rows: [
        '...oo...',
        '..oooo..',
        '.oooooo.',
        '.okooko.',
        '.poyyop.',
        'looooool',
        '.oooooo.',
        '..y..y..',
      ],
      eyesShut: { 3: '.oooooo.' },
      tear: { 4: '.boyyop.' },
      feetApart: { 7: '.y....y.' },
    },
    purr: 'cheep',
  },
  dog: {
    label: 'dog',
    ink: { o: 0xe8c39e, d: 0xa8754f, w: 0xfffaf0, c: 0xfff3dc, p: 0xffafd7, k: 0x5f4b4b, m: 0xd08770, b: 0x87d7ff },
    big: {
      rows: [
        '...oooooo...',
        '..oooooooo..',
        'ddoooooooodd',
        'ddoooooooodd',
        'ddwkoooowkdd',
        'ddkkooookkdd',
        'dppocmmcoppd',
        '.oooccccooo.',
        '..oooooooo..',
        '..occcccco.o',
        '..occccccooo',
        '...oo..oo...',
      ],
      eyesShut: { 4: 'ddoooooooodd' },
      tear: { 6: 'dbpocmmcoppd' },
      feetApart: { 11: '..oo....oo..' },
    },
    mini: {
      rows: [
        '.oooooo.',
        'dooooood',
        'dkooookd',
        'dpcmmcpd',
        '.oooooo.',
        '.oooooo.',
        '.occccoo',
        '..o..o..',
      ],
      eyesShut: { 2: 'dooooooo' },
      tear: { 3: 'dbcmmcpd' },
      feetApart: { 7: '.o....o.' },
    },
    purr: 'woof',
  },
  slime: {
    label: 'slime',
    ink: { o: 0x9fe0a8, l: 0xe0f7e3, d: 0x6fbf7f, w: 0xfffaf0, p: 0xffafd7, k: 0x4b5f4f, m: 0x5a9a64, b: 0x87d7ff },
    big: {
      rows: [
        '............',
        '............',
        '....oooo....',
        '..oooooooo..',
        '.oloooooooo.',
        'oloooooooooo',
        'oowkoooowkoo',
        'ookkooookkoo',
        'oppoommooppo',
        'oooooooooooo',
        'oooooooooooo',
        '.dddddddddd.',
      ],
      eyesShut: { 6: 'oooooooooooo' },
      tear: { 8: 'obpoommooppo' },
      feetApart: { 11: 'dddddddddddd' },
    },
    mini: {
      rows: [
        '........',
        '..oooo..',
        '.oloooo.',
        'oloooooo',
        'okooooko',
        'poommoop',
        'oooooooo',
        '.dddddd.',
      ],
      eyesShut: { 4: 'oooooooo' },
      tear: { 5: 'pbommoop' },
      feetApart: { 7: 'dddddddd' },
    },
    purr: 'blub',
  },
  bunny: {
    label: 'bunny',
    ink: { o: 0xece4f4, w: 0xffffff, c: 0xffffff, p: 0xffafd7, k: 0x5f4b5f, m: 0xd08790, b: 0x87d7ff },
    big: {
      rows: [
        '..oo....oo..',
        '..op....po..',
        '..op....po..',
        '..oo....oo..',
        '.oooooooooo.',
        'oowkoooowkoo',
        'ookkooookkoo',
        'oppoommooppo',
        '.oooooooooo.',
        '..occcccco..',
        '..occccccocc',
        '...oo..oo...',
      ],
      eyesShut: { 5: 'oooooooooooo' },
      tear: { 7: 'obpoommooppo' },
      feetApart: { 11: '..oo....oo..' },
    },
    mini: {
      rows: [
        '.op..po.',
        '.op..po.',
        '.oooooo.',
        'okooooko',
        'poommoop',
        '.oooooo.',
        '.occccoc',
        '..o..o..',
      ],
      eyesShut: { 3: 'oooooooo' },
      tear: { 4: 'pbommoop' },
      feetApart: { 7: '.o....o.' },
    },
    purr: 'boop',
  },
  hamster: {
    label: 'hamster',
    ink: { o: 0xf5b971, w: 0xfffaf0, c: 0xfff3dc, p: 0xffafd7, k: 0x5f4b4b, m: 0xd08770, b: 0x87d7ff },
    big: {
      rows: [
        '............',
        '..oo....oo..',
        '.opoooooopo.',
        '.oooooooooo.',
        'oowkoooowkoo',
        'ookkooookkoo',
        'oppccmmccppo',
        'ooccccccccoo',
        'occcccccccco',
        'occcccccccco',
        '.ooccccccoo.',
        '..pp....pp..',
      ],
      eyesShut: { 4: 'oooooooooooo' },
      tear: { 6: 'obpccmmccppo' },
      feetApart: { 11: '.pp......pp.' },
    },
    mini: {
      rows: [
        '.o....o.',
        'oooooooo',
        'okooooko',
        'pccmmccp',
        'occcccco',
        'occcccco',
        '.oooooo.',
        '..p..p..',
      ],
      eyesShut: { 2: 'oooooooo' },
      tear: { 3: 'bccmmccp' },
      feetApart: { 7: '.p....p.' },
    },
    purr: 'squeak',
  },
  penguin: {
    label: 'penguin',
    ink: { o: 0x4f5b82, c: 0xfffaf0, e: 0x2e2e3a, p: 0xffafd7, y: 0xffaf5f, b: 0x87d7ff },
    big: {
      rows: [
        '...oooooo...',
        '..oooooooo..',
        '.oooooooooo.',
        '.ooccooccoo.',
        '.occcccccco.',
        '.occeccecco.',
        '.oceecceeco.',
        '.ocpcyycpco.',
        'oocccccccooo',
        'ooccccccccoo',
        '.oocccccco..',
        '...yy..yy...',
      ],
      eyesShut: { 5: '.occcccccco.' },
      tear: { 7: '.ocbcyycpco.' },
      feetApart: { 11: '..yy....yy..' },
    },
    mini: {
      rows: [
        '..oooo..',
        '.oooooo.',
        '.occcco.',
        'ocecceco',
        'opcyycpo',
        'occcccco',
        '.occcco.',
        '..y..y..',
      ],
      eyesShut: { 3: 'occcccco' },
      tear: { 4: 'obcyycpo' },
      feetApart: { 7: '.y....y.' },
    },
    purr: 'peep',
  },
  frog: {
    label: 'frog',
    ink: { o: 0x8fd18a, w: 0xfffaf0, c: 0xf0f7d4, p: 0xffafd7, k: 0x3f5a3f, m: 0x4f8a4a, b: 0x87d7ff },
    big: {
      rows: [
        '............',
        '.oooo..oooo.',
        '.owko..owko.',
        '.okko..okko.',
        'oooooooooooo',
        'oppooooooppo',
        'oooommmmoooo',
        '.oooooooooo.',
        '..occcccco..',
        '.ooccccccoo.',
        '.ooccccccoo.',
        '.ooo....ooo.',
      ],
      eyesShut: { 2: '.oooo..oooo.' },
      tear: { 5: 'obpooooooppo' },
      feetApart: { 11: 'ooo......ooo' },
    },
    mini: {
      rows: [
        '.oo..oo.',
        '.ko..ok.',
        'oooooooo',
        'pommmmop',
        '.oooooo.',
        '.occcco.',
        '.oooooo.',
        'oo....oo',
      ],
      eyesShut: { 1: '.oo..oo.' },
      tear: { 3: 'bommmmop' },
      feetApart: { 7: '.oo..oo.' },
    },
    purr: 'ribbit',
  },
}
