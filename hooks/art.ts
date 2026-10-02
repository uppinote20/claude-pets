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
      '.....KhhKK....KKKK....KKooK.....',
      '.....KhphhKKKKhhhhKKKKoopoK.....',
      '.....KhppphhhhhhhooooopppoK.....',
      '.....KhpppphhhhhoooooppppoK.....',
      '.....KpppphhhhooooooooppppK.....',
      '.....KpphhhhooooooooooooppK.....',
      '.....KhhhhhoooooooooooooooK.....',
      '.....KhhhoooooooooooooooooK.....',
      '.....KhhoooeooooooooeoooooK.....',
      '....KhoooowweoooooowweoooooK....',
      '.....KooooeeeooooooeeeooooooK...',
      '.....KooooeewooooooeewoooooooK..',
      '.....KoooooeoccnnccoeooooooooK..',
      '......KbbboocccmcmccoobbboKosK..',
      '......KoooooccmcmcccoooooK.KsK..',
      '.......KKoooccccccccoooKK..KssK.',
      '.........KooooccccooosK....KssK.',
      '.........KooooooooooosK....KssK.',
      '........KoooooccccoosssK...KssK.',
      '........KooooccccccssssK...KsK..',
      '........KoooccccccccsssK..KssK..',
      '........KooccccccccccssK.KsssK..',
      '........KooccccccccccsssKsssK...',
      '........KooccccccccccssssssKK...',
      '.........KssccccccccsssssKK.....',
      '........KssssccccccsssssK.......',
      '........KsssssKKKKsssssK........',
      '........KKKKKK....KKKKKK........',
      '................................',
  ],
  eyesShut: {
      11: '.....KhhooooooooooooooooooK.....',
      12: '....KhoooeoooeooooeoooeooooK....',
      13: '.....KooooeeeooooooeeeooooooK...',
      14: '.....KoooooooooooooooooooooooK..',
      15: '.....KoooooooccnnccooooooooooK..',
    },
  tear: {
      16: '......KbbbotcccmcmccoobbboKosK..',
      17: '......KooootccmcmcccoooooK.KsK..',
    },
  feetApart: {
      27: '.......KosssccccccccssssssK.....',
      28: '......KosssssccccccssssssK......',
      29: '......KsssssKKKKKKKKsssssK......',
      30: '.......KKKKK........KKKKK.......',
    },
  ink: {
    K: 0x6b4636, // outline
    o: 0xffcf7d, // fur
    s: 0xeba65a, // fur in shade
    h: 0xffe6ae, // fur in light
    c: 0xfff4dc, // muzzle and belly
    p: 0xffa8c8, // inner ears
    e: 0x3d2b2b, // eyes
    w: 0xffffff, // glints
    b: 0xff9cbc, // blush
    m: 0x8a5040, // mouth
    n: 0xd9748a, // nose
    t: 0x87d7ff, // tear
  },
}

/** The art there is, by species and stage. */
const ART: Readonly<Record<string, Partial<Record<Stage, Art>>>> = {
  cat: { baby: CAT_BABY },
}

export function artOf(species: string, stage: Stage): Art | undefined {
  return ART[species]?.[stage]
}
