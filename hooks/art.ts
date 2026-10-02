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

/** The art there is, by species and stage. */
const ART: Readonly<Record<string, Partial<Record<Stage, Art>>>> = {
  cat: { baby: CAT_BABY },
  chick: { baby: CHICK_BABY },
  dog: { baby: DOG_BABY },
  slime: { baby: SLIME_BABY },
  bunny: { baby: BUNNY_BABY },
  hamster: { baby: HAMSTER_BABY },
  penguin: { baby: PENGUIN_BABY },
  frog: { baby: FROG_BABY },
}

export function artOf(species: string, stage: Stage): Art | undefined {
  return ART[species]?.[stage]
}
