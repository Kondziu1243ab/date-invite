import type { Container, Graphics, Sprite, Text } from 'pixi.js'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type DifficultyConfig = {
  label: string
  emoji: string
  description: string
  museumStart: number
  totalDuration: number
  hazardIntervalMultiplier: number
  eventWindMultiplier: number
  eventDurationMultiplier: number
  sideDamage: boolean
}

export type BiomeId = 'spring' | 'winter' | 'museum'

export type SecretLetter = {
  id: number
  char: string
  wordIndex: number // 0 for JESTEŚ, 1 for SŁODKA
  charIndex: number
}

export type VeilGameResult = {
  lettersCollected: number
  totalLetters: number
  difficulty: Difficulty
  difficultyLabel: string
  skippedStages?: string[]
  manuallyCollectedCount?: number
  hitsTaken?: number
  deathsCount?: number
  guardianAttempts?: number[]
  totalPlayTimeSeconds?: number
  hasDiamondCard?: boolean
  diamondCardUsedQuestions?: number[]
}

export type EventBanner = {
  title: string
  subtitle: string
  type: 'gust' | 'storm' | 'museum_light' | 'diamond_card'
}

export type VeilGameProps = {
  onComplete: (result: VeilGameResult) => void
  skipToEndTest?: boolean
}

export type GameState = 'ready' | 'playing' | 'checkpoint' | 'paused' | 'gameover' | 'ending'

export type EndingPhase =
  | 'none'
  | 'guardian_intro'
  | 'guardian_question'
  | 'guardian_wrong'
  | 'guardian_correct'
  | 'sarcophagus_locked'
  | 'key_inserting'
  | 'sarcophagus_opening'
  | 'flying_letters'
  | 'complete'

export type GenieMood = 'idle' | 'warning' | 'wrong' | 'playful' | 'correct' | 'triumph'

export type EntityKind = 'hazard' | 'letter' | 'heart'
export type HazardType = 'twig' | 'icicle' | 'vase' | 'brush' | 'golden_orb' | 'hieroglyph_slab'

export type Metrics = {
  width: number
  height: number
  xScale: number
  yScale: number
  unit: number
}

export type Entity = {
  view: Container
  graphics: Graphics
  sprite: Sprite
  text: Text
  kind: EntityKind
  hazardType?: HazardType
  letterData?: SecretLetter
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  spin: number
  active: boolean
}

export type Runtime = {
  state: GameState
  elapsed: number
  lives: number
  biome: BiomeId
  player: { x: number; y: number; vx: number; vy: number; invulnerableUntil: number }
  metrics: Metrics
  nextHazardAt: number
  nextLetterAt: number
  spawnedLetterIndex: number
  nextHeartAt: number
  eventEndsAt: number
  eventWind: number
  eventLift: number
  message: string | null
  messageEndsAt: number
  lastHudAt: number
  hasReachedCheckpoint: boolean
  museumStageStarted: boolean
  freezeUntil: number
  eventBanner: EventBanner | null
  postFreezeAction: (() => void) | null
  springEventTriggered: boolean
  winterEventTriggered: boolean
  museumEventTriggered: boolean
  diamondCardEventTriggered: boolean
  hasDiamondCard: boolean
  difficulty: Difficulty
  museumStart: number
  totalDuration: number
  collectedLetters: SecretLetter[]
  checkpointLetters: SecretLetter[]
  hitsTaken: number
  deathsCount: number
  manuallyCollectedCount: number
  skippedStages: string[]
  startTime: number
}

export type FlightPathPreset = {
  startX: number
  startY: number
  midX: number
  midY: number
  rot: number
}
