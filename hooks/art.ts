/**
 * Hi-res art: pets drawn at 32×32 with outlines, shading and highlights, for the surfaces
 * that can show more than half-block cells (an SVG card on desktop, VS Code and mobile; an
 * image in kitty and Ghostty). Where a species and stage has none, the 12×12 sprite is used,
 * so art can arrive one drawing at a time.
 *
 * Same shape as a Sprite: rows of marks, colors in `ink`, and the rows that replace the eyes,
 * the cheek and the feet, by index.
 */
import type { Stage } from './scene'
import type { Sprite } from './species'

export type Art = Sprite & { ink: Readonly<Record<string, number>> }

/** Pixels of hi-res art per pixel of the 12×12 sprite it stands in for. */
export const ART_SIDE = 32

const CAT_BABY: Art = {
  rows: [
    '................................',
    '.....K....................K.....',
    '.....KKK................KKK.....',
    '.....KhhKK....KKKK....KKssK.....',
    '.....KhpohKKKKhhhhKKKKhhpsK.....',
    '.....KhpppohhhhoooohhhpppsK.....',
    '.....KhppppooooooooooppppsK.....',
    '.....KppppooooooooooooppppK.....',
    '.....KppooooooooooooooooppK.....',
    '.....KhoooeeooooooooeeoossK.....',
    '.....KhoowweeoooooowweeoosK.....',
    '.....KhoowweeoooooowweeossK.....',
    '....KhhooeeeeooooooeeeeosssK....',
    '.....KoooeeewooooooeeewossK.....',
    '.....KhoooeeooooooooeeosssKKKK..',
    '.....bbboooooccnnccoooosbbbooK..',
    '......KooooocmcmmcmcossssKKooK..',
    '......KsooocccmccmccCssssK.KoK..',
    '.......KKsssccccCCCCsssKK..KooK.',
    '.........KsssCCCCCCsssK....KooK.',
    '.........KKKKKssssKKKKK....KooK.',
    '........KhhoooKKKKooossK...KooK.',
    '........KhoooccccccoossK...KoK..',
    '........KhooccccccccossK..KooK..',
    '........KhoccccccccccssK.KoooK..',
    '........KhocccccccccCssKKoooK...',
    '........KhoccccccccCCssKoooKK...',
    '.........KKKKCCCCCCKKKKooKK.....',
    '.........KsssKCCCCKsssKKK.......',
    '........KsssssKKKKsssssK........',
    '.........KKKKK....KKKKK.........',
    '................................',
  ],
  eyesShut: {
    9: '.....KhooooooooooooooooossK.....',
    10: '.....KhoooooooooooooooooosK.....',
    11: '.....KhoeooooeooooeooooessK.....',
    13: '.....KoooooooooooooooooossK.....',
    14: '.....KhoooooooooooooooosssKKKK..',
  },
  tear: {
    15: '.....bbbootooccnnccoooosbbbooK..',
    16: '......KoootocmcmmcmcossssKKooK..',
  },
  feetApart: {
    27: '.........KKKCCCCCCCCKKKooKK.....',
    28: '........KsssKCCCCCCKsssKK.......',
    29: '.......KsssssKKKKKKsssssK.......',
    30: '........KKKKK......KKKKK........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x8a5040, // mouth
    n: 0xd9748a, // nose
    t: 0x87d7ff, // tear
    K: 0x6b4636, // outline
    o: 0xffcf7d, // fur
    s: 0xeba65a, // in shade
    h: 0xffe6ae, // in light
    c: 0xfff4dc, // muzzle and belly
    C: 0xf5e0c0, // belly in shade
  },
}

const CAT_TEEN: Art = {
  rows: [
    '.....K...................K......',
    '.....KK...........KK....KKKK....',
    '.....KhKK.........KrK.KKsKrK....',
    '.....KhohKKKKKKKKKKrrKRRKrrK....',
    '.....KpppohhhhhhhhKrKhKKpKrK....',
    '.....KpppppoooooooKKpppppKKK....',
    '.....KppppoooooooooooppppK......',
    '.....KppoooooooooooooooppK......',
    '.....KhoooeeooooooooeeossK......',
    '.....KhoowweeoooooowweessK......',
    '.....KhoowweeoooooowweessK.K....',
    '.....KhooeeewooooooeeewssKKoK...',
    '.....KhoooeeooooooooeesssKKoK...',
    '.....bbboooooocnnoooosssbbbooK..',
    '......KooooocmcmmcmossssK.KooK..',
    '.......KsoocccmccmCCsssK..KooK..',
    '........KsssCCCCCCCsssK....KoK..',
    '.........KKssCCCCCssKK.....KoK..',
    '..........KKKKKKKKKKK......KoK..',
    '.........KhhooooooossK.....KoK..',
    '........KKKoocccccosKKK...KooK..',
    '........KoKocccccccsKoK...KooK..',
    '.......KooKocccccccsKooK.KooK...',
    '.......KooKoccccccCsKooKKoooK...',
    '.......KKKhocccccCCssKKKoooK....',
    '..........KsCCCCCCCsKooooKK.....',
    '...........KsCCCCCsKKKKKK.......',
    '..........KhKKKKKKKsK...........',
    '..........KsssK.KsssK...........',
    '..........KsssK.KsssK...........',
    '...........KKK...KKK............',
    '................................',
  ],
  eyesShut: {
    8: '.....KhoooooooooooooooossK......',
    9: '.....KhoooooooooooooooossK......',
    10: '.....KhoeooooeooooeooooesK.K....',
    11: '.....KhooeeeeooooooeeeessKKoK...',
    12: '.....KhooooooooooooooosssKKoK...',
  },
  tear: {
    13: '.....bbbootooocnnoooosssbbbooK..',
    14: '......KoootocmcmmcmossssK.KooK..',
  },
  feetApart: {
    26: '..........KKsCCCCCsKKKKKK.......',
    27: '.........KhsKKKKKKKssK..........',
    28: '.........KsssK...KsssK..........',
    29: '.........KsssK...KsssK..........',
    30: '..........KKK.....KKK...........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x8a5040, // mouth
    n: 0xd9748a, // nose
    t: 0x87d7ff, // tear
    K: 0x6b4636, // outline
    o: 0xffcf7d, // fur
    s: 0xeba65a, // in shade
    h: 0xffe6ae, // in light
    c: 0xfff4dc, // muzzle and belly
    C: 0xf5e0c0, // belly in shade
    r: 0xff6b8a,
    R: 0xd94f6e,
  },
}

const CHICK_BABY: Art = {
  rows: [
    '................................',
    '...............KKK..............',
    '...............KoK..............',
    '..............KoK...............',
    '..............KK...KK...........',
    '..............KK..KoKK..........',
    '..............KKKKKK............',
    '...........KKKhhhhKKK...........',
    '.........KKhhhhoooohhKK.........',
    '........KhhhoooooooooohK........',
    '.......KhhooooooooooooooK.......',
    '......KhhooooooooooooooosK......',
    '.....KhhooeeooooooooeeoossK.....',
    '.....KhoowweeoooooowweeoosK.....',
    '.....KhoowweeoooooowweeoosK.....',
    '....KhhooeeeeooooooeeeeoossK....',
    '...KKKoooeeewooooooeeewoosKKK...',
    '...KooKoooeeooooooooeeoooKooK...',
    '..KoobbboooooooyyooooooobbbssK..',
    '...KoosKooooooyyyyooooooKoosK...',
    '...KoooKoooooooYYoooooooKoosK...',
    '...KoossKoooollllllooooKoossK...',
    '....KssKooollllllllllossKssK....',
    '.....KKKoollllllllllllssKKK.....',
    '.......KsollllllllllllssK.......',
    '........KsllllllllllllsK........',
    '.........KllllllllllllK.........',
    '..........KllllllllllK..........',
    '.........KYYYllllllYYYK.........',
    '.........KYYYYK..KYYYYK.........',
    '..........KKKK....KKKK..........',
    '................................',
  ],
  eyesShut: {
    12: '.....KhhoooooooooooooooossK.....',
    13: '.....KhoooooooooooooooooosK.....',
    14: '.....KhoeooooeooooeooooeosK.....',
    16: '...KKKooooooooooooooooooosKKK...',
    17: '...KooKooooooooooooooooooKooK...',
  },
  tear: {
    18: '..KoobbbootooooyyooooooobbbssK..',
    19: '...KoosKootoooyyyyooooooKoosK...',
  },
  feetApart: {
    27: '.........KKllllllllllKK.........',
    28: '........KYYYYllllllYYYYK........',
    29: '........KYYYYK....KYYYYK........',
    30: '.........KKKK......KKKK.........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x8a5040, // mouth
    n: 0xd9748a, // nose
    t: 0x87d7ff, // tear
    K: 0x8a5a2a, // outline
    o: 0xffe98a, // fur
    s: 0xf2c55a, // in shade
    h: 0xfff6c9, // in light
    l: 0xfff6c9, // light patch
    y: 0xffa54a, // beak and feet
    Y: 0xe0782a, // beak in shade
  },
}

const CHICK_TEEN: Art = {
  rows: [
    '.............KKK...K............',
    '............KoK..KKoK...........',
    '............KK..KoKK............',
    '............KK..KK..............',
    '............KoKKoK..............',
    '.............KooK.......K.......',
    '............KKKKKKKK...KfK......',
    '..........KKhhhhhhhhKKKfffKK....',
    '.........KhhhooooooooKfgggfK....',
    '........KhhooooooooooKfgggfK....',
    '.......KhhooooooooooooKfffK.....',
    '......KhhoooooooooooooKKKKK.....',
    '......KhooeeooooooooeeoosK......',
    '.....KhhowweeoooooowweeossK.....',
    '.....KhoowweeoooooowweeossK.....',
    '.KKK.KhooeeewooooooeeewossK.KKK.',
    'KoooKKhoooeeooooooooeeoossKKossK',
    '.KooobbboooooooyyooooooobbboosK.',
    '.KoooosKooooooyyyyooooooKooossK.',
    '..KsoooKoooooooYYoooooooKosssK..',
    '...KKsssKooooolllloooooKsssKK...',
    '.....KKKKooolllllllloooKKKK.....',
    '......KoooollllllllllosssK......',
    '......KhoollllllllllllsssK......',
    '.......KoollllllllllllssK.......',
    '........KsllllllllllllsK........',
    '.........KsllllllllllsK.........',
    '..........KKllllllllKK..........',
    '.........KKKKKllllKKKKK.........',
    '.........KYYYYK..KYYYYK.........',
    '..........KKKK....KKKK..........',
    '................................',
  ],
  eyesShut: {
    12: '......KhoooooooooooooooosK......',
    13: '.....KhhoooooooooooooooossK.....',
    14: '.....KhoeooooeooooeooooessK.....',
    15: '.KKK.KhooeeeeooooooeeeeossK.KKK.',
    16: 'KoooKKhooooooooooooooooossKKossK',
  },
  tear: {
    17: '.KooobbbootooooyyooooooobbboosK.',
    18: '.KoooosKootoooyyyyooooooKooossK.',
  },
  feetApart: {
    28: '........KKKKKKllllKKKKKK........',
    29: '........KYYYYK....KYYYYK........',
    30: '.........KKKK......KKKK.........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    t: 0x87d7ff, // tear
    K: 0x8a5a2a, // outline
    o: 0xffe98a, // fur
    s: 0xf2c55a, // in shade
    h: 0xfff6c9, // in light
    l: 0xfff6c9, // light patch
    y: 0xffa54a, // beak and feet
    Y: 0xe0782a, // beak in shade
    g: 0xffd447,
    f: 0xfffaf0,
  },
}

const DOG_BABY: Art = {
  rows: [
    '................................',
    '................................',
    '................................',
    '.............KKKKKK.............',
    '..........KKKhhhhhhKKK..........',
    '.........KhhhhoooooohhK.........',
    '......KKKhhooooooooooooKKK......',
    '.....KdDKhoooooooooooooKddK.....',
    '....KddDKooooooooooooooKdddK....',
    '...KdddDKoeeooooooooeeoKdddDK...',
    '...KdddDKwweeoooooowweeKdddDK...',
    '...KdddDKwweeoooooowweeKddddK...',
    '..KddddDKeeeeooooooeeeeKddddDK..',
    '..KddddDKeeewooooooeeewKddddDK..',
    '..KdddDDKoeeoccccccoeeoKddddDK..',
    '..KdddbbboooccnnnnccooobbbdDDK..',
    '...KDDDKoooccccnnccccsssKDdDK...',
    '...KDKKsoooccmcmmcmccssssKKDKK..',
    '....K..KKsscccmccmcccssKK..KoK..',
    '.........KssccccccccssK....KoK..',
    '.........KKKKsccccsKKKK....KoK..',
    '........KhhooKKKKKKoossK..KooK..',
    '........KhoooccccccoossK.KooK...',
    '........KhooccccccccossKKoooK...',
    '........KhooccccccccossKoooK....',
    '........KhocccccccccCssKKKK.....',
    '........KsocccccccCCCssK........',
    '.........KKKKKCCCCKKKKK.........',
    '........KsssssKCCKsssssK........',
    '........KsssssKKKKsssssK........',
    '.........KKKKK....KKKKK.........',
    '................................',
  ],
  eyesShut: {
    9: '...KdddDKooooooooooooooKdddDK...',
    10: '...KdddDKooooooooooooooKdddDK...',
    11: '...KdddDeooooeooooeooooeddddK...',
    13: '..KddddDKooooooooooooooKddddDK..',
    14: '..KdddDDKooooccccccooooKddddDK..',
  },
  tear: {
    15: '..KdddbbbotoccnnnnccooobbbdDDK..',
    16: '...KDDDKootccccnnccccsssKDdDK...',
  },
  feetApart: {
    27: '........KKKKKCCCCCCKKKKK........',
    28: '.......KsssssKCCCCKsssssK.......',
    29: '.......KsssssKKKKKKsssssK.......',
    30: '........KKKKK......KKKKK........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x8a5040, // mouth
    n: 0x4a3030, // nose
    t: 0x87d7ff, // tear
    K: 0x5a3a2a, // outline
    o: 0xe8c39e, // fur
    s: 0xcc9c72, // in shade
    h: 0xf7dfc4, // in light
    c: 0xfff3dc, // muzzle and belly
    C: 0xf0dcc0, // belly in shade
    d: 0xa8754f, // ears
    D: 0x83563a, // ears in shade
  },
}

const DOG_TEEN: Art = {
  rows: [
    '................................',
    '................................',
    '............KKKKKKK.............',
    '..........KKhhhhhhhKK...........',
    '........KKhhhooooooohKK.........',
    '.....KKKhhhooooooooooosKKK......',
    '....KddDKoooooooooooooKdddK.....',
    '...KdddDKoeeooooooooeeKdddDK....',
    '...KdddDKwweeoooooowweedddDK....',
    '...KdddDKwweeoooooowweeddddK....',
    '..KdddDDKeeewooooooeeewddddDK...',
    '..KdddDKooeeooooooooeesKdddDK...',
    '..KdddbbboooccnnnncooosbbbdDK...',
    '..KddDDKoooccccnncccossKdddDK...',
    '..KDDDKsoooccmcmmcmcssssKDDDKK..',
    '...KKK.KssscccmccmccsssK.KKKoK..',
    '........KKscccccccccsKK...KooK..',
    '..........KKKcccccKKK.....KoK...',
    '........KKKKuuuuuuuKKKK...KoK...',
    '........KKuuuuuuuuuuuKK..KooK...',
    '.........KKKKKKKKKuuKK..KooK....',
    '.........KhoocccccKuKKKKooK.....',
    '.........KhoccccccKuKKoooK......',
    '.........KhoccccccKuKKKKK.......',
    '.........KhocccccCKKKK..........',
    '..........KsCCCCCCKsK...........',
    '...........KsCCCCCsK............',
    '..........KhKKKKKKKsK...........',
    '..........KsssK.KsssK...........',
    '..........KsssK.KsssK...........',
    '...........KKK...KKK............',
    '................................',
  ],
  eyesShut: {
    7: '...KdddDKoooooooooooooKdddDK....',
    8: '...KdddDKoooooooooooooKdddDK....',
    9: '...KdddDeooooeooooeoooKedddK....',
    10: '..KdddDDKeeeeooooooeeeeddddDK...',
    11: '..KdddDKoooooooooooooosKdddDK...',
  },
  tear: {
    12: '..KdddbbbotoccnnnncooosbbbdDK...',
    13: '..KddDDKootccccnncccossKdddDK...',
  },
  feetApart: {
    26: '..........KKsCCCCCsKK...........',
    27: '.........KhsKKKKKKKssK..........',
    28: '.........KsssK...KsssK..........',
    29: '.........KsssK...KsssK..........',
    30: '..........KKK.....KKK...........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    m: 0x8a5040, // mouth
    n: 0x4a3030, // nose
    t: 0x87d7ff, // tear
    K: 0x5a3a2a, // outline
    o: 0xe8c39e, // fur
    s: 0xcc9c72, // in shade
    h: 0xf7dfc4, // in light
    c: 0xfff3dc, // muzzle and belly
    C: 0xf0dcc0, // belly in shade
    d: 0xa8754f, // ears
    D: 0x83563a, // ears in shade
    u: 0x6fa8dc,
  },
}

const SLIME_BABY: Art = {
  rows: [
    '................................',
    '................................',
    '................................',
    '................................',
    '.................KKK............',
    '................KssK............',
    '...............KssKK............',
    '...............KsK..............',
    '..............KssK..............',
    '..............KsK...............',
    '..............KhK...............',
    '..........KKKKhhoKKKKK..........',
    '........KKhhhhhooohhhhKK........',
    '.......KwwhoooooooooooohK.......',
    '......KwwweeooooooooeeoooK......',
    '.....KhwwwweeoooooowweeoosK.....',
    '....KhhwwwweeoooooowweeoossK....',
    '...KhhoooeeeeooooooeeeeoosssK...',
    '...KhooooeeewooooooeeewooossK...',
    '...KhoooooeeooooooooeeoooossK...',
    '...KbbbooooooomoomooooooobbbK...',
    '..KhhoooooooooommoooooooollssK..',
    '..KhooooooooooooooooooooossssK..',
    '...KooooooooooooooooooooosssK...',
    '...KhoooooooooooooooooolssssK...',
    '...KhooooooooooooooooolllsssK...',
    '...KssssssssssssssssssslssssK...',
    '....KssssssssssssssssssssssK....',
    '.....KssssssssssssssssssssK.....',
    '......KKKKKKKKKKKKKKKKKKKK......',
    '................................',
    '................................',
  ],
  eyesShut: {
    14: '......KwwwoooooooooooooooK......',
    15: '.....KhwwwooooooooooooooosK.....',
    16: '....KhhweooooeooooeooooeossK....',
    18: '...KhooooooooooooooooooooossK...',
    19: '...KhooooooooooooooooooooossK...',
  },
  tear: {
    20: '...KbbboootooomoomooooooobbbK...',
    21: '..KhhoooootoooommoooooooollssK..',
  },
  feetApart: {
    24: '...KhooooooooooooooooooloossK...',
    27: '..KssssssssssssssssssssssssssK..',
    28: '...KssssssssssssssssssssssssK...',
    29: '....KKKKKKKKKKKKKKKKKKKKKKKK....',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x3f7a4f, // mouth
    n: 0xd9748a, // nose
    t: 0x87d7ff, // tear
    K: 0x3f7a4f, // outline
    o: 0x9fe0a8, // fur
    s: 0x6fbf7f, // in shade
    h: 0xc8f0cd, // in light
    l: 0xe0f7e3, // light patch
  },
}

const SLIME_TEEN: Art = {
  rows: [
    '................................',
    '................................',
    '............K......K............',
    '............K..KK..K............',
    '...........KgK.KK.KgK...........',
    '...........KggKggKggK...........',
    '............KgggrgggK...........',
    '............KKKKKKKKK...........',
    '..........KKhhhhhhhhKK..........',
    '........KKhhhoooooooohKK........',
    '.......KhhhoooooooooooohK.......',
    '......KhwwoooooooooooooosK......',
    '.....KhwwwooooooooooooooosK.....',
    '....KhwwwoooooooooooooooossK....',
    '....KhwwooeeooooooooeeooossK....',
    '...KhhooowweeoooooowweeoosssK...',
    '...KhoooowweeoooooowweeoosssK...',
    '...KhooooeeewooooooeeewoosssK...',
    '...KhoooooeeooooooooeeooosssK...',
    '...KbbbooooooomoomooooooobbbK...',
    '...KhoooooooooommoooooooollsK...',
    '...KhoooooooooooooooooooosssK...',
    '...KhooooooooooooooooooossssK...',
    '...KhooooooooooooooooooossssK...',
    '...KhoooooooooooooooooollsssK...',
    '....KoooooooooooooooooollssK....',
    '....KssssssssssssssssssssssK....',
    '....KssssssssssssssssssssssK....',
    '.....KssssssssssssssssssssK.....',
    '......KKKKKKKKKKKKKKKKKKKK......',
    '................................',
    '................................',
  ],
  eyesShut: {
    14: '....KhwwooooooooooooooooossK....',
    15: '...KhhooooooooooooooooooosssK...',
    16: '...KhoooeooooeooooeooooeosssK...',
    17: '...KhooooeeeeooooooeeeeoosssK...',
    18: '...KhoooooooooooooooooooosssK...',
  },
  tear: {
    19: '...KbbboootooomoomooooooobbbK...',
    20: '...KhoooootoooommoooooooollsK...',
  },
  feetApart: {
    27: '..KKssssssssssssssssssssssssKK..',
    28: '...KssssssssssssssssssssssssK...',
    29: '....KKKKKKKKKKKKKKKKKKKKKKKK....',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    m: 0x3f7a4f, // mouth
    t: 0x87d7ff, // tear
    K: 0x3f7a4f, // outline
    o: 0x9fe0a8, // fur
    s: 0x6fbf7f, // in shade
    h: 0xc8f0cd, // in light
    l: 0xe0f7e3, // light patch
    r: 0xff6b8a,
    g: 0xffd447,
  },
}

const BUNNY_BABY: Art = {
  rows: [
    '.........KKK........KKK.........',
    '.........KooK......KooK.........',
    '........KopoK......KopoK........',
    '........KoppK......KppoK........',
    '........KoppoK....KoppoK........',
    '........KoppoK....KoppoK........',
    '........KoppoK....KoppoK........',
    '........KoppoK....KoppoK........',
    '........KoppoK....KoppoK........',
    '.........KpKKKKKKKKKKpK.........',
    '.........KKhhhhhhhhhhKK.........',
    '........KhhhoooooooooohK........',
    '.......KhheeooooooooeeooK.......',
    '......KhhwweeoooooowweeosK......',
    '.....KhhowweeoooooowweeossK.....',
    '.....KhooeeeeooooooeeeeossK.....',
    '.....KhooeeewooooooeeewossK.....',
    '.....KhoooeeooooooooeeosssK.....',
    '.....bbbooooooonnooooossbbb.....',
    '......KoooooomommomoossssK......',
    '.......KsooooomoomosssssK.......',
    '........KssssssssssssssK........',
    '.........KKssssssssssKK..KK.....',
    '.........KhKKKKKKKKKKsK.KccK....',
    '........KhhoccccccccsssKccccK...',
    '........KhocccccccccCssKccccK...',
    '.........KocccccccCCCsK.KccK....',
    '.........KsKKCCCCCCKKsK..KK.....',
    '.........KKCCKKCCKKCCKK.........',
    '.........KCCCCKKKKCCCCK.........',
    '..........KKKK....KKKK..........',
    '................................',
  ],
  eyesShut: {
    12: '.......KhhooooooooooooooK.......',
    13: '......KhhooooooooooooooosK......',
    14: '.....KhheooooeooooeooooessK.....',
    16: '.....KhooooooooooooooooossK.....',
    17: '.....KhoooooooooooooooosssK.....',
  },
  tear: {
    18: '.....bbbootoooonnooooossbbb.....',
    19: '......KoootoomommomoossssK......',
  },
  feetApart: {
    27: '.........KKKCCCCCCCCKKK..KK.....',
    28: '........KKCCKKCCCCKKCCKK........',
    29: '........KCCCCKKKKKKCCCCK........',
    30: '.........KKKK......KKKK.........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x8a5040, // mouth
    n: 0xff87af, // nose
    t: 0x87d7ff, // tear
    K: 0x6a5a7a, // outline
    o: 0xece4f4, // fur
    s: 0xcbbfe0, // in shade
    h: 0xffffff, // in light
    c: 0xffffff, // muzzle and belly
    C: 0xe6e0ee, // belly in shade
  },
}

const BUNNY_TEEN: Art = {
  rows: [
    '.........KKK........KKK.........',
    '........KoooK......KoooK........',
    '........KopoK......KopoK........',
    '........KopoK......KopoK........',
    '........KoppoK....KoppoK........',
    '........KoppoK....KoppoK........',
    '........KoppoK...KKoppoK.K......',
    '.........KppoKKKKKrKpKKKKK......',
    '.........KpKKKhhhKrrKRKrrK......',
    '.........KKhhhhooKKKhKKKrK......',
    '.......KKhhhoooooKoooohKKK......',
    '.......KhhooooooooooooosK.......',
    '......KhhoeeooooooooeeoosK......',
    '......KhowweeoooooowweeosK......',
    '.....KhhowweeoooooowweesssK.....',
    '.....KhooeeewooooooeeewsssK.....',
    '......KoooeeooooooooeesssK......',
    '.....bbbooooooonnoooosssbbb.....',
    '.......KsoooomommomsssssK.......',
    '.......KKsssoomosmsssssKK.......',
    '.........KKssssssssssKK.........',
    '.........KoKKKssssKKKK..........',
    '........KooKocKKKKoKooK.........',
    '........KoKocccccccsKoKKK.......',
    '........KoKoccccccCsKoKcK.......',
    '........KKsoccccCCCssKKcK.......',
    '..........KssCCCCCssKKKKK.......',
    '..........KKKsCCCsKKK...........',
    '..........KCCKKKKKCCK...........',
    '..........KCCCK.KCCCK...........',
    '...........KKK...KKK............',
    '................................',
  ],
  eyesShut: {
    12: '......KhhooooooooooooooosK......',
    13: '......KhoooooooooooooooosK......',
    14: '.....KhheooooeooooeooooessK.....',
    15: '.....KhooeeeeooooooeeeesssK.....',
    16: '......KooooooooooooooosssK......',
  },
  tear: {
    17: '.....bbbootoooonnoooosssbbb.....',
    18: '.......KsotoomommomsssssK.......',
  },
  feetApart: {
    27: '.........KKKKsCCCsKKKK..........',
    28: '.........KCCCKKKKKCCCK..........',
    29: '.........KCCCK...KCCCK..........',
    30: '..........KKK.....KKK...........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x8a5040, // mouth
    n: 0xff87af, // nose
    t: 0x87d7ff, // tear
    K: 0x6a5a7a, // outline
    o: 0xece4f4, // fur
    s: 0xcbbfe0, // in shade
    h: 0xffffff, // in light
    c: 0xffffff, // muzzle and belly
    C: 0xe6e0ee, // belly in shade
    r: 0xff6b8a,
    R: 0xd94f6e,
  },
}

const HAMSTER_BABY: Art = {
  rows: [
    '................................',
    '................................',
    '................................',
    '................................',
    '......KKK..............KKK......',
    '.....KoooK............KoooK.....',
    '....KoopooK..........KoopooK....',
    '....KopppoKKKKKKKKKKKKopppoK....',
    '....KopppKKhhhhhhhhhhKKpppoK....',
    '.....KoKKhhhoooooooooohKKoK.....',
    '......KhhhoooooooooooooohK......',
    '.....KhhooeeooooooooeeooosK.....',
    '....KhhoowweeoooooowweeooosK....',
    '....KhooowweeoooooowweeooosK....',
    '...KhhoooeeeeooooooeeeeooossK...',
    '...KhooooeeewcccccceeewooossK...',
    '...KcccccceecccccccceeccccCCK...',
    '...KbbbccccccccnnccccccccbbbK...',
    '...KcccccccccmcmmcmcccccccCCK...',
    '...KccccccccccmccmccccccccCCK...',
    '...KcccccccccccccccccccccCCCK...',
    '...KcccccccccccccccccccccCCCK...',
    '....KoccccccccccccccccccCCsK....',
    '....KhoccccccccccccccccCCssK....',
    '.....KsccccccccccccccCCCCsK.....',
    '......KCccccccccccccCCCCCK......',
    '.......KKCccccccccCCCCCKK.......',
    '.........KCCCCCCCCCCCCK.........',
    '.........KKKCCCCCCCCKKK.........',
    '.........KppKKKKKKKKppK.........',
    '..........KKK......KKK..........',
    '................................',
  ],
  eyesShut: {
    11: '.....KhhooooooooooooooooosK.....',
    12: '....KhhooooooooooooooooooosK....',
    13: '....KhooeooooeooooeooooeoosK....',
    15: '...KhoooooooccccccccoooooossK...',
    16: '...KccccccccccccccccccccccCCK...',
  },
  tear: {
    17: '...KbbbccctccccnnccccccccbbbK...',
    18: '...KcccccctccmcmmcmcccccccCCK...',
  },
  feetApart: {
    28: '........KKKKCCCCCCCCKKKK........',
    29: '........KpppKKKKKKKKpppK........',
    30: '.........KKK........KKK.........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x8a5040, // mouth
    n: 0xd9748a, // nose
    t: 0x87d7ff, // tear
    K: 0x7a4a2a, // outline
    o: 0xf5b971, // fur
    s: 0xd9944e, // in shade
    h: 0xffd8a8, // in light
    c: 0xfff3dc, // muzzle and belly
    C: 0xf2dcc0, // belly in shade
  },
}

const HAMSTER_TEEN: Art = {
  rows: [
    '................................',
    '................................',
    '.....................KKK........',
    '....................KvvK........',
    '......KKKK.........KvvVKKK......',
    '.....KooooK........KvVKoooK.....',
    '.....KoppoK.KKKKKKKKVKoppoK.....',
    '.....KppppKKhhhhhhhhKKppppK.....',
    '.....KKpKKhhhoooooooohKKpKK.....',
    '.......KhhhoooooooooooohK.......',
    '......KhhooooooooooooooosK......',
    '.....KhhooeeooooooooeeooosK.....',
    '.....KhoowweeoooooowweeoosK.....',
    '....KhhoowweeoooooowweeoossK....',
    '....KhoooeeewooooooeeewooosK....',
    '....KccccceeoccccccoeeccccCK....',
    '...KbbbccccccccnnccccccccbbbK...',
    '...KcccccccccmcmmcmccccccCCCK...',
    '...KccccccccccmccmcccccccCCCK...',
    '....KccccccccccccccccccccCCK....',
    '....KcccccccccccccccccccCCCK....',
    '....KhocccccccccccccccccCssK....',
    '.....KoccccccccccccccccCCsK.....',
    '.....KhcccccccccccccccCCCsK.....',
    '......KsccccccccccccCCCCsK......',
    '.......KCccccccccccCCCCCK.......',
    '........KKCccccccCCCCCKK........',
    '..........KCCCCCCCCCCK..........',
    '..........KKKCCCCCCKKK..........',
    '.........KpppKKKKKKpppK.........',
    '..........KKKK....KKKK..........',
    '................................',
  ],
  eyesShut: {
    11: '.....KhhooooooooooooooooosK.....',
    12: '.....KhoooooooooooooooooosK.....',
    13: '....KhhoeooooeooooeooooeossK....',
    14: '....KhoooeeeeooooooeeeeooosK....',
    15: '....KcccccoooccccccoooccccCK....',
  },
  tear: {
    16: '...KbbbccctccccnnccccccccbbbK...',
    17: '...KcccccctccmcmmcmccccccCCCK...',
  },
  feetApart: {
    28: '.........KKKKCCCCCCKKKK.........',
    29: '........KppppKKKKKKppppK........',
    30: '.........KKKK......KKKK.........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x8a5040, // mouth
    n: 0xd9748a, // nose
    t: 0x87d7ff, // tear
    K: 0x7a4a2a, // outline
    o: 0xf5b971, // fur
    s: 0xd9944e, // in shade
    h: 0xffd8a8, // in light
    c: 0xfff3dc, // muzzle and belly
    C: 0xf2dcc0, // belly in shade
    v: 0x7cc576,
    V: 0x4f9a52,
  },
}

const PENGUIN_BABY: Art = {
  rows: [
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '............KKKKKKKK............',
    '..........KKhhhhhhhhKK..........',
    '........KKhhhoooooooohKK........',
    '.......KhhhoooooooooooosK.......',
    '......KhhoocccoooocccooosK......',
    '......KhoccccccooccccccosK......',
    '.....KhhcceecccccccceeccosK.....',
    '.....KhocwweeccccccwweecosK.....',
    '....KhhccwweeccccccwweeccssK....',
    '....KhocceeeecccccceeeeccssK....',
    '....KKKcceeewcccccceeewccKKK....',
    '....KssKcceecccccccceeccKooK....',
    '...KosKbbccccccyyccccccbbKosK...',
    '...KosKoocccccyyyycccccooKooK...',
    '..KoosKooccccccYYccccccosKoosK..',
    '..KossKoccccccccccccccccsKoosK..',
    '..KssKoocccccccccccccccCssKosK..',
    '..KsKKhocccccccccccccccCssKKsK..',
    '..KK..KoccccccccccccccCCsK..KK..',
    '......KsccccccccccccCCCCsK......',
    '.......KsCccccccccCCCCCsK.......',
    '........KKCCCCCCCCCCCCKK........',
    '..........KKCCCCCCCCKK..........',
    '.........KKKKKKKKKKKKKK.........',
    '.........KYYYYK..KYYYYK.........',
    '..........KKKK....KKKK..........',
    '................................',
  ],
  eyesShut: {
    11: '.....KhhccccccccccccccccosK.....',
    12: '.....KhoccccccccccccccccosK.....',
    13: '....KhhceccccecccceccccecssK....',
    15: '....KKKccccccccccccccccccKKK....',
    16: '....KssKccccccccccccccccKooK....',
  },
  tear: {
    17: '...KosKbbctccccyyccccccbbKosK...',
    18: '...KosKooctcccyyyycccccooKooK...',
  },
  feetApart: {
    28: '........KKKKKKKKKKKKKKKK........',
    29: '........KYYYYK....KYYYYK........',
    30: '.........KKKK......KKKK.........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x8a5040, // mouth
    n: 0xd9748a, // nose
    t: 0x87d7ff, // tear
    K: 0x23283c, // outline
    o: 0x4f5b82, // fur
    s: 0x3a4466, // in shade
    h: 0x6c79a6, // in light
    c: 0xfffaf0, // muzzle and belly
    C: 0xe4e2ee, // belly in shade
    y: 0xffb35f, // beak and feet
    Y: 0xe0832a, // beak in shade
  },
}

const PENGUIN_TEEN: Art = {
  rows: [
    '...............KK...............',
    '..............KffK..............',
    '.............KKffKK.............',
    '..........KKKrKKKKrKKK..........',
    '.........KrrrrrrrrrrrrK.........',
    '........KrrrrrrrrrrrrrrK........',
    '.......KrrrrrrrrrrrrrrrRK.......',
    '.......KrrrrrRRRRRRrrrrRK.......',
    '.......KRRRRRRRRRRRRRRRRK.......',
    '.....KKrRrRrRrRrRrRrRrRrRrK.....',
    '......KKrKrRrRrRrRrRrKrKrK......',
    '......KhhccKKKKKKKKKKccosK......',
    '.....KhhcceecccccccceeccssK.....',
    '.....KhocwweeccccccwweecssK.....',
    '.....KhccwweeccccccwweeccsK.....',
    '.....KKKceeewcccccceeewcKKK.....',
    '....KosKcceecccccccceeccKooK....',
    '...KossbbccccccyyccccccbboooK...',
    '..KoosKoocccccyyyycccccosKoosK..',
    '..KossKooccccccYYccccccosKoooK..',
    '.KossKhoccccccccccccccccssKoosK.',
    '.KssKKhocccccccccccccccCssKKssK.',
    '.KKK.KhoccccccccccccccCCssK.KKK.',
    '......KoccccccccccccccCCsK......',
    '.......KccccccccccccCCCCK.......',
    '.......KsccccccccccCCCCsK.......',
    '........KKCCCCCCCCCCCCKK........',
    '..........KCCCCCCCCCCK..........',
    '.........KKKKKKKKKKKKKK.........',
    '.........KYYYYK..KYYYYK.........',
    '..........KKKK....KKKK..........',
    '................................',
  ],
  eyesShut: {
    12: '.....KhhccccccccccccccccssK.....',
    13: '.....KhoccccccccccccccccssK.....',
    14: '.....KhceccccecccceccccecsK.....',
    15: '.....KKKceeeecccccceeeecKKK.....',
    16: '....KosKccccccccccccccccKooK....',
  },
  tear: {
    17: '...KossbbctccccyyccccccbboooK...',
    18: '..KoosKooctcccyyyycccccosKoosK..',
  },
  feetApart: {
    28: '........KKKKKKKKKKKKKKKK........',
    29: '........KYYYYK....KYYYYK........',
    30: '.........KKKK......KKKK.........',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    t: 0x87d7ff, // tear
    K: 0x23283c, // outline
    o: 0x4f5b82, // fur
    s: 0x3a4466, // in shade
    h: 0x6c79a6, // in light
    c: 0xfffaf0, // muzzle and belly
    C: 0xe4e2ee, // belly in shade
    y: 0xffb35f, // beak and feet
    Y: 0xe0832a, // beak in shade
    r: 0xff6b8a,
    R: 0xd94f6e,
    f: 0xfffaf0,
  },
}

const FROG_BABY: Art = {
  rows: [
    '................................',
    '................................',
    '................................',
    '................................',
    '.......KKKKK........KKKKK.......',
    '......KhcccsK......KhcccsK......',
    '.....KhcceecsK....KhcceecsK.....',
    '.....KccwweecK....KccwweecK.....',
    '.....KccwweecoKKKKhccwweecK.....',
    '.....KcceeeecoohhhhcceeeecK.....',
    '.....KhceeewooooooooceeewsK.....',
    '.....KhoceeooooooooooceeooK.....',
    '....KhhooooooooooooooooooosK....',
    '...KhhoooooooonoonooooooooosK...',
    '...KhoooooooooooooooooooooosK...',
    '..KhhooooooooooooooooooooosssK..',
    '..KhbbboooooooooooooooooobbbsK..',
    '...KooooooomoooooooomoooosssK...',
    '...KsooooooommmmmmmmooosssssK...',
    '....KssoooooooooooooossssssK....',
    '.....KKsssssoooosssssssssKK.....',
    '.......KKssssssssssssssKK.......',
    '........KKKKKKssssKKKKKK........',
    '.......KhhocccKKKKcccossK.......',
    '.......KhocccccccccccCssK.......',
    '.......KhoccccccccccCCssK.......',
    '........KsccccccccCCCCsK........',
    '........KKsCCCCCCCCCCsKK........',
    '.......KKKKKKCCCCCCKKKKKK.......',
    '......KKssssKKKKKKKKssssKK......',
    '........KKKK........KKKK........',
    '................................',
  ],
  eyesShut: {
    6: '.....KhcccccsK....KhcccccsK.....',
    7: '.....KcccccccK....KcccccccK.....',
    8: '.....KcecccceoKKKKhcecccceK.....',
    10: '.....KhcccccoooooooocccccsK.....',
    11: '.....KhocccoooooooooocccooK.....',
  },
  tear: {
    12: '....KhhootoooooooooooooooosK....',
    13: '...KhhoootoooonoonooooooooosK...',
  },
  feetApart: {
    28: '......KKKKKKCCCCCCCCKKKKKK......',
    29: '.....KKssssKKKKKKKKKKssssKK.....',
    30: '.......KKKK..........KKKK.......',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    p: 0xffa8c8, // inner ears
    m: 0x8a5040, // mouth
    n: 0x4f8a4a, // nose
    t: 0x87d7ff, // tear
    K: 0x2f5a3a, // outline
    o: 0x8fd18a, // fur
    s: 0x62a866, // in shade
    h: 0xc2ecb6, // in light
    c: 0xf4fae0, // muzzle and belly
    C: 0xdcebc0, // belly in shade
  },
}

const FROG_TEEN: Art = {
  rows: [
    '................................',
    '................................',
    '.............K....K.............',
    '.............K.KK.K.............',
    '.......KKKKKKgKggKgKKKKKK.......',
    '......KhcccsKggggggKhcccsK......',
    '.....KhcceecsKggrggKcceecsK.....',
    '.....KccwweecKKKKKKKcwweecK.....',
    '.....KccwweecoKKKKhccwweecK.....',
    '.....KcceeewcoohhhhcceeewcK.....',
    '.....KhcceecoooooooocceecoK.....',
    '....KhhoocoooooooooooocooosK....',
    '...KhhoooooooonoonoooooooossK...',
    '...KhooooooooooooooooooooossK...',
    '...KhooooooooooooooooooooossK...',
    '...KbbboooooooooooooooooobbbK...',
    '...KhoooooomoooooooomooossssK...',
    '...KsooooooommmmmmmmooosssssK...',
    '....KKssoooooooooooossssssKK....',
    '......KssssssssssssssssssK......',
    '.......KKKssssssssssssKKK.......',
    '........KKKKKKKKKKKKKKKK........',
    '.......KooKccccccccccKooK.......',
    '......KooKoccccccccccsKooK......',
    '......KooKocccccccccCsKooK......',
    '......KKKhoccccccccCCssKKK......',
    '.........KsCccccCCCCCsK.........',
    '..........KsCCCCCCCCsK..........',
    '.......KKKKKKKCCCCKKKKKKK.......',
    '......KKssssKKKKKKKKssssKK......',
    '........KKKK........KKKK........',
    '................................',
  ],
  eyesShut: {
    6: '.....KhcccccsKggrggKcccccsK.....',
    7: '.....KcccccccKKKKKKKccccccK.....',
    8: '.....KcecccceoKKKKhcecccceK.....',
    9: '.....KcceeeecoohhhhcceeeecK.....',
    10: '.....KhcccccoooooooocccccoK.....',
  },
  tear: {
    11: '....KhhootoooooooooooocooosK....',
    12: '...KhhoootoooonoonoooooooossK...',
  },
  feetApart: {
    28: '......KKKKKKKKCCCCKKKKKKKK......',
    29: '.....KKssssKK.KKKK.KKssssKK.....',
    30: '.......KKKK..........KKKK.......',
  },
  ink: {
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    m: 0x8a5040, // mouth
    n: 0x4f8a4a, // nose
    t: 0x87d7ff, // tear
    K: 0x2f5a3a, // outline
    o: 0x8fd18a, // fur
    s: 0x62a866, // in shade
    h: 0xc2ecb6, // in light
    c: 0xf4fae0, // muzzle and belly
    C: 0xdcebc0, // belly in shade
    r: 0xff6b8a,
    g: 0xffd447,
  },
}

/** The art there is, by species and stage. */
const ART: Readonly<Record<string, Partial<Record<Stage, Art>>>> = {
  cat: { baby: CAT_BABY, teen: CAT_TEEN },
  chick: { baby: CHICK_BABY, teen: CHICK_TEEN },
  dog: { baby: DOG_BABY, teen: DOG_TEEN },
  slime: { baby: SLIME_BABY, teen: SLIME_TEEN },
  bunny: { baby: BUNNY_BABY, teen: BUNNY_TEEN },
  hamster: { baby: HAMSTER_BABY, teen: HAMSTER_TEEN },
  penguin: { baby: PENGUIN_BABY, teen: PENGUIN_TEEN },
  frog: { baby: FROG_BABY, teen: FROG_TEEN },
}

export function artOf(species: string, stage: Stage): Art | undefined {
  return ART[species]?.[stage]
}
