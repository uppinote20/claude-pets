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

/**
 * What a grown pet wears: pixels laid over the sprite (drawn facing left, `.` see-through),
 * `x` and `y` from the sprite's top left, in colors of their own.
 */
export type Accessory = {
  rows: readonly string[]
  x: number
  y: number
  ink: Readonly<Record<string, number>>
}

/**
 * A sprite's head, facing left: `top` the row its crown starts on between any ears, `eye`
 * the eyes' row, `left` and `right` its widest columns there.
 */
export type Head = { top: number; eye: number; left: number; right: number }

export type Species = {
  label: string
  ink: Readonly<Record<string, number>>
  big: Sprite
  mini: Sprite
  /** The rare shiny's colors, laid over `ink`. */
  shiny: Readonly<Record<string, number>>
  /** Worn from the grown stage on, at each sprite size; `head` ones give way to a cap or a headset. */
  accessory: { slot: 'head' | 'body'; big: Accessory; mini: Accessory }
  /** Where its head is in each sprite, for what its nature puts on it. */
  head: { big: Head; mini: Head }
  purr: string
}

const RIBBON = { r: 0xff6b8a, R: 0xd94f6e } as const
const GOLD = { y: 0xffd447 } as const
const BLOOM = { f: 0xffffff, Y: 0xffd447 } as const
const SCARF = { s: 0x6fa8dc, S: 0x4f86bd } as const
const LEAF = { g: 0x7cc576 } as const

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
    shiny: { o: 0xd9c2ff, m: 0xa98ad8 },
    head: { big: { top: 2, eye: 4, left: 0, right: 11 }, mini: { top: 2, eye: 3, left: 0, right: 7 } },
    accessory: {
      slot: 'head',
      big: { rows: ['r...r', 'rrRrr', 'r...r'], x: 7, y: 0, ink: RIBBON },
      mini: { rows: ['r.r', 'rRr'], x: 5, y: 0, ink: RIBBON },
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
        'looooooooool',
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
    shiny: { o: 0xbfeaff, l: 0xe6f8ff },
    head: { big: { top: 2, eye: 4, left: 1, right: 10 }, mini: { top: 1, eye: 3, left: 1, right: 6 } },
    accessory: {
      slot: 'head',
      big: { rows: ['.f.', 'fYf', '.f.'], x: 7, y: 0, ink: BLOOM },
      mini: { rows: ['.f.', 'fYf'], x: 5, y: 0, ink: BLOOM },
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
      eyesShut: { 2: 'dooooood' },
      tear: { 3: 'dbcmmcpd' },
      feetApart: { 7: '.o....o.' },
    },
    shiny: { o: 0xf7f2ea, d: 0x8a8a9a },
    head: { big: { top: 0, eye: 4, left: 0, right: 11 }, mini: { top: 0, eye: 2, left: 0, right: 7 } },
    accessory: {
      slot: 'body',
      big: { rows: ['ssssssss', '.sS.....'], x: 2, y: 8, ink: SCARF },
      mini: { rows: ['ssssss'], x: 1, y: 4, ink: SCARF },
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
    shiny: { o: 0xffb8dc, l: 0xffe6f2, d: 0xe48ab8, m: 0xc06a98 },
    head: { big: { top: 2, eye: 6, left: 0, right: 11 }, mini: { top: 1, eye: 4, left: 0, right: 7 } },
    accessory: {
      slot: 'head',
      big: { rows: ['y.y.y', 'yyyyy'], x: 4, y: 0, ink: GOLD },
      mini: { rows: ['y..y', 'yyyy'], x: 2, y: 0, ink: GOLD },
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
    shiny: { o: 0xffe6a0 },
    head: { big: { top: 4, eye: 5, left: 0, right: 11 }, mini: { top: 2, eye: 3, left: 0, right: 7 } },
    accessory: {
      slot: 'head',
      big: { rows: ['r...r', 'rrRrr', 'r...r'], x: 4, y: 1, ink: RIBBON },
      mini: { rows: ['rRr'], x: 3, y: 2, ink: RIBBON },
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
    shiny: { o: 0xd6d8e8 },
    head: { big: { top: 2, eye: 4, left: 0, right: 11 }, mini: { top: 1, eye: 2, left: 0, right: 7 } },
    accessory: {
      slot: 'head',
      big: { rows: ['..gg', '.gg.', 'gg..'], x: 8, y: 0, ink: LEAF },
      mini: { rows: ['.g', 'g.'], x: 6, y: 0, ink: LEAF },
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
    shiny: { o: 0x8f64bf },
    head: { big: { top: 0, eye: 5, left: 1, right: 10 }, mini: { top: 0, eye: 3, left: 0, right: 7 } },
    accessory: {
      slot: 'body',
      big: { rows: ['rrRRrr'], x: 3, y: 8, ink: RIBBON },
      mini: { rows: ['rRRr'], x: 2, y: 5, ink: RIBBON },
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
    shiny: { o: 0x93c6ff, m: 0x4f7fc0 },
    head: { big: { top: 1, eye: 2, left: 1, right: 10 }, mini: { top: 0, eye: 1, left: 1, right: 6 } },
    accessory: {
      slot: 'head',
      big: { rows: ['y.y.y', 'yyyyy'], x: 4, y: 0, ink: GOLD },
      mini: { rows: ['yy'], x: 3, y: 0, ink: GOLD },
    },
    purr: 'ribbit',
  },
}
