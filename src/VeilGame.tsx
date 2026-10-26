import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics, Rectangle, Sprite, Text, type Ticker } from 'pixi.js'
import {
  startMuseumJazzMusic,
  stopMuseumJazzMusic,
  playScarabFlap,
  playDoorStoneOpen,
  playWrongAnswer,
  playRightAnswer,
  playSarcophagusOpen,
  playLetterChime,
  getSoundMuted,
  toggleSoundMuted,
} from './soundEffects'

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

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Łatwy',
    emoji: '🌸',
    description: 'Klasyczna przygoda: brak obrażeń od ścian, łagodniejszy wiatr.',
    museumStart: 44_000,
    totalDuration: 86_000,
    hazardIntervalMultiplier: 1.0,
    eventWindMultiplier: 1.0,
    eventDurationMultiplier: 1.0,
    sideDamage: false,
  },
  medium: {
    label: 'Średni',
    emoji: '⚡',
    description: 'Ściany boczne ranią! Nieco silniejszy wiatr, więcej przeszkód.',
    museumStart: 48_000,
    totalDuration: 94_000,
    hazardIntervalMultiplier: 0.82,
    eventWindMultiplier: 1.25,
    eventDurationMultiplier: 1.2,
    sideDamage: true,
  },
  hard: {
    label: 'Trudny',
    emoji: '🔥',
    description: 'Prawdziwe wyzwanie! Raniące ściany, potężne wichury i gęste przeszkody.',
    museumStart: 54_000,
    totalDuration: 106_000,
    hazardIntervalMultiplier: 0.68,
    eventWindMultiplier: 1.55,
    eventDurationMultiplier: 1.35,
    sideDamage: true,
  },
}

export type BiomeId = 'spring' | 'winter' | 'museum'

export const getBiomesForDifficulty = (diff: Difficulty) => {
  const cfg = DIFFICULTY_CONFIGS[diff]
  return [
    { id: 'spring' as BiomeId, label: '🌸 Wiosenny wiatr', until: Math.round(cfg.museumStart * 0.48), event: 'Wiosenny podmuch' },
    { id: 'winter' as BiomeId, label: '❄️ Zimowy mróz', until: cfg.museumStart, event: 'Śnieżyca' },
    { id: 'museum' as BiomeId, label: '🏛️ Muzeum Tajemnic', until: cfg.totalDuration, event: 'Złoty blask' },
  ] as const
}

const biomeAt = (elapsed: number, diff: Difficulty) => {
  const biomes = getBiomesForDifficulty(diff)
  return biomes.find((biome) => elapsed < biome.until) ?? biomes[biomes.length - 1]
}

export type SecretLetter = {
  id: number
  char: string
  wordIndex: number // 0 for JESTEŚ, 1 for SŁODKA
  charIndex: number
}

export const SECRET_LETTERS: SecretLetter[] = [
  // JESTEŚ (word 0, slots 0..5)
  { id: 0, char: 'J', wordIndex: 0, charIndex: 0 },
  { id: 1, char: 'E', wordIndex: 0, charIndex: 1 },
  { id: 2, char: 'S', wordIndex: 0, charIndex: 2 },
  { id: 3, char: 'T', wordIndex: 0, charIndex: 3 },
  { id: 4, char: 'E', wordIndex: 0, charIndex: 4 },
  { id: 5, char: 'Ś', wordIndex: 0, charIndex: 5 },
  // SŁODKA (word 1, slots 6..11)
  { id: 6, char: 'S', wordIndex: 1, charIndex: 0 },
  { id: 7, char: 'Ł', wordIndex: 1, charIndex: 1 },
  { id: 8, char: 'O', wordIndex: 1, charIndex: 2 },
  { id: 9, char: 'D', wordIndex: 1, charIndex: 3 },
  { id: 10, char: 'K', wordIndex: 1, charIndex: 4 },
  { id: 11, char: 'A', wordIndex: 1, charIndex: 5 },
]

// Scrambled sequence across the 3 stages:
// Stage 1 (Spring): K, E, D, S
// Stage 2 (Winter): A, Ł, T, Ś
// Stage 3 (Museum): J, O, S, E
export const SPAWN_LETTER_ORDER: number[] = [
  10, // K
  1,  // E
  9,  // D
  6,  // S
  11, // A
  7,  // Ł
  3,  // T
  5,  // Ś
  0,  // J
  8,  // O
  2,  // S
  4,  // E
]

export type VeilGameResult = {
  lettersCollected: number
  totalLetters: number
  difficulty: Difficulty
  difficultyLabel: string
}

type EventBanner = {
  title: string
  subtitle: string
  type: 'gust' | 'storm' | 'museum_light'
}

type VeilGameProps = {
  onComplete: (result: VeilGameResult) => void
  skipToEndTest?: boolean
}

type GameState = 'ready' | 'playing' | 'checkpoint' | 'paused' | 'gameover' | 'ending'
type EntityKind = 'hazard' | 'letter' | 'heart'
type HazardType = 'twig' | 'icicle' | 'vase' | 'golden_orb' | 'hieroglyph_slab'
type Metrics = { width: number; height: number; xScale: number; yScale: number; unit: number }

type Entity = {
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

type Runtime = {
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
  difficulty: Difficulty
  museumStart: number
  totalDuration: number
  collectedLetters: SecretLetter[]
}

const createMetrics = (width: number, height: number): Metrics => ({
  width,
  height,
  xScale: Math.max(width / 340, 0.72),
  yScale: Math.max(height / 520, 0.72),
  unit: Math.max(Math.min(width / 340, height / 520), 0.72),
})

// Royal Golden Scarab with fluttering gossamer wings & Egyptian jewelry (Active throughout the entire game)
function drawScarab(view: Graphics, size: number, flapPhase = 0): void {
  view.clear()
  const s = size * 0.72
  const wingAngle = Math.sin(flapPhase) * 0.44

  // --- Wings (Semi-translucent golden gossamer with vein struts) ---
  // Left Wing
  const lwTipX = -s * 1.42
  const lwTipY = -s * 0.32 + wingAngle * s * 0.95
  const lwJointX = -s * 0.42
  const lwJointY = -s * 0.22 + wingAngle * s * 0.3
  view.poly([
    0, -s * 0.1,
    lwJointX, lwJointY,
    lwTipX, lwTipY,
    -s * 1.12, lwTipY + s * 0.4,
    -s * 0.52, s * 0.15,
    0, 0.1,
  ], true)
    .fill({ color: 0xffecb3, alpha: 0.68 })
    .stroke({ width: 1.5, color: 0xffd54f, alpha: 0.95 })

  view.moveTo(0, -s * 0.1).lineTo(lwTipX, lwTipY).stroke({ width: 1.3, color: 0xffca28, alpha: 0.85 })
  view.moveTo(lwJointX, lwJointY).lineTo(-s * 1.12, lwTipY + s * 0.4).stroke({ width: 1.0, color: 0xffca28, alpha: 0.7 })

  // Right Wing
  const rwTipX = s * 1.42
  const rwTipY = -s * 0.32 + wingAngle * s * 0.95
  const rwJointX = s * 0.42
  const rwJointY = -s * 0.22 + wingAngle * s * 0.3
  view.poly([
    0, -s * 0.1,
    rwJointX, rwJointY,
    rwTipX, rwTipY,
    s * 1.12, rwTipY + s * 0.4,
    s * 0.52, s * 0.15,
    0, 0.1,
  ], true)
    .fill({ color: 0xffecb3, alpha: 0.68 })
    .stroke({ width: 1.5, color: 0xffd54f, alpha: 0.95 })

  view.moveTo(0, -s * 0.1).lineTo(rwTipX, rwTipY).stroke({ width: 1.3, color: 0xffca28, alpha: 0.85 })
  view.moveTo(rwJointX, rwJointY).lineTo(s * 1.12, rwTipY + s * 0.4).stroke({ width: 1.0, color: 0xffca28, alpha: 0.7 })

  // --- Golden Egyptian Legs (6 articulated limbs) ---
  // Front legs
  view.moveTo(-s * 0.22, -s * 0.3).lineTo(-s * 0.62, -s * 0.52).lineTo(-s * 0.48, -s * 0.78)
    .stroke({ width: 2.2, color: 0xb78103, cap: 'round', join: 'round' })
  view.moveTo(s * 0.22, -s * 0.3).lineTo(s * 0.62, -s * 0.52).lineTo(s * 0.48, -s * 0.78)
    .stroke({ width: 2.2, color: 0xb78103, cap: 'round', join: 'round' })
  // Middle legs
  view.moveTo(-s * 0.3, -s * 0.05).lineTo(-s * 0.78, -s * 0.08).lineTo(-s * 0.92, s * 0.16)
    .stroke({ width: 2.0, color: 0xb78103, cap: 'round', join: 'round' })
  view.moveTo(s * 0.3, -s * 0.05).lineTo(s * 0.78, -s * 0.08).lineTo(s * 0.92, s * 0.16)
    .stroke({ width: 2.0, color: 0xb78103, cap: 'round', join: 'round' })
  // Back legs
  view.moveTo(-s * 0.26, s * 0.24).lineTo(-s * 0.68, s * 0.44).lineTo(-s * 0.54, s * 0.74)
    .stroke({ width: 2.0, color: 0xb78103, cap: 'round', join: 'round' })
  view.moveTo(s * 0.26, s * 0.24).lineTo(s * 0.68, s * 0.44).lineTo(s * 0.54, s * 0.74)
    .stroke({ width: 2.0, color: 0xb78103, cap: 'round', join: 'round' })

  // --- Abdomen & Elytra (Shimmering Golden Shell) ---
  view.ellipse(0, s * 0.12, s * 0.46, s * 0.58).fill(0xd4af37)
    .stroke({ width: 2.0, color: 0xfff9c4 })
  view.ellipse(0, s * 0.12, s * 0.41, s * 0.53).fill(0xffd700)

  // Elytra center division line
  view.moveTo(0, -s * 0.16).lineTo(0, s * 0.68)
    .stroke({ width: 1.8, color: 0x8c6d05, cap: 'round' })

  // Carved wing-case hieroglyphic highlights
  view.ellipse(-s * 0.18, s * 0.14, s * 0.13, s * 0.26).fill({ color: 0xfff176, alpha: 0.6 })
  view.ellipse(s * 0.18, s * 0.14, s * 0.13, s * 0.26).fill({ color: 0xfff176, alpha: 0.6 })

  // --- Thorax (Chest plate) ---
  view.poly([
    -s * 0.36, -s * 0.18,
    s * 0.36, -s * 0.18,
    s * 0.26, -s * 0.42,
    -s * 0.26, -s * 0.42,
  ], true)
    .fill(0xf57f17)
    .stroke({ width: 1.6, color: 0xfff59d })

  // Turquoise / Lapis lazuli jewel centerpiece
  view.ellipse(0, -s * 0.3, s * 0.11, s * 0.08).fill(0x00bcd4)
    .circle(0, -s * 0.3, s * 0.035).fill(0xffffff)

  // --- Head & Crown (Solar disc) ---
  view.poly([
    -s * 0.2, -s * 0.42,
    s * 0.2, -s * 0.42,
    s * 0.24, -s * 0.56,
    s * 0.1, -s * 0.63,
    0, -s * 0.56,
    -s * 0.1, -s * 0.63,
    -s * 0.24, -s * 0.56,
  ], true)
    .fill(0xd4af37)
    .stroke({ width: 1.4, color: 0xfff9c4 })

  // Glowing ruby eyes
  view.circle(-s * 0.12, -s * 0.48, s * 0.04).fill(0xd50000)
    .circle(-s * 0.11, -s * 0.49, s * 0.016).fill(0xffffff)
  view.circle(s * 0.12, -s * 0.48, s * 0.04).fill(0xd50000)
    .circle(s * 0.13, -s * 0.49, s * 0.016).fill(0xffffff)

  // Solar disc crowning head
  view.circle(0, -s * 0.72, s * 0.11).fill(0xff6f00)
    .stroke({ width: 1.2, color: 0xffd54f })
  view.circle(0, -s * 0.72, s * 0.05).fill(0xffeb3b)
}

function drawEntity(entity: Entity, biome: BiomeId, unit: number): void {
  const { graphics, sprite, text } = entity
  graphics.clear()
  sprite.visible = false

  if (entity.kind === 'letter') {
    entity.radius = 16 * unit
    const r = entity.radius

    if (biome === 'museum') {
      graphics.circle(0, 0, r * 1.4).fill({ color: 0xffd54f, alpha: 0.35 })
      graphics.poly([
        0, -r * 1.1,
        r * 0.95, -r * 0.5,
        r * 0.95, r * 0.5,
        0, r * 1.1,
        -r * 0.95, r * 0.5,
        -r * 0.95, -r * 0.5,
      ], true).fill(0xb78103).stroke({ width: 2.4 * unit, color: 0xfff59d, join: 'round' })
      graphics.circle(0, 0, r * 0.55).fill({ color: 0xffd700, alpha: 0.65 })
    } else if (biome === 'winter') {
      graphics.circle(0, 0, r * 1.35).fill({ color: 0x4fc3f7, alpha: 0.28 })
      graphics.poly([
        0, -r,
        r * 0.88, -r * 0.5,
        r * 0.88, r * 0.5,
        0, r,
        -r * 0.88, r * 0.5,
        -r * 0.88, -r * 0.5,
      ], true).fill(0x0277bd).stroke({ width: 2.2 * unit, color: 0x81d4fa, join: 'round' })
      graphics.circle(0, 0, r * 0.45).fill({ color: 0x29b6f6, alpha: 0.5 })
    } else {
      graphics.circle(0, 0, r * 1.35).fill({ color: 0xf06292, alpha: 0.28 })
      graphics.poly([
        0, -r,
        r * 0.88, -r * 0.5,
        r * 0.88, r * 0.5,
        0, r,
        -r * 0.88, r * 0.5,
        -r * 0.88, -r * 0.5,
      ], true).fill(0xad1457).stroke({ width: 2.2 * unit, color: 0xf48fb1, join: 'round' })
      graphics.circle(0, 0, r * 0.45).fill({ color: 0xec407a, alpha: 0.5 })
    }

    if (entity.letterData) {
      text.text = entity.letterData.char
      text.style.fontSize = Math.round(17 * unit)
      text.visible = true
    } else {
      text.visible = false
    }
    return
  }

  text.visible = false

  if (entity.kind === 'heart') {
    entity.radius = 15 * unit
    const r = entity.radius
    graphics.circle(-r * 0.45, -r * 0.2, r * 0.55).fill(0xef476f)
      .circle(r * 0.45, -r * 0.2, r * 0.55).fill(0xef476f)
      .poly([-r, 0, r, 0, 0, r * 1.2], true).fill(0xef476f)
    graphics.circle(-r * 0.35, -r * 0.38, r * 0.16).fill({ color: 0xffffff, alpha: 0.72 })
    return
  }

  if (biome === 'museum') {
    const hazard = entity.hazardType || 'vase'

    if (hazard === 'vase') {
      entity.radius = 20 * unit
      const r = entity.radius
      // Ancient Egyptian Clay & Gold Amphora Vase
      graphics.ellipse(0, 0, r * 0.75, r * 0.95).fill(0xc0392b)
        .stroke({ width: 1.6 * unit, color: 0xffd54f })
      graphics.rect(-r * 0.7, -r * 0.2, r * 1.4, r * 0.4).fill(0xd4af37)
      graphics.poly([
        -r * 0.42, -r * 0.85,
        r * 0.42, -r * 0.85,
        r * 0.28, -r * 0.55,
        -r * 0.28, -r * 0.55,
      ], true).fill(0x870000).stroke({ width: 1.2 * unit, color: 0xffd54f })
      graphics.ellipse(0, -r * 0.85, r * 0.42, r * 0.14).fill(0xffd54f)
      graphics.circle(-r * 0.75, -r * 0.2, r * 0.2).stroke({ width: 2.2 * unit, color: 0xd4af37 })
      graphics.circle(r * 0.75, -r * 0.2, r * 0.2).stroke({ width: 2.2 * unit, color: 0xd4af37 })
      return
    }

    if (hazard === 'golden_orb') {
      entity.radius = 18 * unit
      const r = entity.radius
      // Glowing golden energy relic
      graphics.circle(0, 0, r * 1.35).fill({ color: 0xffd700, alpha: 0.25 })
      graphics.circle(0, 0, r).fill(0xffb300).stroke({ width: 2.0 * unit, color: 0xfff9c4 })
      graphics.circle(0, 0, r * 0.55).fill(0xffffff)
      graphics.poly([
        0, -r * 0.9,
        r * 0.9, 0,
        0, r * 0.9,
        -r * 0.9, 0,
      ], true).stroke({ width: 1.5 * unit, color: 0xff6f00 })
      return
    }

    // hieroglyph_slab
    entity.radius = 19 * unit
    const r = entity.radius
    graphics.rect(-r * 0.75, -r * 0.85, r * 1.5, r * 1.7).fill(0x5d4037)
      .stroke({ width: 2.0 * unit, color: 0xd4af37 })
    graphics.circle(0, -r * 0.38, r * 0.26).stroke({ width: 1.6 * unit, color: 0xffd54f })
    graphics.moveTo(0, -r * 0.1).lineTo(0, r * 0.48).stroke({ width: 2.0 * unit, color: 0xffd54f })
    graphics.moveTo(-r * 0.38, r * 0.15).lineTo(r * 0.38, r * 0.15).stroke({ width: 2.0 * unit, color: 0xffd54f })
    return
  }

  if (biome === 'winter') {
    entity.radius = 19 * unit
    const r = entity.radius
    graphics.poly([-r, -r * 0.65, r, -r * 0.65, r * 0.55, r, -r * 0.7, r], true).fill(0xc7e8f3)
      .poly([-r * 0.45, -r * 0.55, r * 0.45, -r * 0.55, 0, r * 0.55], true).fill(0xeffcff)
    graphics.poly([-r, -r * 0.65, r, -r * 0.65, r * 0.55, r, -r * 0.7, r], true).stroke({ width: 1.5, color: 0x6d95b8 })
    return
  }

  // Spring twig with cherry blossoms
  entity.radius = 16 * unit
  const r = entity.radius
  graphics.moveTo(-r * 0.75, -r * 0.55)
    .lineTo(-r * 0.2, -r * 0.1)
    .lineTo(r * 0.75, r * 0.65)
    .stroke({ width: 3.6 * unit, color: 0x5d4037, cap: 'round', join: 'round' })
  graphics.moveTo(-r * 0.15, -r * 0.15)
    .lineTo(r * 0.35, -r * 0.45)
    .stroke({ width: 2.6 * unit, color: 0x6d4c41, cap: 'round' })
  graphics.ellipse(r * 0.38, -r * 0.48, 4.2 * unit, 2.2 * unit)
    .fill(0x7cb342)
    .stroke({ width: 0.8, color: 0x558b2f })
  graphics.moveTo(-r * 0.05, 0)
    .lineTo(r * 0.35, r * 0.35)
    .stroke({ width: 1.4 * unit, color: 0x8d6e63, cap: 'round' })
}

function drawBackdrop(view: Graphics, metrics: Metrics, biome: BiomeId): void {
  view.clear()
  if (biome === 'museum') {
    // Majestic Egyptian Museum Gallery Backdrop
    view.rect(0, 0, metrics.width, metrics.height * 0.58).fill(0x2a1e12)
    view.rect(0, metrics.height * 0.58, metrics.width, metrics.height * 0.42).fill(0x181008)

    // Warm museum spotlight
    const lightX = metrics.width * 0.5
    const lightR = metrics.width * 0.55
    view.circle(lightX, metrics.height * 0.2, lightR).fill({ color: 0xffd54f, alpha: 0.07 })

    // Sandstone masonry wall bands
    for (let y = 32; y < metrics.height * 0.68; y += 36) {
      view.moveTo(0, y).lineTo(metrics.width, y).stroke({ width: 1, color: 0x4e3820, alpha: 0.35 })
    }

    // Side Egyptian Columns with gold lotus capitals
    const pillarW = 20 * metrics.unit
    // Left pillar
    view.rect(0, 0, pillarW, metrics.height).fill(0x3e2c1a)
      .stroke({ width: 1.5, color: 0x6d4c2d })
    view.rect(pillarW * 0.8, 0, pillarW * 0.2, metrics.height).fill({ color: 0xffd54f, alpha: 0.09 })
    // Right pillar
    view.rect(metrics.width - pillarW, 0, pillarW, metrics.height).fill(0x3e2c1a)
      .stroke({ width: 1.5, color: 0x6d4c2d })
    view.rect(metrics.width - pillarW, 0, pillarW * 0.2, metrics.height).fill({ color: 0xffd54f, alpha: 0.09 })

    // Gold hieroglyphic trim strip
    view.rect(0, metrics.height * 0.26, metrics.width, 8 * metrics.unit).fill({ color: 0xd4af37, alpha: 0.2 })

    // Floor edge
    view.rect(0, metrics.height * 0.85, metrics.width, metrics.height * 0.15).fill(0x110a04)
    view.moveTo(0, metrics.height * 0.85).lineTo(metrics.width, metrics.height * 0.85)
      .stroke({ width: 2, color: 0xd4af37, alpha: 0.55 })
    return
  }

  const palette =
    biome === 'spring'
      ? [0xf7fff1, 0xe5f7d5, 0x9fd596]
      : [0xf4fafd, 0xe3f2fd, 0x9ec5e5] // Winter crisp blue

  view.rect(0, 0, metrics.width, metrics.height * 0.48).fill(palette[0])
    .rect(0, metrics.height * 0.48, metrics.width, metrics.height * 0.52).fill(palette[1])
    .rect(0, metrics.height * 0.82, metrics.width, metrics.height * 0.18).fill({ color: palette[2], alpha: 0.22 })
}

// Scramble/shuffle helper so letters hover in scrambled random order
function scrambleLetters(letters: SecretLetter[]): SecretLetter[] {
  if (letters.length <= 1) return [...letters]
  const arr = [...letters]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  // Ensure it's not accidentally in sorted id order
  const isSorted = arr.every((item, idx) => idx === 0 || item.id >= arr[idx - 1].id)
  if (isSorted && arr.length > 1) {
    [arr[0], arr[1]] = [arr[1], arr[0]]
  }
  return arr
}

export default function VeilGame({ onComplete, skipToEndTest }: VeilGameProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<{
    start: () => void
    resumeCheckpoint: () => void
    pause: () => void
    skip?: () => void
    steer: (direction: -1 | 1) => void
    getCollectedLetters?: () => SecretLetter[]
  } | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const [gameState, setGameState] = useState<GameState>('ready')
  const [lives, setLives] = useState(3)
  const [collectedLetters, setCollectedLetters] = useState<SecretLetter[]>([])
  const [skyLetters, setSkyLetters] = useState<SecretLetter[]>([])
  const [hasCheckpoint, setHasCheckpoint] = useState(false)
  const [doorOpening, setDoorOpening] = useState(false)
  const [biome, setBiome] = useState<BiomeId>('spring')
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [eventBanner, setEventBanner] = useState<EventBanner | null>(null)
  const [error, setError] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const difficultyRef = useRef<Difficulty>('easy')
  const [soundMuted, setSoundMuted] = useState(getSoundMuted())

  // Ending Sarcophagus & Guardian States
  const [endingPhase, setEndingPhase] = useState<
    'none' | 'guardian_question' | 'guardian_wrong' | 'guardian_correct' | 'sarcophagus_opening' | 'flying_letters' | 'complete'
  >('none')
  const [guardianMessage, setGuardianMessage] = useState<string | null>(null)
  const [selectedHotValue, setSelectedHotValue] = useState<number | null>(null)
  const [placedCollectedIds, setPlacedCollectedIds] = useState<number[]>([])
  const [activeFlyingId, setActiveFlyingId] = useState<number | null>(null)
  const [showGrayout, setShowGrayout] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)

  const selectDifficulty = useCallback((nextDifficulty: Difficulty) => {
    difficultyRef.current = nextDifficulty
    setDifficulty(nextDifficulty)
  }, [])

  const handleToggleSound = useCallback(() => {
    const next = toggleSoundMuted()
    setSoundMuted(next)
  }, [])

  const startGame = useCallback(() => {
    startMuseumJazzMusic() // Upbeat swing jazz startuje od razu i gra przez wszystkie etapy!
    controlsRef.current?.start()
  }, [])
  const resumeCheckpoint = useCallback(() => {
    startMuseumJazzMusic()
    controlsRef.current?.resumeCheckpoint()
  }, [])
  const togglePause = useCallback(() => controlsRef.current?.pause(), [])

  // Otwarcie sarkofagu i powolny, płynny przelot zebranych liter przy muzyce jazzowej
  const triggerSarcophagusFlight = useCallback((initialLetters?: SecretLetter[]) => {
    const lettersToUse = initialLetters ?? collectedLetters
    startMuseumJazzMusic() // Jazz gra dalej w tle bez przerw!
    playSarcophagusOpen()
    setEndingPhase('sarcophagus_opening')
    setPlacedCollectedIds([])
    setActiveFlyingId(null)
    setShowGrayout(false)
    setIsFlashing(false)

    // Losowa, nieuporządkowana chmura liter w powietrzu (tak jak w zamierzeniu użytkownika)
    const scrambled = scrambleLetters(lettersToUse)
    setSkyLetters(scrambled)

    // Po otwarciu wieka (~1.2s):
    setTimeout(() => {
      setEndingPhase('flying_letters')

      if (scrambled.length === 0) {
        // Jeśli nie było zebranych liter, po chwili błysk i zarysowanie szarych liter w pustych slotach
        setTimeout(() => {
          setIsFlashing(true)
          setShowGrayout(true)
          setTimeout(() => {
            setIsFlashing(false)
            setEndingPhase('complete')
          }, 950)
        }, 900)
        return
      }

      let idx = 0
      const interval = window.setInterval(() => {
        if (idx < scrambled.length) {
          const currentItem = scrambled[idx]
          setActiveFlyingId(currentItem.id)
          idx += 1

          // Litera dokuje w swoim dedykowanym gnieździe w sarkofagu (bez żadnych drażniących dźwięków - gra tylko płynny jazz)
          setTimeout(() => {
            setPlacedCollectedIds((prev) => [...prev, currentItem.id])
          }, 480)

          // Po włożeniu wszystkich zebranych liter:
          if (idx >= scrambled.length) {
            clearInterval(interval)
            setTimeout(() => {
              setActiveFlyingId(null)
              // Błysk sarkofagu i płynne powiększenie szarych brakujących liter w pustych otworach
              setIsFlashing(true)
              setShowGrayout(true)

              setTimeout(() => {
                setIsFlashing(false)
                setEndingPhase('complete')
              }, 1000)
            }, 850)
          }
        }
      }, 680)
    }, 1200)
  }, [collectedLetters])

  // "Pomiń" przenosi bezpośrednio do ekranu finałowego z gry (otwarcie sarkofagu i animacja wlotu liter)
  const handleSkipGame = useCallback(() => {
    startMuseumJazzMusic() // Nie zatrzymujemy jazzu
    controlsRef.current?.skip?.()
    setGameState('ending')
    const currentCollected = controlsRef.current?.getCollectedLetters?.() ?? collectedLetters
    setCollectedLetters([...currentCollected])
    triggerSarcophagusFlight(currentCollected)
  }, [collectedLetters, triggerSarcophagusFlight])

  // Click "Wejdź" in Checkpoint (Museum Entrance)
  const handleEnterMuseum = useCallback(() => {
    setDoorOpening(true)
    playDoorStoneOpen()
    setTimeout(() => {
      setDoorOpening(false)
      resumeCheckpoint()
    }, 900)
  }, [resumeCheckpoint])

  // Start the Sarcophagus ending sequence
  const startEndingChoreography = useCallback((collected: SecretLetter[]) => {
    startMuseumJazzMusic() // Jazz gra dalej
    setGameState('ending')
    setEndingPhase('guardian_question')
    setGuardianMessage(null)
    setSelectedHotValue(null)
    setPlacedCollectedIds([])
    setActiveFlyingId(null)
    setShowGrayout(false)
    setIsFlashing(false)
    setCollectedLetters([...collected])
    setSkyLetters(scrambleLetters(collected))
  }, [])

  // Handler for Guardian Hot Question (1 to 10)
  const handleAnswerHotQuestion = (value: number) => {
    setSelectedHotValue(value)
    if (value !== 10) {
      playWrongAnswer()
      setGuardianMessage('To zła odpowiedź! ❌ Spróbuj jeszcze raz...')
      setEndingPhase('guardian_wrong')
    } else {
      playRightAnswer()
      setGuardianMessage('Prawidłowa odpowiedź! 10/10! Sarkofag staje otworem... ✨')
      setEndingPhase('guardian_correct')

      // Sarcophagus opens after 1.2s
      setTimeout(() => {
        triggerSarcophagusFlight(collectedLetters)
      }, 1200)
    }
  }

  // Skip test shortcut
  useEffect(() => {
    if (skipToEndTest) {
      const halfIds = SPAWN_LETTER_ORDER.slice(0, 6)
      const halfLetters = halfIds
        .map((id) => SECRET_LETTERS.find((l) => l.id === id)!)
        .filter(Boolean)
      setCollectedLetters(halfLetters)
      setSkyLetters(scrambleLetters(halfLetters))
      startEndingChoreography(halfLetters)
    }
  }, [skipToEndTest, startEndingChoreography])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let app: Application | null = null
    let resizeObserver: ResizeObserver | null = null
    let tickerUpdate: ((ticker: Ticker) => void) | null = null
    let flapPhase = 0

    const playerView = new Graphics()
    const backdrop = new Graphics()
    const particleLayer = new Container()
    const itemLayer = new Container()
    const hazardLayer = new Container()
    const playerLayer = new Container()
    const particles: Graphics[] = []
    const entities: Entity[] = []
    const entityPool: Entity[] = []

    const runtime: Runtime = {
      state: 'ready',
      elapsed: 0,
      lives: 3,
      biome: 'spring',
      player: { x: 170, y: 110, vx: 0, vy: 0, invulnerableUntil: 0 },
      metrics: createMetrics(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1)),
      nextHazardAt: 1200,
      nextLetterAt: 3200,
      spawnedLetterIndex: 0,
      nextHeartAt: Infinity,
      eventEndsAt: 0,
      eventWind: 0,
      eventLift: 0,
      message: null,
      messageEndsAt: 0,
      lastHudAt: 0,
      hasReachedCheckpoint: false,
      museumStageStarted: false,
      freezeUntil: 0,
      eventBanner: null,
      postFreezeAction: null,
      springEventTriggered: false,
      winterEventTriggered: false,
      museumEventTriggered: false,
      difficulty,
      museumStart: DIFFICULTY_CONFIGS[difficulty].museumStart,
      totalDuration: DIFFICULTY_CONFIGS[difficulty].totalDuration,
      collectedLetters: [],
    }

    const applyDifficulty = (nextDifficulty: Difficulty) => {
      const config = DIFFICULTY_CONFIGS[nextDifficulty]
      runtime.difficulty = nextDifficulty
      runtime.museumStart = config.museumStart
      runtime.totalDuration = config.totalDuration
    }

    const syncHud = (force = false) => {
      if (!force && runtime.elapsed - runtime.lastHudAt < 120) return
      runtime.lastHudAt = runtime.elapsed
      setLives(runtime.lives)
      setCollectedLetters([...runtime.collectedLetters])
      setHasCheckpoint(runtime.hasReachedCheckpoint)
      setBiome(runtime.biome)
      setProgress(Math.min(100, Math.floor((runtime.elapsed / runtime.totalDuration) * 100)))
      setGameState(runtime.state)
      setToast(runtime.message)
      setEventBanner(runtime.eventBanner)
    }

    const recycle = (entity: Entity) => {
      entity.active = false
      entity.view.visible = false
      entity.text.visible = false
      entity.letterData = undefined
      entityPool.push(entity)
    }

    const recycleAll = () => {
      while (entities.length) recycle(entities.pop()!)
    }

    const acquire = (kind: EntityKind): Entity => {
      let entity = entityPool.pop()
      if (!entity) {
        const container = new Container()
        const graphics = new Graphics()
        const sprite = new Sprite()
        const text = new Text({
          text: '',
          style: {
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontSize: 16,
            fontWeight: 'bold',
            fill: 0xffffff,
          },
        })
        text.anchor.set(0.5)
        container.addChild(graphics, sprite, text)
        entity = {
          view: container,
          graphics,
          sprite,
          text,
          kind,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: 0,
          spin: 0,
          active: false,
        }
      }
      entity.kind = kind
      entity.hazardType = undefined
      entity.letterData = undefined
      entity.active = true
      entity.view.visible = true
      entity.view.rotation = 0
      entity.view.alpha = 1
      const layer = kind === 'hazard' ? hazardLayer : itemLayer
      if (entity.view.parent !== layer) layer.addChild(entity.view)
      entities.push(entity)
      return entity
    }

    const spawn = (kind: EntityKind) => {
      const m = runtime.metrics
      const entity = acquire(kind)
      entity.x = 28 * m.xScale + Math.random() * Math.max(1, m.width - 56 * m.xScale)
      entity.y = -42 * m.yScale
      entity.vx = (Math.random() - 0.5) * 30 * m.xScale
      entity.vy = (kind === 'hazard' ? 150 : 125) * m.yScale
      entity.spin = (Math.random() - 0.5) * (kind === 'hazard' ? 1.4 : 1.2)

      if (kind === 'hazard') {
        if (runtime.biome === 'museum') {
          const museumHazards: HazardType[] = ['vase', 'golden_orb', 'hieroglyph_slab']
          entity.hazardType = museumHazards[Math.floor(Math.random() * museumHazards.length)]
        } else if (runtime.biome === 'winter') {
          entity.hazardType = 'icicle'
        } else {
          entity.hazardType = 'twig'
        }
      } else if (kind === 'letter') {
        if (runtime.spawnedLetterIndex < SPAWN_LETTER_ORDER.length) {
          const letterId = SPAWN_LETTER_ORDER[runtime.spawnedLetterIndex]
          entity.letterData = SECRET_LETTERS.find((l) => l.id === letterId)
          runtime.spawnedLetterIndex += 1
        }
      }

      drawEntity(entity, runtime.biome, m.unit)
    }

    const message = (next: string, duration: number) => {
      runtime.message = next
      runtime.messageEndsAt = runtime.elapsed + duration
      syncHud(true)
    }

    const updatePlayerGraphic = () => {
      // Golden Scarab is the active hero on all levels (Wiosna, Zima, Muzeum)
      drawScarab(playerView, 62 * runtime.metrics.unit, flapPhase)
    }

    const applyBiome = (next: BiomeId, announce: boolean) => {
      runtime.biome = next
      if (announce) message(`${biomeAt(runtime.elapsed, runtime.difficulty).label.replace(/^..\s/, '')}!`, 2000)
      drawBackdrop(backdrop, runtime.metrics, next)
      updatePlayerGraphic()
      for (const particle of particles) {
        particle.tint =
          next === 'spring' ? 0x81c784 : next === 'winter' ? 0xffffff : 0xffd54f
      }
    }

    const damage = () => {
      if (runtime.elapsed < runtime.player.invulnerableUntil || runtime.state !== 'playing') return
      runtime.lives -= 1
      runtime.player.invulnerableUntil = runtime.elapsed + 850
      runtime.player.vy = -210 * runtime.metrics.yScale
      runtime.nextHeartAt = runtime.lives > 0 ? runtime.elapsed + 4500 : Infinity
      message('Uważaj! ♥', 950)
      if (runtime.lives <= 0) {
        runtime.state = 'gameover'
      }
      syncHud(true)
    }

    const finish = () => {
      if (runtime.state !== 'playing') return
      runtime.state = 'ending'
      runtime.message = null
      syncHud(true)
      startEndingChoreography([...runtime.collectedLetters])
    }

    const reset = () => {
      applyDifficulty(difficultyRef.current)
      recycleAll()
      startMuseumJazzMusic()
      setDoorOpening(false)
      setEndingPhase('none')
      runtime.state = 'playing'
      runtime.elapsed = 0
      runtime.lives = 3
      runtime.biome = 'spring'
      runtime.hasReachedCheckpoint = false
      runtime.museumStageStarted = false
      runtime.collectedLetters = []
      runtime.spawnedLetterIndex = 0
      runtime.nextHazardAt = 1200
      runtime.nextLetterAt = 3000
      runtime.nextHeartAt = Infinity
      runtime.eventEndsAt = 0
      runtime.eventWind = 0
      runtime.eventLift = 0
      runtime.freezeUntil = 0
      runtime.eventBanner = null
      runtime.postFreezeAction = null
      runtime.springEventTriggered = false
      runtime.winterEventTriggered = false
      runtime.museumEventTriggered = false
      runtime.message = 'Skarabeusz wyrusza na przygodę! 🪲'
      runtime.messageEndsAt = 1400
      runtime.player = {
        x: runtime.metrics.width / 2,
        y: runtime.metrics.height * 0.27,
        vx: 0,
        vy: -90 * runtime.metrics.yScale,
        invulnerableUntil: 0,
      }
      applyBiome('spring', false)
      syncHud(true)
    }

    const resumeCheckpoint = () => {
      runtime.state = 'playing'
      runtime.player.vy = -180 * runtime.metrics.yScale
      applyBiome('museum', false)
      startMuseumJazzMusic()
      message('Złoty Skarabeusz wlatuje do Muzeum! 🏛️🪲', 1600)
      syncHud(true)
    }

    const layout = () => {
      if (!app) return
      const old = runtime.metrics
      const x = old.width ? runtime.player.x / old.width : 0.5
      const y = old.height ? runtime.player.y / old.height : 0.3
      runtime.metrics = createMetrics(Math.max(app.screen.width, 1), Math.max(app.screen.height, 1))
      runtime.player.x = Math.min(
        Math.max(x * runtime.metrics.width, 28 * runtime.metrics.xScale),
        runtime.metrics.width - 28 * runtime.metrics.xScale,
      )
      runtime.player.y = Math.min(
        Math.max(y * runtime.metrics.height, 58 * runtime.metrics.yScale),
        runtime.metrics.height - 30 * runtime.metrics.yScale,
      )
      drawBackdrop(backdrop, runtime.metrics, runtime.biome)
      updatePlayerGraphic()
      app.stage.hitArea = new Rectangle(0, 0, runtime.metrics.width, runtime.metrics.height)
    }

    const movePlayer = (delta: number) => {
      const m = runtime.metrics
      const player = runtime.player
      const seconds = delta / 1000
      const gravity = runtime.biome === 'winter' ? 1.12 : runtime.biome === 'museum' ? 0.96 : 0.92
      const damping = runtime.biome === 'winter' ? 0.975 : 0.958
      player.vy += (760 * gravity * m.yScale + runtime.eventLift) * seconds
      player.vx += (Math.sin(runtime.elapsed / 750) * 28 * m.xScale + runtime.eventWind) * seconds
      player.vx *= Math.pow(damping, delta / 16.67)
      player.x += player.vx * seconds
      player.y += player.vy * seconds
      const edge = 30 * m.xScale
      if (player.x < edge) {
        player.x = edge
        player.vx = Math.abs(player.vx) * 0.35
        if (DIFFICULTY_CONFIGS[runtime.difficulty].sideDamage) damage()
      }
      if (player.x > m.width - edge) {
        player.x = m.width - edge
        player.vx = -Math.abs(player.vx) * 0.35
        if (DIFFICULTY_CONFIGS[runtime.difficulty].sideDamage) damage()
      }
      if (player.y < 36 * m.yScale) {
        player.y = 36 * m.yScale
        player.vy = Math.max(player.vy, 80 * m.yScale)
      }
      if (player.y > m.height - 32 * m.yScale) {
        player.y = m.height - 32 * m.yScale
        player.vy = -300 * m.yScale
        damage()
      }
      playerLayer.position.set(player.x, player.y)
      playerLayer.rotation = Math.max(-0.35, Math.min(0.35, player.vy / (1100 * m.yScale)))
      playerLayer.alpha =
        runtime.elapsed < player.invulnerableUntil && Math.floor(runtime.elapsed / 90) % 2 === 0 ? 0.3 : 1
    }

    const moveEntities = (delta: number) => {
      const seconds = delta / 1000
      const next: Entity[] = []
      for (const entity of entities) {
        entity.x += (entity.vx + runtime.eventWind * (entity.kind === 'hazard' ? 0.22 : 0.08)) * seconds
        entity.y += entity.vy * seconds
        entity.view.position.set(entity.x, entity.y)
        entity.view.rotation += entity.spin * seconds

        if (
          entity.y > runtime.metrics.height + 55 * runtime.metrics.yScale ||
          entity.x < -60 ||
          entity.x > runtime.metrics.width + 60
        ) {
          recycle(entity)
          continue
        }

        if (
          Math.hypot(runtime.player.x - entity.x, runtime.player.y - entity.y) <
          entity.radius + 24 * runtime.metrics.unit
        ) {
          if (entity.kind === 'hazard') damage()
          if (entity.kind === 'letter' && entity.letterData) {
            const letter = entity.letterData
            if (!runtime.collectedLetters.some((l) => l.id === letter.id)) {
              runtime.collectedLetters.push(letter)
              playLetterChime(runtime.collectedLetters.length)
              message(`+ Litera '${letter.char}'! ✨`, 800)
            }
          }
          if (entity.kind === 'heart' && runtime.lives < 3) {
            runtime.lives += 1
            runtime.nextHeartAt = runtime.elapsed + 16000
            message('Serduszko odzyskane! ♥', 1000)
          }
          recycle(entity)
          continue
        }
        next.push(entity)
      }
      entities.length = 0
      entities.push(...next)
    }

    const moveParticles = (delta: number) => {
      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i]
        particle.y += ((18 + (i % 4) * 7) * runtime.metrics.yScale * delta) / 1000
        particle.x += Math.sin(runtime.elapsed / 600 + i) * 0.35 * runtime.metrics.xScale
        if (particle.y > runtime.metrics.height + 10) {
          particle.y = -8
          particle.x = (i * 53 + runtime.elapsed / 19) % runtime.metrics.width
        }
      }
    }

    const tick = (ticker: Ticker) => {
      if (runtime.state !== 'playing') return
      const delta = Math.min(ticker.deltaMS, 34)

      flapPhase += (delta / 1000) * 9.5
      drawScarab(playerView, 62 * runtime.metrics.unit, flapPhase)

      // Freeze handler for alert banners
      if (runtime.freezeUntil > runtime.elapsed) {
        runtime.elapsed += delta
        if (runtime.elapsed >= runtime.freezeUntil) {
          runtime.freezeUntil = 0
          runtime.eventBanner = null
          if (runtime.postFreezeAction) {
            const action = runtime.postFreezeAction
            runtime.postFreezeAction = null
            action()
          }
          syncHud(true)
        }
        syncHud()
        return
      }

      runtime.elapsed += delta

      // ONLY ONE CHECKPOINT: Before Museum (Stage 3)
      if (runtime.elapsed >= runtime.museumStart && !runtime.museumStageStarted) {
        runtime.elapsed = runtime.museumStart
        runtime.museumStageStarted = true
        runtime.hasReachedCheckpoint = true
        runtime.state = 'checkpoint'
        runtime.lives = 3
        runtime.nextLetterAt = runtime.museumStart + 1800
        runtime.nextHazardAt = runtime.museumStart + 1400
        runtime.nextHeartAt = Infinity
        recycleAll()
        applyBiome('museum', false)
        runtime.player.x = runtime.metrics.width / 2
        runtime.player.y = runtime.metrics.height * 0.32
        runtime.player.vx = 0
        runtime.player.vy = 0
        syncHud(true)
        return
      }

      if (runtime.elapsed >= runtime.totalDuration) {
        finish()
        return
      }

      const nextBiome = biomeAt(runtime.elapsed, runtime.difficulty).id
      if (nextBiome !== runtime.biome) applyBiome(nextBiome, true)
      if (runtime.eventEndsAt && runtime.elapsed >= runtime.eventEndsAt) {
        runtime.eventEndsAt = 0
        runtime.eventWind = 0
        runtime.eventLift = 0
      }

      // Event 1: Spring warm gust (~9.5s)
      if (!runtime.springEventTriggered && runtime.elapsed >= 9500 && runtime.elapsed < 18000) {
        runtime.springEventTriggered = true
        runtime.eventBanner = {
          title: '🌸 WIOSENNY POWIEW! 🌸',
          subtitle: 'Ciepły wiatr znosi nas w bok!',
          type: 'gust',
        }
        runtime.freezeUntil = runtime.elapsed + 2400
        runtime.postFreezeAction = () => {
          const dir = Math.random() < 0.5 ? -1 : 1
          runtime.eventWind = dir * 90 * runtime.metrics.xScale * DIFFICULTY_CONFIGS[runtime.difficulty].eventWindMultiplier
          runtime.eventEndsAt = runtime.elapsed + 3400 * DIFFICULTY_CONFIGS[runtime.difficulty].eventDurationMultiplier
        }
        syncHud(true)
        return
      }

      // Event 2: Winter snow squall (~30s)
      if (!runtime.winterEventTriggered && runtime.elapsed >= 30000 && runtime.elapsed < 42000) {
        runtime.winterEventTriggered = true
        runtime.eventBanner = {
          title: '❄️ ŚNIEŻYCA! ❄️',
          subtitle: 'Zimowy wiatr spycha w bok – uważaj na sople!',
          type: 'storm',
        }
        runtime.freezeUntil = runtime.elapsed + 2400
        runtime.postFreezeAction = () => {
          const dir = Math.random() < 0.5 ? -1 : 1
          runtime.eventWind = dir * 150 * runtime.metrics.xScale * DIFFICULTY_CONFIGS[runtime.difficulty].eventWindMultiplier
          runtime.eventEndsAt = runtime.elapsed + 3800 * DIFFICULTY_CONFIGS[runtime.difficulty].eventDurationMultiplier
        }
        syncHud(true)
        return
      }

      // Event 3: Museum golden aura (~62s)
      if (!runtime.museumEventTriggered && runtime.elapsed >= 62000 && runtime.elapsed < 76000) {
        runtime.museumEventTriggered = true
        runtime.eventBanner = {
          title: '🏛️ ZŁOTY BLASK MUZEUM! 🏛️',
          subtitle: 'Starożytna magia wiruje w korytarzu – uważaj na wazy i relikty!',
          type: 'museum_light',
        }
        runtime.freezeUntil = runtime.elapsed + 2400
        runtime.postFreezeAction = () => {
          runtime.eventWind = -130 * runtime.metrics.xScale * DIFFICULTY_CONFIGS[runtime.difficulty].eventWindMultiplier
          runtime.eventEndsAt = runtime.elapsed + 4000 * DIFFICULTY_CONFIGS[runtime.difficulty].eventDurationMultiplier
        }
        syncHud(true)
        return
      }

      // Spawn hazards
      if (runtime.elapsed >= runtime.nextHazardAt) {
        spawn('hazard')
        const base = runtime.biome === 'winter' ? 1050 : runtime.biome === 'museum' ? 1150 : 1350
        runtime.nextHazardAt = runtime.elapsed + (base + Math.random() * 500) * DIFFICULTY_CONFIGS[runtime.difficulty].hazardIntervalMultiplier
      }

      // Spawn letters
      if (runtime.elapsed >= runtime.nextLetterAt && runtime.spawnedLetterIndex < SPAWN_LETTER_ORDER.length) {
        spawn('letter')
        runtime.nextLetterAt = runtime.elapsed + 4200 + Math.random() * 800
      }

      // Spawn hearts when wounded
      if (runtime.lives < 3 && runtime.elapsed >= runtime.nextHeartAt) {
        spawn('heart')
        runtime.nextHeartAt = runtime.elapsed + 16000
      }

      movePlayer(delta)
      moveEntities(delta)
      moveParticles(delta)
      if (runtime.message && runtime.elapsed >= runtime.messageEndsAt) runtime.message = null
      syncHud()
    }

    const steer = (direction: -1 | 1) => {
      if (runtime.state !== 'playing' || runtime.freezeUntil > runtime.elapsed) return
      runtime.player.vy = -330 * runtime.metrics.yScale
      runtime.player.vx += direction * 155 * runtime.metrics.xScale
      playScarabFlap()
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        event.preventDefault()
        steer(-1)
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        event.preventDefault()
        steer(1)
      } else if (event.code === 'Space') {
        event.preventDefault()
        steer(0 as -1 | 1 || -1)
      }
    }

    const init = async () => {
      try {
        const nextApp = new Application()
        await nextApp.init({
          resizeTo: host,
          backgroundColor: 0x2a1e12,
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
        })
        if (disposed) {
          nextApp.destroy()
          return
        }
        app = nextApp
        host.innerHTML = ''
        host.appendChild(app.canvas)
        playerLayer.addChild(playerView)

        for (let i = 0; i < 28; i += 1) {
          const particle = new Graphics()
          particle.circle(0, 0, 1.8 + (i % 3) * 0.9).fill(0xffffff)
          particle.alpha = 0.25 + (i % 5) * 0.12
          particle.position.set(Math.random() * host.clientWidth, Math.random() * host.clientHeight)
          particleLayer.addChild(particle)
          particles.push(particle)
        }

        app.stage.addChild(backdrop, particleLayer, hazardLayer, itemLayer, playerLayer)
        controlsRef.current = {
          start: reset,
          resumeCheckpoint,
          pause: () => {
            if (runtime.state === 'playing') {
              runtime.state = 'paused'
              syncHud(true)
            } else if (runtime.state === 'paused') {
              runtime.state = 'playing'
              startMuseumJazzMusic()
              syncHud(true)
            }
          },
          skip: () => {
            runtime.state = 'ending'
            runtime.message = null
            syncHud(true)
          },
          steer,
          getCollectedLetters: () => runtime.collectedLetters,
        }

        layout()
        tickerUpdate = (ticker) => tick(ticker)
        app.ticker.add(tickerUpdate)

        resizeObserver = new ResizeObserver(() => layout())
        resizeObserver.observe(host)
        window.addEventListener('keydown', handleKey)
      } catch (initError) {
        console.error('Nie udało się uruchomić gry', initError)
        if (!disposed) setError(true)
      }
    }

    void init()
    return () => {
      disposed = true
      stopMuseumJazzMusic()
      resizeObserver?.disconnect()
      window.removeEventListener('keydown', handleKey)
      controlsRef.current = null
      if (app) {
        if (tickerUpdate) app.ticker.remove(tickerUpdate)
        app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true, texture: true, textureSource: true })
      }
    }
  }, [startEndingChoreography])

  const handleContinueToForm = () => {
    onCompleteRef.current({
      lettersCollected: collectedLetters.length,
      totalLetters: 12,
      difficulty,
      difficultyLabel: DIFFICULTY_CONFIGS[difficulty].label,
    })
  }

  const biomes = getBiomesForDifficulty(difficulty)
  const stageLabel = biomes.find((item) => item.id === biome)?.label ?? biomes[0].label

  // Random trajectory presets for each of the 12 flying letters
  const FLIGHT_PATHS = [
    { startX: -140, startY: -90, midX: -60, midY: -160, rot: -35 },
    { startX: -90, startY: -130, midX: -20, midY: -190, rot: 25 },
    { startX: -150, startY: -40, midX: -80, midY: -120, rot: -45 },
    { startX: -10, startY: -150, midX: 40, midY: -210, rot: 30 },
    { startX: 80, startY: -140, midX: 120, midY: -180, rot: -20 },
    { startX: 140, startY: -90, midX: 160, midY: -140, rot: 40 },
    { startX: -130, startY: 30, midX: -110, midY: -70, rot: -30 },
    { startX: -80, startY: -110, midX: -40, midY: -150, rot: 20 },
    { startX: 30, startY: -160, midX: -20, midY: -200, rot: -25 },
    { startX: 120, startY: -40, midX: 90, midY: -110, rot: 35 },
    { startX: 90, startY: -110, midX: 50, midY: -170, rot: -15 },
    { startX: 150, startY: 20, midX: 110, midY: -60, rot: 45 },
  ]

  return (
    <div className="veil-game-wrapper">
      <div className="game-top-bar">
        <div className="game-lives" aria-label={`Pozostałe życia: ${lives}`}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className={`game-heart ${index < lives ? 'heart-alive' : 'heart-lost'}`}>
              {index < lives ? '❤️' : '🖤'}
            </span>
          ))}
        </div>
        <span className="game-stage-pill">{stageLabel}</span>
        <div className="game-top-actions">
          <button
            type="button"
            className="game-audio-btn"
            onClick={handleToggleSound}
            aria-label={soundMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
            title={soundMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            className="game-pause-btn"
            onClick={togglePause}
            disabled={gameState === 'ready' || gameState === 'gameover' || gameState === 'ending' || gameState === 'checkpoint'}
          >
            {gameState === 'paused' ? 'Wznów' : 'Pauza'}
          </button>
        </div>
      </div>

      <div className="game-progress-wrapper">
        <div className="game-progress-bar">
          <div className="game-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="game-letter-counter">
          ✨ {collectedLetters.length}/12
        </span>
        <span className="game-goal-icon">🏛️</span>
      </div>

      {/* Collected letters shelf */}
      <div className="game-letters-shelf" aria-label="Zebrane litery w locie">
        <span className="letters-shelf-title">Zebrane litery:</span>
        <div className="letters-shelf-chips">
          {collectedLetters.length === 0 ? (
            <span className="shelf-empty-hint">Łap złote runy z literami!</span>
          ) : (
            collectedLetters.map((item, idx) => (
              <span key={`${item.id}-${idx}`} className="letter-shelf-chip pop-in">
                {item.char}
              </span>
            ))
          )}
        </div>
      </div>

      <div className={`game-arena-container ${biome}`}>
        <div ref={hostRef} className="veil-pixi-host" aria-label="Obszar gry" />
        {toast && <div className="biome-toast">{toast}</div>}

        {/* Major event banner */}
        {eventBanner && (
          <div className="game-event-banner">
            <div className={`event-banner-card type-${eventBanner.type}`}>
              <span className="event-banner-title">{eventBanner.title}</span>
              <span className="event-banner-sub">{eventBanner.subtitle}</span>
              <div className="event-banner-timer">
                <div className="event-banner-timer-fill" />
              </div>
            </div>
          </div>
        )}

        <div className="mobile-game-controls" aria-label="Sterowanie dotykowe">
          <button
            type="button"
            className="game-control game-control-left"
            aria-label="Steruj w lewo"
            onPointerDown={(event) => {
              event.preventDefault()
              controlsRef.current?.steer(-1)
            }}
          >
            ←
          </button>
          <button
            type="button"
            className="game-control game-control-right"
            aria-label="Steruj w prawo"
            onPointerDown={(event) => {
              event.preventDefault()
              controlsRef.current?.steer(1)
            }}
          >
            →
          </button>
        </div>

        {error && (
          <div className="game-overlay">
            <div className="game-modal-card">
              <h3 className="modal-heading">Gra nie mogła wystartować</h3>
              <p className="modal-text">Odśwież stronę i spróbuj ponownie.</p>
            </div>
          </div>
        )}

        {/* Ekran Startowy gry */}
        {gameState === 'ready' && !error && (
          <div className="game-overlay">
            <div className="game-modal-card">
              <div className="modal-top-corner-actions">
                <button
                  type="button"
                  className="game-audio-btn modal-audio-btn"
                  onClick={handleToggleSound}
                  aria-label={soundMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
                  title={soundMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
                >
                  {soundMuted ? '🔇' : '🔊'}
                </button>
              </div>

              <div className="scarab-avatar-icon">🪲✨</div>
              <h3 className="modal-heading">Skarabeusz musi dostać się do muzeum, wyruszmy na przygodę!</h3>
              <p className="modal-text">
                Steruj za pomocą strzałek lub tapując lewą/prawą stronę ekranu.
                Omijaj przeszkody, zbieraj złote runy z literami i otwórz pradawny sarkofag!
              </p>

              <div className="game-difficulty-selector" aria-label="Wybór poziomu trudności">
                <p className="game-difficulty-title">Wybierz poziom trudności</p>
                <div className="game-difficulty-options" role="group" aria-label="Poziom trudności">
                  {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((key) => {
                    const config = DIFFICULTY_CONFIGS[key]
                    const selected = difficulty === key
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`game-difficulty-btn ${selected ? 'selected' : ''}`}
                        onClick={() => selectDifficulty(key)}
                        aria-pressed={selected}
                      >
                        <span className="game-difficulty-emoji" aria-hidden="true">{config.emoji}</span>
                        <span className="game-difficulty-label">{config.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="game-difficulty-selected-description" aria-live="polite">
                <span className="game-difficulty-selected-icon" aria-hidden="true">
                  {DIFFICULTY_CONFIGS[difficulty].emoji}
                </span>
                <span>{DIFFICULTY_CONFIGS[difficulty].description}</span>
              </div>

              <div className="modal-actions-column">
                <button type="button" className="game-primary-btn" onClick={startGame}>
                  Wyruszmy na przygodę 🪲
                </button>
                <button type="button" className="game-skip-btn" onClick={handleSkipGame}>
                  Pomiń grę ⏭️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* JEDYNY Checkpoint: Wejście do Muzeum ze zdjęciem muzeum-wejscie.png */}
        {gameState === 'checkpoint' && (
          <div className="game-overlay museum-entrance-overlay" onClick={(e) => e.stopPropagation()}>
            {/* Otwierające się drzwi i ściemnienie ekranu */}
            <div className={`museum-cinematic-doors ${doorOpening ? 'doors-open-anim' : ''}`}>
              <div className="museum-door-leaf leaf-left" />
              <div className="museum-door-leaf leaf-right" />
              <div className="screen-dark-fade" />
            </div>

            <div className="museum-entrance-card">
              <span className="checkpoint-badge museum-badge">Checkpoint • Wrota Muzeum 🏛️</span>
              <div className="museum-image-wrapper">
                <img
                  src="/muzeum-wejscie.png"
                  alt="Wejście do Muzeum Tajemnic"
                  className="museum-entrance-img"
                />
              </div>

              <h3 className="modal-heading museum-title">Dotarłaś do muzeum</h3>
              <p className="modal-text museum-text">
                Wiosenny wiatr i zimowy mróz pokonane! Przed Tobą wejście do Muzeum Tajemnic. W środku gra jazzowa muzyka, a w głębi komnat czeka złoty sarkofag!
              </p>

              <div className="modal-actions-column">
                <button
                  type="button"
                  className="game-primary-btn museum-enter-btn"
                  onClick={handleEnterMuseum}
                  disabled={doorOpening}
                >
                  Wejdź 🗝️
                </button>
                <button
                  type="button"
                  className="game-skip-btn"
                  onClick={handleSkipGame}
                  disabled={doorOpening}
                >
                  Pomiń grę ⏭️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pauza */}
        {gameState === 'paused' && (
          <div className="game-overlay">
            <div className="game-modal-card">
              <h3 className="modal-heading">Pauza</h3>
              <p className="modal-text">Złap oddech i przygotuj się na kolejny etap przygody.</p>
              <div className="modal-actions-column">
                <button type="button" className="game-primary-btn" onClick={togglePause}>
                  Wznów grę
                </button>
                <button type="button" className="game-skip-btn" onClick={handleSkipGame}>
                  Pomiń grę ⏭️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over */}
        {gameState === 'gameover' && (
          <div className="game-overlay">
            <div className="game-modal-card">
              <h3 className="modal-heading">Koniec lotu!</h3>
              <p className="modal-text">
                {hasCheckpoint
                  ? 'Możesz wznowić grę bezpośrednio od wejścia do Muzeum!'
                  : 'Skarabeusz może spróbować ponownie od początku.'}
              </p>

              <div className="game-difficulty-selector gameover-difficulty-selector" aria-label="Zmień poziom trudności">
                <p className="game-difficulty-title">Poziom trudności</p>
                <div className="game-difficulty-options" role="group" aria-label="Poziom trudności">
                  {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((key) => {
                    const config = DIFFICULTY_CONFIGS[key]
                    const selected = difficulty === key
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`game-difficulty-btn ${selected ? 'selected' : ''}`}
                        onClick={() => selectDifficulty(key)}
                        aria-pressed={selected}
                      >
                        <span className="game-difficulty-emoji" aria-hidden="true">{config.emoji}</span>
                        <span className="game-difficulty-label">{config.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="modal-actions-column">
                {hasCheckpoint ? (
                  <>
                    <button type="button" className="game-primary-btn" onClick={() => controlsRef.current?.resumeCheckpoint()}>
                      Wróć do Muzeum 🏛️
                    </button>
                    <button type="button" className="game-subtle-btn" onClick={startGame}>
                      Od początku 🪲
                    </button>
                  </>
                ) : (
                  <button type="button" className="game-primary-btn" onClick={startGame}>
                    Spróbuj ponownie ↺
                  </button>
                )}
                <button type="button" className="game-skip-btn" onClick={handleSkipGame}>
                  Pomiń grę ⏭️
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Finałowa sekwencja: Strażnik Sarkofagu + Zagadka Hot Twórcy + Otwarcie Sarkofagu 3D + Chmura Liter i Losowy Wlot */}
        {gameState === 'ending' && endingPhase !== 'none' && (
          <div className="game-overlay sarcophagus-ending-overlay" onClick={(e) => e.stopPropagation()}>
            {/* Faza 1: Pytanie Strażnika Sarkofagu */}
            {(endingPhase === 'guardian_question' || endingPhase === 'guardian_wrong' || endingPhase === 'guardian_correct') && (
              <div className={`guardian-dialogue-stage ${endingPhase === 'guardian_wrong' ? 'shake-wrong' : ''}`}>
                <div className="guardian-visual">
                  <div className="guardian-avatar">
                    <svg viewBox="0 0 120 120" className="guardian-svg">
                      {/* Pharaoh Nemes Headdress */}
                      <path d="M 20 60 Q 60 10 100 60 L 95 95 L 80 85 L 60 92 L 40 85 L 25 95 Z" fill="#d4af37" stroke="#ffd54f" strokeWidth="2.5" />
                      <path d="M 30 50 Q 60 25 90 50" stroke="#1565c0" strokeWidth="4" fill="none" />
                      <path d="M 28 65 Q 60 40 92 65" stroke="#1565c0" strokeWidth="4" fill="none" />
                      <ellipse cx="60" cy="62" rx="22" ry="24" fill="#e0a96d" stroke="#b37d47" strokeWidth="1.5" />
                      <path d="M 46 58 Q 52 54 58 58 Q 52 61 46 58 Z" fill="#111" />
                      <path d="M 62 58 Q 68 54 74 58 Q 68 61 62 58 Z" fill="#111" />
                      <path d="M 43 57 L 58 57 L 60 62" stroke="#111" strokeWidth="1.5" fill="none" />
                      <path d="M 77 57 L 62 57 L 60 62" stroke="#111" strokeWidth="1.5" fill="none" />
                      <path d="M 60 60 L 58 68 L 62 68" stroke="#a06838" strokeWidth="1.5" fill="none" />
                      <path d="M 52 74 Q 60 78 68 74" stroke="#794628" strokeWidth="1.8" fill="none" />
                      <rect x="56" y="80" width="8" height="22" rx="3" fill="#ffd700" stroke="#b78103" strokeWidth="1.5" />
                      <circle cx="60" cy="30" r="6" fill="#00bcd4" stroke="#ffd700" strokeWidth="1.5" />
                      <circle cx="60" cy="30" r="2.5" fill="#d50000" />
                    </svg>
                  </div>
                  <span className="guardian-name-badge">Strażnik Sarkofagu</span>
                </div>

                <div className="guardian-speech-card">
                  <p className="guardian-question-text">
                    „Aby otworzyć pradawny sarkofag, musisz odpowiedzieć na jedno pytanie:
                    <br />
                    <strong>Jak bardzo hot jest twórca tej gry?</strong>”
                  </p>

                  {guardianMessage && (
                    <div className={`guardian-feedback-msg ${endingPhase === 'guardian_correct' ? 'msg-correct' : 'msg-wrong'}`}>
                      {guardianMessage}
                    </div>
                  )}

                  <div className="hot-scale-picker" role="radiogroup" aria-label="Ocena w skali 1 do 10">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`hot-scale-btn ${selectedHotValue === val ? 'btn-selected' : ''}`}
                        onClick={() => handleAnswerHotQuestion(val)}
                        disabled={endingPhase === 'guardian_correct'}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Faza 2 & 3: Sarkofag 3D + Chmura Wiszących Liter w Powietrzu + Powolny Losowy Wlot */}
            {(endingPhase === 'sarcophagus_opening' || endingPhase === 'flying_letters' || endingPhase === 'complete') && (
              <div className="sarcophagus-cinematic-stage">
                <div className="sarcophagus-header">
                  <div className="sarcophagus-score-pill">
                    <span className="score-icon">📜</span>
                    <span className="score-text">
                      Zebrane litery: <strong>{collectedLetters.length} / 12</strong>
                    </span>
                  </div>
                  <span className="sarcophagus-stage-badge">Złoty Sarkofag Faraona ✨</span>
                  <h2 className="sarcophagus-title">
                    {endingPhase === 'complete' ? 'Hasło Odkryte!' : 'Sarkofag staje otworem...'}
                  </h2>
                  <p className="sarcophagus-flight-info-banner">
                    {endingPhase === 'complete'
                      ? 'Wszystkie złote litery połączyły się w proroctwo!'
                      : '✨ Twoje zebrane litery unoszą się w powietrzu i wlatują do sarkofagu! ✨'}
                  </p>
                </div>

                {/* Chmurka liter wiszących w powietrzu przed przelotem (w losowym układzie) */}
                {endingPhase !== 'complete' && (
                  <div className="floating-letters-sky-cluster">
                    <span className="sky-cluster-label">
                      Zdobyte litery w powietrzu ({collectedLetters.length}/12):
                    </span>
                    <div className="sky-cluster-chips">
                      {skyLetters.length === 0 ? (
                        <span className="sky-empty-hint">Brak zdobytych liter – sarkofag sam uzupełni runy</span>
                      ) : (
                        skyLetters.map((item, idx) => {
                          const hasFlown = placedCollectedIds.includes(item.id)
                          const isCurrentlyFlying = activeFlyingId === item.id

                          return (
                            <div
                              key={`sky-${item.id}-${idx}`}
                              className={`sky-letter-chip chip-gold ${hasFlown ? 'chip-departed' : ''} ${isCurrentlyFlying ? 'chip-launching' : ''}`}
                              style={{ animationDelay: `${(idx % 5) * 0.22}s` }}
                            >
                              {item.char}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Widok Sarkofagu w 3D */}
                <div className="sarcophagus-3d-wrapper">
                  <div className={`sarcophagus-3d-box ${endingPhase !== 'sarcophagus_opening' ? 'lid-opened' : ''} ${isFlashing ? 'sarcophagus-flashing' : ''}`}>
                    {/* Złote wieko sarkofagu */}
                    <div className="sarcophagus-lid">
                      <div className="lid-pharaoh-face">👑</div>
                      <div className="lid-gold-ornament" />
                    </div>

                    {/* Wnętrze sarkofagu ze slotami na litery */}
                    <div className="sarcophagus-interior">
                      <div className="sarcophagus-glow-aura" />

                      <div className="sarcophagus-words-container">
                        {/* Word 1: JESTEŚ (slots 0..5) */}
                        <div className="sarcophagus-word word-1">
                          {SECRET_LETTERS.slice(0, 6).map((letter, idx) => {
                            const isPlaced = placedCollectedIds.includes(letter.id)
                            const p = FLIGHT_PATHS[idx]

                            return (
                              <div key={letter.id} className="sarcophagus-slot">
                                {isPlaced ? (
                                  <span
                                    className="slot-gold-letter letter-was-collected dynamic-swoop-in"
                                    style={{
                                      ['--start-x' as string]: `${p.startX}px`,
                                      ['--start-y' as string]: `${p.startY}px`,
                                      ['--mid-x' as string]: `${p.midX}px`,
                                      ['--mid-y' as string]: `${p.midY}px`,
                                      ['--rot' as string]: `${p.rot}deg`,
                                    }}
                                  >
                                    {letter.char}
                                  </span>
                                ) : showGrayout ? (
                                  <span
                                    className="slot-gold-letter letter-grayout scale-up-reveal"
                                    style={{ animationDelay: `${(idx % 6) * 0.08}s` }}
                                  >
                                    {letter.char}
                                  </span>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>

                        <div className="sarcophagus-word-divider" />

                        {/* Word 2: SŁODKA (slots 6..11) */}
                        <div className="sarcophagus-word word-2">
                          {SECRET_LETTERS.slice(6, 12).map((letter, idx) => {
                            const slotGlobalIndex = 6 + idx
                            const isPlaced = placedCollectedIds.includes(letter.id)
                            const p = FLIGHT_PATHS[slotGlobalIndex]

                            return (
                              <div key={letter.id} className="sarcophagus-slot">
                                {isPlaced ? (
                                  <span
                                    className="slot-gold-letter letter-was-collected dynamic-swoop-in"
                                    style={{
                                      ['--start-x' as string]: `${p.startX}px`,
                                      ['--start-y' as string]: `${p.startY}px`,
                                      ['--mid-x' as string]: `${p.midX}px`,
                                      ['--mid-y' as string]: `${p.midY}px`,
                                      ['--rot' as string]: `${p.rot}deg`,
                                    }}
                                  >
                                    {letter.char}
                                  </span>
                                ) : showGrayout ? (
                                  <span
                                    className="slot-gold-letter letter-grayout scale-up-reveal"
                                    style={{ animationDelay: `${(idx % 6) * 0.08}s` }}
                                  >
                                    {letter.char}
                                  </span>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {endingPhase === 'complete' && (
                  <div className="sarcophagus-celebration-footer">
                
                    <div className="sarcophagus-final-count-badge">
                      🏆 Zdobyłaś <strong>{collectedLetters.length} / 12</strong> liter na poziomie {DIFFICULTY_CONFIGS[difficulty].label}!
                    </div>
                    <button
                      type="button"
                      className="btn btn-tak btn-kontynuujmy"
                      onClick={handleContinueToForm}
                    >
                      Kontynuujmy ✨
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="game-steering-hint">
        <span>Tapuj lewo/prawo, aby sterować</span>
        <span>•</span>
        <span>Spacja lub strzałki na klawiaturze</span>
      </div>
    </div>
  )
}
