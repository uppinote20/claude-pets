export type Pet = {
  x: number
  dir: 1 | -1
  frame: number
  mood: 'walk' | 'sleep' | 'happy' | 'work' | 'love'
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
}

/** What is kept across sessions: which pet is out, and every pet met so far by species. */
export type PetProfile = {
  species: string
  pets: Record<string, PetStats>
}

declare module 'claude-code' {
  interface PluginState {
    'pets': { pet: Pet; profile: PetProfile; isWorried: boolean }
  }
}
