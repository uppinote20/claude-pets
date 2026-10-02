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
  /** Colors of its own, laid over the species' (an adult form's clothes). */
  ink?: Readonly<Record<string, number>>
  /** Where its head and accessory sit, when not where the baby's do. */
  head?: Head
  accessory?: Accessory
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
  /** The teen, from Lv 15: taller, with a body of its own. */
  teen: Sprite
  /** The rare adult, one evolution in twenty: the teen in colors of its own, with a mark of its own. */
  rare: { name: string; ink: Readonly<Record<string, number>>; overlay: Accessory }
  /** Adults drawn for one nature or another; any other nature's adult is the teen in its gear. */
  adults?: Partial<Record<'worker' | 'scholar' | 'sweetie' | 'gamer' | 'curious', Sprite>>
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
    teen: {
      rows: [
        '.o......o...',
        '.oo....oo...',
        '.opoooopo...',
        'ooooooooo...',
        'owkooowko...',
        'okkoookko...',
        'oppomoppo...',
        '.ooooooo....',
        '..occco...o.',
        '.oocccoo.oo.',
        '..occcoooo..',
        '..oo..oo....',
      ],
      eyesShut: { 4: 'ooooooooo...' },
      tear: { 6: 'obpomoppo...' },
      feetApart: { 11: '.oo....oo...' },
      head: { top: 2, eye: 4, left: 0, right: 8 },
      accessory: { rows: ['r...r', 'rrRrr', 'r...r'], x: 5, y: 0, ink: RIBBON },
    },
    rare: { name: 'celestial', ink: { o: 0xfff1d0, p: 0xffc9e3, c: 0xffffff }, overlay: { rows: ['.yyyy.', 'y....y'], x: 1, y: -2, ink: { y: 0xffe36e } } },
    adults: {
      worker: {
        rows: [
          '.o......o...',
          '.oo....oo...',
          '.opoooopo...',
          'ooooooooo...',
          'owkooowko...',
          'okkoookko...',
          'oppomoppo...',
          '.ooooooo....',
          '..bOOOb...o.',
          '.obOOObo.oo.',
          '..bOOObooo..',
          '..bb..bb....',
        ],
        eyesShut: { 4: 'ooooooooo...' },
        tear: { 6: 'obpomoppo...' },
        feetApart: { 11: '.bb....bb...' },
        ink: { b: 0x5b7fb8, O: 0x7fa6e0 },
      },
      scholar: {
        rows: [
          '.o......o...',
          '.oo....oo...',
          '.opoooopo...',
          'ooooooooo...',
          'gwkgggwkg...',
          'okkoookko...',
          'oppomoppo...',
          '.ooooooo....',
          '..rrwrr...o.',
          '.orrwrro.oo.',
          '..rrrrrooo..',
          '..oo..oo....',
        ],
        eyesShut: { 4: 'ggggggggg...' },
        tear: { 6: 'obpomoppo...' },
        feetApart: { 11: '.oo....oo...' },
        ink: { g: 0x6b5a4a, r: 0xb85a5a },
      },
      gamer: {
        rows: [
          '.h......h...',
          '.hh....hh...',
          '.hhhhhhhh...',
          'hhooooooh...',
          'hwkooowkh...',
          'hkkoookkh...',
          'hppomopph...',
          '.hooooohh...',
          '..hhhhh...o.',
          '.ohhwhho.oo.',
          '..hhhhhooo..',
          '..oo..oo....',
        ],
        eyesShut: { 4: 'hoooooooh...' },
        tear: { 6: 'hbpomopph...' },
        feetApart: { 11: '.oo....oo...' },
        ink: { h: 0x7a6fb8 },
      },
      sweetie: {
        rows: [
          'oo......oo..',
          'ooo....ooo..',
          'oopoooopoo..',
          'oooooooooo..',
          'owkooowkoo..',
          'okkoookkoo..',
          'oppomoppoo..',
          'oooooooooo..',
          '.oocHcco.oo.',
          'ooccHHcooooo',
          '.oocccco.oo.',
          '..oo..oo....',
        ],
        eyesShut: { 4: 'oooooooooo..' },
        tear: { 6: 'obpomoppoo..' },
        feetApart: { 11: '.oo....oo...' },
        ink: { H: 0xff87af },
      },
    },
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
    teen: {
      rows: [
        '....oo......',
        '...oo.......',
        '..oooooo....',
        '.oooooooo...',
        'oowkoowkoo..',
        'ookkookkoo..',
        'oppoyyoppo..',
        '.oooooooo...',
        '.loooooool..',
        '..oooooo....',
        '..oooooo....',
        '..yy..yy....',
      ],
      eyesShut: { 4: 'oooooooooo..' },
      tear: { 6: 'obpoyyoppo..' },
      feetApart: { 11: '.yy....yy...' },
      head: { top: 2, eye: 4, left: 0, right: 9 },
      accessory: { rows: ['.f.', 'fYf', '.f.'], x: 5, y: 0, ink: BLOOM },
    },
    rare: { name: 'phoenix', ink: { o: 0xff9a5c, l: 0xffc46b, y: 0xffd447 }, overlay: { rows: ['.r.r', 'rrrr', '.rr.'], x: 3, y: -3, ink: { r: 0xff5f5f } } },
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
    teen: {
      rows: [
        '..oooooo....',
        '.oooooooo...',
        'ddoooooodd..',
        'ddoooooodd..',
        'ddwkoowkdd..',
        'ddkkookkdd..',
        '.dpcmmcpd...',
        '..occcco....',
        '..oooooo.o..',
        '.oocccooooo.',
        '..occcoo....',
        '..oo..oo....',
      ],
      eyesShut: { 4: 'ddoooooodd..' },
      tear: { 6: '.dbcmmcpd...' },
      feetApart: { 11: '.oo....oo...' },
      head: { top: 0, eye: 4, left: 0, right: 9 },
      accessory: { rows: ['ssssss', '.sS...'], x: 2, y: 7, ink: SCARF },
    },
    rare: { name: 'moon wolf', ink: { o: 0xc3cde0, d: 0x6b7894, c: 0xeef2fa }, overlay: { rows: ['.y.', 'yyy'], x: 4, y: 1, ink: { y: 0xfff3b0 } } },
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
    teen: {
      rows: [
        '.....o......',
        '....ooo.....',
        '...olooo....',
        '..oloooooo..',
        '.oloooooooo.',
        '.owkoooowko.',
        '.okkooookko.',
        '.oppommoppo.',
        'oooooooooooo',
        'oooooooooooo',
        'oooooooooooo',
        'dddddddddddd',
      ],
      eyesShut: { 5: '.oooooooooo.' },
      tear: { 7: '.obpommoppo.' },
      feetApart: { 11: '.dddddddddd.' },
      head: { top: 1, eye: 5, left: 1, right: 10 },
      accessory: { rows: ['y.y.y', 'yyyyy'], x: 4, y: -2, ink: GOLD },
    },
    rare: { name: 'king', ink: { o: 0xb9a2ff, l: 0xe2d8ff, d: 0x8a6fe0, m: 0x6a50b8 }, overlay: { rows: ['y.y.y.y', 'yyyyyyy', 'yRyRyRy'], x: 3, y: -3, ink: { y: 0xffd447, R: 0xff6b8a } } },
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
    teen: {
      rows: [
        '..oo..oo....',
        '..op..po....',
        '..op..po....',
        '.oooooooo...',
        'oowkoowkoo..',
        'ookkookkoo..',
        'oppommoppo..',
        '.oooooooo...',
        '..occcco....',
        '.oocccoocc..',
        '..occcco....',
        '..oo..oo....',
      ],
      eyesShut: { 4: 'oooooooooo..' },
      tear: { 6: 'obpommoppo..' },
      feetApart: { 11: '.oo....oo...' },
      head: { top: 3, eye: 4, left: 0, right: 9 },
      accessory: { rows: ['r...r', 'rrRrr', 'r...r'], x: 2, y: 0, ink: RIBBON },
    },
    rare: { name: 'moon', ink: { o: 0xdcdcf4, c: 0xf6f6ff }, overlay: { rows: ['.mm', 'm..', 'm..', '.mm'], x: 9, y: -1, ink: { m: 0xfff3b0 } } },
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
    teen: {
      rows: [
        '.oo.....oo..',
        '.opooooopo..',
        'oooooooooo..',
        'owkoooowko..',
        'okkooookko..',
        'oppccmccppo.',
        'oocccccccoo.',
        'occccccccco.',
        'occccccccco.',
        '.occcccccco.',
        '..oo....oo..',
        '..pp....pp..',
      ],
      eyesShut: { 3: 'oooooooooo..' },
      tear: { 5: 'obpccmccppo.' },
      feetApart: { 11: '.pp......pp.' },
      head: { top: 1, eye: 3, left: 0, right: 9 },
      accessory: { rows: ['..gg', '.gg.', 'gg..'], x: 7, y: -1, ink: LEAF },
    },
    rare: { name: 'golden', ink: { o: 0xffcf4d, c: 0xfff1c0 }, overlay: { rows: ['.s.', 'sws', '.s.'], x: 9, y: -2, ink: { s: 0xffe36e, w: 0xffffff } } },
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
    teen: {
      rows: [
        '...oooooo...',
        '..oooooooo..',
        '.ooccooccoo.',
        '.occeccecco.',
        '.oceecceeco.',
        '.ocpcyycpco.',
        'oocccccccoo.',
        'oocccccccoo.',
        '.occcccccco.',
        '.occcccccco.',
        '..occcccco..',
        '...yy..yy...',
      ],
      eyesShut: { 3: '.occcccccco.' },
      tear: { 5: '.ocbcyycpco.' },
      feetApart: { 11: '..yy....yy..' },
      head: { top: 0, eye: 4, left: 1, right: 10 },
      accessory: { rows: ['rrRRrr'], x: 3, y: 7, ink: RIBBON },
    },
    rare: { name: 'emperor', ink: { o: 0x2f3a66, p: 0xffc46b, y: 0xffb03b }, overlay: { rows: ['yyyy', 'y..y'], x: 4, y: 2, ink: { y: 0xffd447 } } },
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
    teen: {
      rows: [
        '.oooo..oooo.',
        '.owko..owko.',
        '.okko..okko.',
        'oooooooooooo',
        'oppooooooppo',
        'oooommmmoooo',
        '.oooooooooo.',
        '..occcccco..',
        '.ooccccccoo.',
        'oo.cccccc.oo',
        '..occcccco..',
        '.ooo....ooo.',
      ],
      eyesShut: { 1: '.oooo..oooo.' },
      tear: { 4: 'obpooooooppo' },
      feetApart: { 11: 'ooo......ooo' },
      head: { top: 0, eye: 1, left: 1, right: 10 },
      accessory: { rows: ['y.y.y', 'yyyyy'], x: 4, y: -2, ink: GOLD },
    },
    rare: { name: 'prince', ink: { o: 0x5fc9b8, m: 0x2f8a7c, c: 0xd8f7f0 }, overlay: { rows: ['y.y.y', 'yyyyy', 'yRyRy'], x: 4, y: -3, ink: { y: 0xffd447, R: 0x6fa8dc } } },
    head: { big: { top: 1, eye: 2, left: 1, right: 10 }, mini: { top: 0, eye: 1, left: 1, right: 6 } },
    accessory: {
      slot: 'head',
      big: { rows: ['y.y.y', 'yyyyy'], x: 4, y: 0, ink: GOLD },
      mini: { rows: ['yy'], x: 3, y: 0, ink: GOLD },
    },
    purr: 'ribbit',
  },
}
