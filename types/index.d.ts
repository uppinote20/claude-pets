/**
 * The state contract: what the `pets` atoms and `$.store` hold.
 * @handbook 1.2-state-layers
 */
export type Pet = {
  x: number
  dir: 1 | -1
  frame: number
  mood: 'walk' | 'sleep' | 'happy' | 'work' | 'love' | 'gift'
  hold: number
  idle: number
}

/** What one pet has lived through. Each species is its own pet, with its own name and level. */
export type PetStats = {
  name: string
  pats: number
  tools: number
  turns: number
  /** Output tokens of the turns it watched. */
  tokens: number
  /** Snacks eaten in Pet Run and Pet Quest together. */
  snacks: number
  /** Pet Run's best score. */
  best: number
  /** Pet Quest stages cleared, counted from the first. */
  cleared: number
  /** Gifts found, the experience they and lucky pats brought, and whether it is a rare shiny. */
  gifts: number
  bonus: number
  shiny: boolean
  /** Finished turns by local quarter of the day (0–6, 6–12, 12–18, 18–24): its rhythm. */
  hours: number[]
}

/** What the Pet Quest pane's text shows. */
export type QuestView = {
  stage: number
  phase: 'ready' | 'running' | 'clear' | 'over'
  score: number
  snacks: number
}

/** What the Pet Run pane's text shows: the game's own state lives in the hooks module. */
export type RunView = {
  phase: 'ready' | 'running' | 'over'
  score: number
  snacks: number
}

/** How tall the pane draws the pet: `small` is the 8×8 sprite, `medium` the 12×12 one. A stored size no longer offered reads as the default. */
export type PetSize = 'small' | 'medium'

/** What is kept across sessions: which pet is out, how big it is drawn, and every pet met so far by species. */
export type PetProfile = {
  species: string
  size: PetSize
  pets: Record<string, PetStats>
}

declare module 'claude-code' {
  interface PluginState {
    'pets': { pet: Pet; profile: PetProfile; isWorried: boolean; run: RunView; quest: QuestView }
  }
}
