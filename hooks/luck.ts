/**
 * What luck brings: a gift now and then after a finished turn, a lucky pat, and the rare shiny
 * pet. Pure: the hooks module rolls `Math.random()` and hands the numbers in, so tests can too.
 */

/** A finished turn of the main conversation finds a gift this often. */
export const GIFT_CHANCE = 0.1
/** A pat is lucky this often, worth three times as much. */
export const LUCKY_PAT_CHANCE = 0.1
/** A pet met for the first time is shiny this often. */
export const SHINY_CHANCE = 1 / 32

export type Gift = { kind: 'xp'; name: string; xp: number } | { kind: 'stone' }

/**
 * Which gift a roll `r` in [0, 1) finds: mostly small, now and then a treasure, rarely a
 * jackpot, and one time in a hundred the sparkle stone that makes the pet shiny.
 */
export function giftOf(r: number): Gift {
  if (r < 0.6) {
    return { kind: 'xp', name: 'a cookie', xp: 5 }
  }
  if (r < 0.85) {
    return { kind: 'xp', name: 'a toy', xp: 15 }
  }
  if (r < 0.95) {
    return { kind: 'xp', name: 'a treasure', xp: 40 }
  }
  if (r < 0.99) {
    return { kind: 'xp', name: 'the jackpot', xp: 100 }
  }

  return { kind: 'stone' }
}

/** What a gift is worth to a pet that already is (or is not) shiny: a second stone is a jackpot. */
export function worthOf(gift: Gift, isShiny: boolean): { xp: number; makesShiny: boolean } {
  if (gift.kind === 'xp') {
    return { xp: gift.xp, makesShiny: false }
  }

  return isShiny ? { xp: 100, makesShiny: false } : { xp: 0, makesShiny: true }
}
