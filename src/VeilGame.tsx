import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics, Rectangle, Sprite, Text, type Ticker } from 'pixi.js'
import {
  startCemeteryMusic,
  stopCemeteryMusic,
  playScytheSlash,
  playLetterChime,
  playBatFlap,
  getSoundMuted,
  toggleSoundMuted,
} from './soundEffects'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type DifficultyConfig = {
  label: string
  emoji: string
  description: string
  cemeteryStart: number
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
    description: 'Klasyczna gra: brak obrażeń od ścian, łagodniejszy wiatr.',
    cemeteryStart: 44_000,
    totalDuration: 86_000,
    hazardIntervalMultiplier: 1.0,
    eventWindMultiplier: 1.0,
    eventDurationMultiplier: 1.0,
    sideDamage: false,
  },
  medium: {
    label: 'Średni',
    emoji: '⚡',
    description: 'Ściany boczne ranią! Nieco dłuższe i silniejsze zjawiska pogodowe, ciut więcej przeszkód.',
    cemeteryStart: 48_000,
    totalDuration: 94_000,
    hazardIntervalMultiplier: 0.82,
    eventWindMultiplier: 1.25,
    eventDurationMultiplier: 1.2,
    sideDamage: true,
  },
  hard: {
    label: 'Trudny',
    emoji: '🔥',
    description: 'Prawdziwe wyzwanie! Raniące ściany, potężne wichury, gęste przeszkody i dłuższy lot.',
    cemeteryStart: 54_000,
    totalDuration: 106_000,
    hazardIntervalMultiplier: 0.68,
    eventWindMultiplier: 1.55,
    eventDurationMultiplier: 1.35,
    sideDamage: true,
  },
}

export type BiomeId = 'spring' | 'winter' | 'cemetery'

export const getBiomesForDifficulty = (diff: Difficulty) => {
  const cfg = DIFFICULTY_CONFIGS[diff]
  return [
    { id: 'spring' as BiomeId, label: '🌸 Wiosenny wiatr', until: Math.round(cfg.cemeteryStart * 0.48), event: 'Wiosenny podmuch' },
    { id: 'winter' as BiomeId, label: '❄️ Zimowy mróz', until: cfg.cemeteryStart, event: 'Śnieżyca' },
    { id: 'cemetery' as BiomeId, label: '🪦 Ponury cmentarz', until: cfg.totalDuration, event: 'Cmentarna mgła' },
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
// Stage 3 (Cemetery): J, O, S, E
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
  type: 'gust' | 'storm' | 'cemetery_fog'
}

type VeilGameProps = {
  onComplete: (result: VeilGameResult) => void
  skipToEndTest?: boolean
}

type GameState = 'ready' | 'playing' | 'checkpoint' | 'paused' | 'gameover' | 'ending'
type EntityKind = 'hazard' | 'letter' | 'heart'
type HazardType = 'twig' | 'icicle' | 'tombstone' | 'ghost_wisp' | 'raven'
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
  cemeteryStageStarted: boolean
  freezeUntil: number
  eventBanner: EventBanner | null
  postFreezeAction: (() => void) | null
  springEventTriggered: boolean
  winterEventTriggered: boolean
  cemeteryEventTriggered: boolean
  difficulty: Difficulty
  cemeteryStart: number
  totalDuration: number
  collectedLetters: SecretLetter[]
}

export type EndingTile = {
  id: number
  char: string
  isCollected: boolean
}

type EndingPhase =
  | 'none'
  | 'scythe'
  | 'dropped_collected'
  | 'dropped_grayout'
  | 'swapping'
  | 'solved'

const createMetrics = (width: number, height: number): Metrics => ({
  width,
  height,
  xScale: Math.max(width / 340, 0.72),
  yScale: Math.max(height / 520, 0.72),
  unit: Math.max(Math.min(width / 340, height / 520), 0.72),
})

function drawKite(view: Graphics, size: number): void {
  view.clear()
  const s = size * 0.72

  // Tail ribbon string
  view.moveTo(0, s * 0.52)
    .bezierCurveTo(-s * 0.28, s * 0.82, s * 0.28, s * 1.08, 0, s * 1.38)
    .bezierCurveTo(-s * 0.24, s * 1.64, s * 0.24, s * 1.88, 0, s * 2.15)
    .stroke({ width: (2.2 * size) / 64, color: 0xff80ab, cap: 'round' })

  // Ribbon bows on the tail
  const bowPoints = [
    { x: -s * 0.05, y: s * 0.88, color: 0xff4081 },
    { x: s * 0.1, y: s * 1.32, color: 0xffd54f },
    { x: -s * 0.08, y: s * 1.74, color: 0x00e5ff },
    { x: 0, y: s * 2.14, color: 0xf50057 },
  ]
  for (const bow of bowPoints) {
    const bw = (5.6 * size) / 64
    const bh = (3.4 * size) / 64
    view.ellipse(bow.x - bw * 0.8, bow.y, bw, bh).fill(bow.color)
    view.ellipse(bow.x + bw * 0.8, bow.y, bw, bh).fill(bow.color)
    view.circle(bow.x, bow.y, (2.2 * size) / 64).fill(0xffffff)
  }

  // Kite diamond vertices
  const top = { x: 0, y: -s * 0.62 }
  const right = { x: s * 0.48, y: -s * 0.06 }
  const bottom = { x: 0, y: s * 0.52 }
  const left = { x: -s * 0.48, y: -s * 0.06 }
  const center = { x: 0, y: -s * 0.06 }

  // 4 colorful quadrants
  view.poly([top.x, top.y, center.x, center.y, left.x, left.y], true).fill(0xff4081)
  view.poly([top.x, top.y, right.x, right.y, center.x, center.y], true).fill(0xffd54f)
  view.poly([left.x, left.y, center.x, center.y, bottom.x, bottom.y], true).fill(0x00e5ff)
  view.poly([center.x, center.y, right.x, right.y, bottom.x, bottom.y], true).fill(0xf50057)

  // Outer kite border
  view.poly([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y], true)
    .stroke({ width: (2.4 * size) / 64, color: 0xffffff, alpha: 0.95, join: 'round' })

  // Wooden frame struts
  view.moveTo(top.x, top.y).lineTo(bottom.x, bottom.y)
    .stroke({ width: (2.2 * size) / 64, color: 0x5d4037, cap: 'round' })
  view.moveTo(left.x, left.y).lineTo(right.x, right.y)
    .stroke({ width: (2.2 * size) / 64, color: 0x5d4037, cap: 'round' })

  // Center knot
  view.circle(center.x, center.y, (3.4 * size) / 64).fill(0xffffff)
    .circle(center.x, center.y, (1.8 * size) / 64).fill(0xe91e63)

  // Sparkle gleam on upper tip
  view.circle(top.x, top.y + s * 0.12, (2.6 * size) / 64).fill({ color: 0xffffff, alpha: 0.65 })
}

function drawBat(view: Graphics, size: number, flapPhase = 0): void {
  view.clear()
  const s = size * 0.72
  const wingFlap = Math.sin(flapPhase) * 0.38

  // Left wing tip & joint
  const lwTipX = -s * 1.35
  const lwTipY = -s * 0.15 + wingFlap * s * 0.8
  const lwJointX = -s * 0.68
  const lwJointY = -s * 0.55 + wingFlap * s * 0.35
  const lwBaseY = s * 0.32

  // Left wing membrane
  view.poly([
    0, -s * 0.15,
    lwJointX, lwJointY,
    lwTipX, lwTipY,
    -s * 1.05, lwTipY + s * 0.35,
    -s * 0.72, lwTipY + s * 0.22,
    -s * 0.42, lwBaseY,
    0, s * 0.28,
  ], true).fill(0x231a34)
    .stroke({ width: 1.8, color: 0x5a4178, join: 'round' })

  // Left wing struts
  view.moveTo(0, -s * 0.15).lineTo(lwJointX, lwJointY).lineTo(lwTipX, lwTipY)
    .stroke({ width: 2.2, color: 0x3d2b59, cap: 'round' })
  view.moveTo(lwJointX, lwJointY).lineTo(-s * 1.05, lwTipY + s * 0.35)
    .stroke({ width: 1.4, color: 0x3d2b59 })
  view.moveTo(lwJointX, lwJointY).lineTo(-s * 0.72, lwTipY + s * 0.22)
    .stroke({ width: 1.4, color: 0x3d2b59 })

  // Right wing tip & joint
  const rwTipX = s * 1.35
  const rwTipY = -s * 0.15 + wingFlap * s * 0.8
  const rwJointX = s * 0.68
  const rwJointY = -s * 0.55 + wingFlap * s * 0.35
  const rwBaseY = s * 0.32

  // Right wing membrane
  view.poly([
    0, -s * 0.15,
    rwJointX, rwJointY,
    rwTipX, rwTipY,
    s * 1.05, rwTipY + s * 0.35,
    s * 0.72, rwTipY + s * 0.22,
    s * 0.42, rwBaseY,
    0, s * 0.28,
  ], true).fill(0x231a34)
    .stroke({ width: 1.8, color: 0x5a4178, join: 'round' })

  // Right wing struts
  view.moveTo(0, -s * 0.15).lineTo(rwJointX, rwJointY).lineTo(rwTipX, rwTipY)
    .stroke({ width: 2.2, color: 0x3d2b59, cap: 'round' })
  view.moveTo(rwJointX, rwJointY).lineTo(s * 1.05, rwTipY + s * 0.35)
    .stroke({ width: 1.4, color: 0x3d2b59 })
  view.moveTo(rwJointX, rwJointY).lineTo(s * 0.72, rwTipY + s * 0.22)
    .stroke({ width: 1.4, color: 0x3d2b59 })

  // Bat body
  view.ellipse(0, 0, s * 0.36, s * 0.48).fill(0x191124)
    .stroke({ width: 1.8, color: 0x483262 })
  view.ellipse(0, s * 0.08, s * 0.22, s * 0.28).fill({ color: 0x322248, alpha: 0.85 })

  // Bat head
  view.circle(0, -s * 0.36, s * 0.3).fill(0x191124)

  // Pointy ears
  view.poly([-s * 0.26, -s * 0.36, -s * 0.36, -s * 0.78, -s * 0.1, -s * 0.54], true).fill(0x191124)
  view.poly([-s * 0.23, -s * 0.4, -s * 0.32, -s * 0.72, -s * 0.12, -s * 0.54], true).fill(0x8e24aa)

  view.poly([s * 0.26, -s * 0.36, s * 0.36, -s * 0.78, s * 0.1, -s * 0.54], true).fill(0x191124)
  view.poly([s * 0.23, -s * 0.4, s * 0.32, -s * 0.72, s * 0.12, -s * 0.54], true).fill(0x8e24aa)

  // Glowing eyes
  view.circle(-s * 0.12, -s * 0.38, s * 0.075).fill(0xff1744)
    .circle(-s * 0.1, -s * 0.4, s * 0.03).fill(0xffffff)
  view.circle(s * 0.12, -s * 0.38, s * 0.075).fill(0xff1744)
    .circle(s * 0.14, -s * 0.4, s * 0.03).fill(0xffffff)

  // Fangs
  view.poly([-s * 0.07, -s * 0.26, -s * 0.05, -s * 0.18, -s * 0.02, -s * 0.26], true).fill(0xffffff)
  view.poly([s * 0.02, -s * 0.26, s * 0.05, -s * 0.18, s * 0.07, -s * 0.26], true).fill(0xffffff)
}

function drawEntity(entity: Entity, biome: BiomeId, unit: number): void {
  const { graphics, sprite, text } = entity
  graphics.clear()
  sprite.visible = false

  if (entity.kind === 'letter') {
    entity.radius = 16 * unit
    const r = entity.radius

    if (biome === 'cemetery') {
      graphics.circle(0, 0, r * 1.35).fill({ color: 0xba68c8, alpha: 0.28 })
      graphics.poly([
        0, -r,
        r * 0.88, -r * 0.5,
        r * 0.88, r * 0.5,
        0, r,
        -r * 0.88, r * 0.5,
        -r * 0.88, -r * 0.5,
      ], true).fill(0x4a148c).stroke({ width: 2.2 * unit, color: 0xce93d8, join: 'round' })
      graphics.circle(0, 0, r * 0.45).fill({ color: 0xab47bc, alpha: 0.5 })
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

  if (biome === 'cemetery') {
    const hazard = entity.hazardType || 'tombstone'

    if (hazard === 'tombstone') {
      entity.radius = 20 * unit
      const r = entity.radius
      graphics.ellipse(0, r * 0.85, r * 0.9, r * 0.22).fill(0x181818)
      graphics.moveTo(-r * 0.65, r * 0.85)
        .lineTo(-r * 0.65, -r * 0.3)
        .bezierCurveTo(-r * 0.65, -r * 0.95, r * 0.65, -r * 0.95, r * 0.65, -r * 0.3)
        .lineTo(r * 0.65, r * 0.85)
        .closePath()
        .fill(0x3e3e44)
        .stroke({ width: 1.8 * unit, color: 0x6e6e76 })
      graphics.rect(-2.2 * unit, -r * 0.65, 4.4 * unit, r * 0.75).fill(0x1e1e24)
      graphics.rect(-r * 0.3, -r * 0.45, r * 0.6, 4.4 * unit).fill(0x1e1e24)
      graphics.ellipse(-r * 0.4, r * 0.65, r * 0.18, r * 0.12).fill(0x2e7d32)
      return
    }

    if (hazard === 'ghost_wisp') {
      entity.radius = 18 * unit
      const r = entity.radius
      graphics.circle(0, 0, r * 1.3).fill({ color: 0x00e5ff, alpha: 0.2 })
      graphics.moveTo(0, -r)
        .bezierCurveTo(r * 0.9, -r * 0.3, r * 0.8, r * 0.6, 0, r)
        .bezierCurveTo(-r * 0.8, r * 0.6, -r * 0.9, -r * 0.3, 0, -r)
        .fill(0x00bcd4)
        .stroke({ width: 1.5 * unit, color: 0xe0f7fa })
      graphics.circle(0, -r * 0.15, r * 0.4).fill(0xffffff)
      graphics.circle(-r * 0.2, -r * 0.2, r * 0.12).fill(0x006064)
      graphics.circle(r * 0.2, -r * 0.2, r * 0.12).fill(0x006064)
      return
    }

    entity.radius = 19 * unit
    const r = entity.radius
    graphics.ellipse(0, 0, r * 0.4, r * 0.65).fill(0x121216)
    graphics.poly([0, -r * 0.2, -r * 1.15, -r * 0.55, -r * 0.8, r * 0.25, 0, r * 0.3], true)
      .fill(0x21212a).stroke({ width: 1.4, color: 0x424252 })
    graphics.poly([0, -r * 0.2, r * 1.15, -r * 0.55, r * 0.8, r * 0.25, 0, r * 0.3], true)
      .fill(0x21212a).stroke({ width: 1.4, color: 0x424252 })
    graphics.poly([0, -r * 0.6, r * 0.45, -r * 0.65, 0, -r * 0.45], true).fill(0xffb300)
    graphics.circle(r * 0.08, -r * 0.55, 2.2 * unit).fill(0xff1744)
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
  if (biome === 'cemetery') {
    view.rect(0, 0, metrics.width, metrics.height * 0.65).fill(0x0a0c1a)
    view.rect(0, metrics.height * 0.65, metrics.width, metrics.height * 0.35).fill(0x141224)

    const moonX = metrics.width * 0.8
    const moonY = metrics.height * 0.22
    const moonR = 26 * metrics.unit
    view.circle(moonX, moonY, moonR * 2.2).fill({ color: 0x9fa8da, alpha: 0.12 })
    view.circle(moonX, moonY, moonR * 1.5).fill({ color: 0xc5cae9, alpha: 0.22 })
    view.circle(moonX, moonY, moonR).fill(0xe8eaf6)
    view.circle(moonX - moonR * 0.2, moonY - moonR * 0.25, moonR * 0.25).fill({ color: 0xb0bec5, alpha: 0.35 })
    view.circle(moonX + moonR * 0.35, moonY + moonR * 0.1, moonR * 0.18).fill({ color: 0xb0bec5, alpha: 0.3 })

    view.poly([
      0, metrics.height * 0.72,
      metrics.width * 0.3, metrics.height * 0.68,
      metrics.width * 0.65, metrics.height * 0.74,
      metrics.width, metrics.height * 0.7,
      metrics.width, metrics.height,
      0, metrics.height,
    ], true).fill(0x0d0d18)

    const tx = metrics.width * 0.25
    const ty = metrics.height * 0.69
    view.rect(tx - 2, ty - 18, 4, 18).fill(0x080810)
    view.rect(tx - 8, ty - 14, 16, 3.5).fill(0x080810)

    const tx2 = metrics.width * 0.68
    const ty2 = metrics.height * 0.73
    view.rect(tx2 - 2, ty2 - 14, 4, 14).fill(0x080810)
    view.rect(tx2 - 6, ty2 - 11, 12, 3).fill(0x080810)

    view.rect(0, metrics.height * 0.86, metrics.width, metrics.height * 0.14).fill(0x070710)
    return
  }

  const palette =
    biome === 'spring'
      ? [0xf7fff1, 0xe5f7d5, 0x9fd596]
      : [0xf4fafd, 0xe3f2fd, 0x9ec5e5]

  view.rect(0, 0, metrics.width, metrics.height * 0.48).fill(palette[0])
    .rect(0, metrics.height * 0.48, metrics.width, metrics.height * 0.52).fill(palette[1])
    .rect(0, metrics.height * 0.82, metrics.width, metrics.height * 0.18).fill({ color: palette[2], alpha: 0.2 })
}

export default function VeilGame({ onComplete, skipToEndTest }: VeilGameProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<{
    start: () => void
    startCheckpoint: () => void
    resumeCheckpoint: () => void
    pause: () => void
    steer: (direction: -1 | 1) => void
  } | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const [gameState, setGameState] = useState<GameState>('ready')
  const [lives, setLives] = useState(3)
  const [collectedLetters, setCollectedLetters] = useState<SecretLetter[]>([])
  const [hasCheckpoint, setHasCheckpoint] = useState(false)
  const [gatesOpen, setGatesOpen] = useState(false)
  const [enterReady, setEnterReady] = useState(false)
  const [biome, setBiome] = useState<BiomeId>('spring')
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [eventBanner, setEventBanner] = useState<EventBanner | null>(null)
  const [error, setError] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const difficultyRef = useRef<Difficulty>('easy')
  const [soundMuted, setSoundMuted] = useState(getSoundMuted())

  // Ending Cutscene States
  const [endingPhase, setEndingPhase] = useState<EndingPhase>('none')
  const [endingTiles, setEndingTiles] = useState<EndingTile[]>([])
  const [activeSwappingIds, setActiveSwappingIds] = useState<number[]>([])

  const selectDifficulty = useCallback((nextDifficulty: Difficulty) => {
    difficultyRef.current = nextDifficulty
    setDifficulty(nextDifficulty)
  }, [])

  const handleToggleSound = useCallback(() => {
    const next = toggleSoundMuted()
    setSoundMuted(next)
  }, [])

  const startGame = useCallback(() => controlsRef.current?.start(), [])
  const restartFromCheckpoint = useCallback(() => controlsRef.current?.startCheckpoint(), [])
  const resumeCheckpoint = useCallback(() => controlsRef.current?.resumeCheckpoint(), [])
  const togglePause = useCallback(() => controlsRef.current?.pause(), [])

  const handleOpenGates = useCallback(() => {
    setGatesOpen(true)
    setTimeout(() => {
      setEnterReady(true)
    }, 650)
  }, [])

  // Start the choreographed ending sequence
  const startEndingChoreography = useCallback((collected: SecretLetter[]) => {
    stopCemeteryMusic()
    setGameState('ending')
    setEndingPhase('scythe')
    playScytheSlash()

    // Build the initial 12 slots:
    // First: collected letters in the order collected
    // Next: uncollected letters as grayout
    const collectedIds = new Set(collected.map((c) => c.id))
    const initialTiles: EndingTile[] = [
      ...collected.map((c) => ({ id: c.id, char: c.char, isCollected: true })),
      ...SECRET_LETTERS.filter((l) => !collectedIds.has(l.id)).map((l) => ({
        id: l.id,
        char: l.char,
        isCollected: false,
      })),
    ]
    setEndingTiles(initialTiles)

    // Step 1: Scythe swings for 2.4s while "Koniec upiorności" is displayed
    setTimeout(() => {
      // Step 2: Show "Twój wynik" and drop collected letters into the first slots
      setEndingPhase('dropped_collected')
      playLetterChime(1)

      // Step 3: After 1.4s, drop the grayed-out letters into the remaining slots
      setTimeout(() => {
        setEndingPhase('dropped_grayout')
        playLetterChime(4)

        // Step 4: After another 1.4s, start swapping letters until "JESTEŚ SŁODKA" is formed
        setTimeout(() => {
          setEndingPhase('swapping')
        }, 1400)
      }, 1400)
    }, 2400)
  }, [])

  // Swap animation ticker: step by step swaps elements until sorted
  useEffect(() => {
    if (endingPhase !== 'swapping') return

    let current = [...endingTiles]
    let stepCount = 0

    const interval = window.setInterval(() => {
      // Find first out-of-order element
      let firstMisplaced = -1
      for (let i = 0; i < current.length; i++) {
        if (current[i].id !== i) {
          firstMisplaced = i
          break
        }
      }

      if (firstMisplaced === -1) {
        // All elements are in place!
        clearInterval(interval)
        setActiveSwappingIds([])
        setEndingPhase('solved')
        playLetterChime(11)
        return
      }

      // Find where element with id `firstMisplaced` currently is
      const targetId = firstMisplaced
      const currentPos = current.findIndex((t) => t.id === targetId)

      if (currentPos !== -1) {
        // Swap items at firstMisplaced and currentPos
        const next = [...current]
        const temp = next[firstMisplaced]
        next[firstMisplaced] = next[currentPos]
        next[currentPos] = temp
        current = next
        setEndingTiles(next)

        setActiveSwappingIds([next[firstMisplaced].id, next[currentPos].id])
        playLetterChime(stepCount)
        stepCount += 1

        setTimeout(() => {
          setActiveSwappingIds([])
        }, 220)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [endingPhase])

  // If test skip was requested from the invite screen
  useEffect(() => {
    if (skipToEndTest) {
      // Pick exactly 6 letters (half of the 12) from SPAWN_LETTER_ORDER
      const halfIds = SPAWN_LETTER_ORDER.slice(0, 6)
      const halfLetters = halfIds
        .map((id) => SECRET_LETTERS.find((l) => l.id === id)!)
        .filter(Boolean)
      setCollectedLetters(halfLetters)
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
      cemeteryStageStarted: false,
      freezeUntil: 0,
      eventBanner: null,
      postFreezeAction: null,
      springEventTriggered: false,
      winterEventTriggered: false,
      cemeteryEventTriggered: false,
      difficulty,
      cemeteryStart: DIFFICULTY_CONFIGS[difficulty].cemeteryStart,
      totalDuration: DIFFICULTY_CONFIGS[difficulty].totalDuration,
      collectedLetters: [],
    }

    const applyDifficulty = (nextDifficulty: Difficulty) => {
      const config = DIFFICULTY_CONFIGS[nextDifficulty]
      runtime.difficulty = nextDifficulty
      runtime.cemeteryStart = config.cemeteryStart
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
        if (runtime.biome === 'cemetery') {
          const cemeteryHazards: HazardType[] = ['tombstone', 'ghost_wisp', 'raven']
          entity.hazardType = cemeteryHazards[Math.floor(Math.random() * cemeteryHazards.length)]
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
      if (runtime.biome === 'cemetery') {
        drawBat(playerView, 58 * runtime.metrics.unit, flapPhase)
      } else {
        drawKite(playerView, 64 * runtime.metrics.unit)
      }
    }

    const applyBiome = (next: BiomeId, announce: boolean) => {
      runtime.biome = next
      if (announce) message(`${biomeAt(runtime.elapsed, runtime.difficulty).label.replace(/^..\s/, '')}!`, 2000)
      drawBackdrop(backdrop, runtime.metrics, next)
      updatePlayerGraphic()
      for (const particle of particles) {
        particle.tint =
          next === 'spring' ? 0x81c784 : next === 'winter' ? 0xffffff : 0xab47bc
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
        stopCemeteryMusic()
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
      stopCemeteryMusic()
      setGatesOpen(false)
      setEnterReady(false)
      setEndingPhase('none')
      runtime.state = 'playing'
      runtime.elapsed = 0
      runtime.lives = 3
      runtime.biome = 'spring'
      runtime.hasReachedCheckpoint = false
      runtime.cemeteryStageStarted = false
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
      runtime.cemeteryEventTriggered = false
      runtime.message = 'Wiosenny wiatr 🌸'
      runtime.messageEndsAt = 1300
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

    const resetToCheckpoint = () => {
      applyDifficulty(difficultyRef.current)
      recycleAll()
      setGatesOpen(true)
      setEnterReady(true)
      setEndingPhase('none')
      runtime.state = 'playing'
      runtime.elapsed = runtime.cemeteryStart
      runtime.lives = 3
      runtime.biome = 'cemetery'
      runtime.hasReachedCheckpoint = true
      runtime.cemeteryStageStarted = true
      runtime.nextLetterAt = runtime.cemeteryStart + 1600
      runtime.nextHazardAt = runtime.cemeteryStart + 1400
      runtime.nextHeartAt = Infinity
      runtime.eventEndsAt = 0
      runtime.eventWind = 0
      runtime.eventLift = 0
      runtime.freezeUntil = 0
      runtime.eventBanner = null
      runtime.postFreezeAction = null
      runtime.cemeteryEventTriggered = false

      runtime.player = {
        x: runtime.metrics.width / 2,
        y: runtime.metrics.height * 0.32,
        vx: 0,
        vy: -90 * runtime.metrics.yScale,
        invulnerableUntil: runtime.cemeteryStart + 800,
      }
      applyBiome('cemetery', false)
      startCemeteryMusic()
      message('Mroczny Cmentarz! 🪦', 1500)
      syncHud(true)
    }

    const resumeFromCheckpoint = () => {
      if (runtime.state !== 'checkpoint') return
      runtime.state = 'playing'
      runtime.player.vy = -180 * runtime.metrics.yScale
      startCemeteryMusic()
      message('Cmentarz wita nowego gościa... 🪦🦇', 1500)
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
      const gravity = runtime.biome === 'winter' ? 1.12 : runtime.biome === 'cemetery' ? 0.98 : 0.94
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

      flapPhase += (delta / 1000) * 8.5
      if (runtime.biome === 'cemetery') {
        drawBat(playerView, 58 * runtime.metrics.unit, flapPhase)
      }

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

      // Checkpoint trigger: Reaching Cemetery (stage 3) with Gothic Gate opening animation!
      if (runtime.elapsed >= runtime.cemeteryStart && !runtime.cemeteryStageStarted) {
        runtime.elapsed = runtime.cemeteryStart
        runtime.cemeteryStageStarted = true
        runtime.hasReachedCheckpoint = true
        runtime.state = 'checkpoint'
        runtime.lives = 3
        runtime.nextLetterAt = runtime.cemeteryStart + 1800
        runtime.nextHazardAt = runtime.cemeteryStart + 1400
        runtime.nextHeartAt = Infinity
        recycleAll()
        applyBiome('cemetery', false)
        runtime.player.x = runtime.metrics.width / 2
        runtime.player.y = runtime.metrics.height * 0.32
        runtime.player.vx = 0
        runtime.player.vy = 0
        setGatesOpen(false)
        setEnterReady(false)
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
          subtitle: 'Ciepły wiatr znosi latawiec w bok!',
          type: 'gust',
        }
        runtime.freezeUntil = runtime.elapsed + 2600
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
        runtime.freezeUntil = runtime.elapsed + 2600
        runtime.postFreezeAction = () => {
          const dir = Math.random() < 0.5 ? -1 : 1
          runtime.eventWind = dir * 150 * runtime.metrics.xScale * DIFFICULTY_CONFIGS[runtime.difficulty].eventWindMultiplier
          runtime.eventEndsAt = runtime.elapsed + 3800 * DIFFICULTY_CONFIGS[runtime.difficulty].eventDurationMultiplier
        }
        syncHud(true)
        return
      }

      // Event 3: Cemetery mist (~62s)
      if (!runtime.cemeteryEventTriggered && runtime.elapsed >= 62000 && runtime.elapsed < 76000) {
        runtime.cemeteryEventTriggered = true
        runtime.eventBanner = {
          title: '🪦 CMENTARNA MGŁA! 🪦',
          subtitle: 'Gęsty opar i upiorny wiatr – uważaj na nagrobki i kruki!',
          type: 'cemetery_fog',
        }
        runtime.freezeUntil = runtime.elapsed + 2600
        runtime.postFreezeAction = () => {
          runtime.eventWind = -140 * runtime.metrics.xScale * DIFFICULTY_CONFIGS[runtime.difficulty].eventWindMultiplier
          runtime.eventEndsAt = runtime.elapsed + 4000 * DIFFICULTY_CONFIGS[runtime.difficulty].eventDurationMultiplier
        }
        syncHud(true)
        return
      }

      // Spawn hazards
      if (runtime.elapsed >= runtime.nextHazardAt) {
        spawn('hazard')
        const base = runtime.biome === 'winter' ? 1050 : runtime.biome === 'cemetery' ? 1150 : 1350
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
      if (runtime.biome === 'cemetery') {
        playBatFlap()
      }
    }

    const handlePointer = (x: number) => {
      if (runtime.state === 'checkpoint') return
      if (runtime.state === 'ready' || runtime.state === 'gameover') {
        if (runtime.hasReachedCheckpoint && runtime.state === 'gameover') {
          resetToCheckpoint()
        } else {
          reset()
        }
        return
      }
      steer(x < runtime.metrics.width / 2 ? -1 : 1)
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        controlsRef.current?.pause()
        return
      }
      if (![' ', 'ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', 'Enter'].includes(event.key)) return
      event.preventDefault()

      if (runtime.state === 'checkpoint') return

      if (runtime.state === 'ready' || runtime.state === 'gameover') {
        if (runtime.hasReachedCheckpoint && runtime.state === 'gameover') {
          resetToCheckpoint()
        } else {
          reset()
        }
        return
      }
      if (runtime.state !== 'playing' || runtime.freezeUntil > runtime.elapsed) return
      runtime.player.vy = -330 * runtime.metrics.yScale
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        runtime.player.vx -= 155 * runtime.metrics.xScale
        if (runtime.biome === 'cemetery') playBatFlap()
      }
      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        runtime.player.vx += 155 * runtime.metrics.xScale
        if (runtime.biome === 'cemetery') playBatFlap()
      }
    }

    controlsRef.current = {
      start: reset,
      startCheckpoint: resetToCheckpoint,
      resumeCheckpoint: resumeFromCheckpoint,
      pause: () => {
        if (runtime.state === 'playing') runtime.state = 'paused'
        else if (runtime.state === 'paused') runtime.state = 'playing'
        syncHud(true)
      },
      steer,
    }

    const init = async () => {
      try {
        const nextApp = new Application()
        await nextApp.init({
          resizeTo: host,
          preference: 'webgl',
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          sharedTicker: false,
          backgroundAlpha: 1,
          eventFeatures: { move: false, globalMove: false, click: true, wheel: false },
        })
        if (disposed) {
          nextApp.destroy({ removeView: true, releaseGlobalResources: true }, { children: true, texture: true, textureSource: true })
          return
        }

        app = nextApp
        app.canvas.classList.add('veil-pixi-canvas')
        host.appendChild(app.canvas)
        app.stage.addChild(backdrop, particleLayer, itemLayer, hazardLayer, playerLayer)
        playerLayer.addChild(playerView)
        app.stage.eventMode = 'static'
        app.stage.interactiveChildren = false
        app.stage.on('pointerdown', (event: any) => handlePointer(event.global.x))

        for (let index = 0; index < 20; index += 1) {
          const particle = new Graphics().circle(0, 0, 1.5 + (index % 3)).fill({ color: 0x81c784, alpha: 0.35 })
          particle.position.set((index * 47) % runtime.metrics.width, (index * 83) % runtime.metrics.height)
          particles.push(particle)
          particleLayer.addChild(particle)
        }

        layout()
        tickerUpdate = tick
        app.ticker.add(tickerUpdate)
        resizeObserver = new ResizeObserver(() => {
          app?.resize()
          layout()
        })
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
      stopCemeteryMusic()
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

  // Split tiles for word 1 (0..5) and word 2 (6..11)
  const word1Tiles = endingTiles.slice(0, 6)
  const word2Tiles = endingTiles.slice(6, 12)

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
        <span className="game-goal-icon">🪦</span>
      </div>

      {/* Scrambled collected letters shelf around the top/border of the playfield */}
      <div className="game-letters-shelf" aria-label="Zebrane litery w locie">
        <span className="letters-shelf-title">Zebrane litery:</span>
        <div className="letters-shelf-chips">
          {collectedLetters.length === 0 ? (
            <span className="shelf-empty-hint">Łap spadające runy z literami!</span>
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

        {/* Initial Ready Overlay */}
        {gameState === 'ready' && !error && (
          <div className="game-overlay">
            <div className="game-modal-card">
              <div className="kite-avatar-icon">🪁</div>
              <h3 className="modal-heading">Utrzymaj lot i odkryj hasło!</h3>
              <p className="modal-text">
                Steruj za pomocą strzałek lub dotykając lewej/prawej strony ekranu.
                Omijaj przeszkody i zbieraj litery tajemniczego hasła!
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

              <button type="button" className="game-primary-btn" onClick={startGame}>
                Rozpocznij lot 🪁
              </button>
            </div>
          </div>
        )}

        {/* 3D Cemetery Gate Transition to Stage 3 */}
        {gameState === 'checkpoint' && (
          <div className="game-overlay cemetery-gate-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="door-cinematic-card cemetery-cinematic-card">
              <span className="checkpoint-badge cemetery-badge">Checkpoint • Brama Cmentarza 🪦</span>

              <div className="cemetery-gate-stage">
                <div className={`cemetery-mist-interior ${gatesOpen ? 'active' : ''}`}>
                  <div className="mist-fog-cloud fog-1" />
                  <div className="mist-fog-cloud fog-2" />
                  <div className="cemetery-full-moon-mini" />
                  <div className="flying-bats-swarm">
                    <span className="fbs b1">🦇</span>
                    <span className="fbs b2">🦇</span>
                    <span className="fbs b3">🦇</span>
                  </div>
                  {gatesOpen && <div className="flying-player-bat">🦇</div>}
                </div>

                <div className="cemetery-gate-frame">
                  <div className="gate-pillar pillar-left">
                    <div className="pillar-spire" />
                  </div>
                  <div className={`cemetery-gate-wing gate-left-wing ${gatesOpen ? 'opened' : ''}`}>
                    <div className="iron-bars" />
                    <div className="iron-cross-crest" />
                  </div>
                  <div className={`cemetery-gate-wing gate-right-wing ${gatesOpen ? 'opened' : ''}`}>
                    <div className="iron-bars" />
                    <div className="iron-cross-crest" />
                  </div>
                  <div className="gate-pillar pillar-right">
                    <div className="pillar-spire" />
                  </div>
                </div>
              </div>

              {!gatesOpen ? (
                <>
                  <h3 className="modal-heading door-title cemetery-title">
                    Brama Zapomnianego Cmentarza... 🪦
                  </h3>
                  <p className="modal-text">
                    Zimowy mróz ustąpił przed gęstą mgłą. Co czeka za starymi żelaznymi kratami?
                  </p>
                  <button
                    type="button"
                    className="game-primary-btn cemetery-action-btn"
                    onClick={handleOpenGates}
                  >
                    Otwórz bramę 🗝️
                  </button>
                </>
              ) : (
                <>
                  <h3 className="modal-heading door-title cemetery-welcome-title">
                    Transformacja w Nietoperza! 🦇
                  </h3>
                  <p className="modal-text">
                    Życia odnowione! Zmień postać w nietoperza, unikaj nagrobków, upiornych ogników i zbierz ostatnie litery!
                  </p>
                  <button
                    type="button"
                    className="game-primary-btn cemetery-action-btn cemetery-enter-btn"
                    disabled={!enterReady}
                    onClick={resumeCheckpoint}
                  >
                    Wlatujemy! 🦇
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="game-overlay">
            <div className="game-modal-card">
              <h3 className="modal-heading">Pauza</h3>
              <p className="modal-text">Złap oddech i przygotuj się na kolejny etap.</p>
              <button type="button" className="game-primary-btn" onClick={togglePause}>
                Wznów
              </button>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="game-overlay">
            <div className="game-modal-card">
              <h3 className="modal-heading">Koniec lotu!</h3>
              <p className="modal-text">
                {hasCheckpoint
                  ? 'Możesz wznowić grę bezpośrednio od Bramy Cmentarza.'
                  : 'Złap serduszko po zderzeniu i leć dalej.'}
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

              {hasCheckpoint ? (
                <div className="modal-actions-column">
                  <button type="button" className="game-primary-btn" onClick={restartFromCheckpoint}>
                    Wróć na cmentarz 🪦🦇
                  </button>
                  <button type="button" className="game-subtle-btn" onClick={startGame}>
                    Od samego początku 🌸
                  </button>
                </div>
              ) : (
                <button type="button" className="game-primary-btn" onClick={startGame}>
                  Zagraj ponownie 🪁
                </button>
              )}
            </div>
          </div>
        )}

        {/* Finałowa sekwencja: Animacja Kosy + "Koniec upiorności" + "Twój wynik" + Zmiana miejsc liter */}
        {gameState === 'ending' && endingPhase !== 'none' && (
          <div className="game-overlay scythe-ending-overlay" onClick={(e) => e.stopPropagation()}>
            {/* Scythe Slash Layer - Slower & Visible with "Koniec upiorności" */}
            {endingPhase === 'scythe' && (
              <div className="scythe-cinematic-stage">
                <div className="scythe-koniec-title">Koniec upiorności</div>
                <div className="scythe-slash-fx">
                  <div className="scythe-blade-visual">
                    <svg viewBox="0 0 200 200" className="scythe-svg">
                      <path
                        d="M 30 180 Q 80 100 160 30"
                        stroke="#4e342e"
                        strokeWidth="9"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <circle cx="160" cy="30" r="7" fill="#b0bec5" stroke="#37474f" strokeWidth="2" />
                      <path
                        d="M 160 30 C 145 5, 80 10, 30 65 C 75 52, 130 42, 160 30 Z"
                        fill="url(#scytheBladeGrad)"
                        stroke="#eceff1"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                      />
                      <defs>
                        <linearGradient id="scytheBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="45%" stopColor="#cfd8dc" />
                          <stop offset="100%" stopColor="#546e7a" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="scythe-slash-line" />
                </div>
              </div>
            )}

            {/* Revealed Result Screen: ONLY "Twój wynik" and the 12 slots */}
            {endingPhase !== 'scythe' && (
              <div className="phrase-reveal-card">
                <h2 className="twoj-wynik-title">Twój wynik</h2>

                <div className="phrase-reveal-container">
                  {/* Word 1: Slots 0..5 */}
                  <div className="phrase-word word-1">
                    {word1Tiles.map((tile, idx) => {
                      const isSwapping = activeSwappingIds.includes(tile.id)
                      const isVisible =
                        tile.isCollected ||
                        endingPhase === 'dropped_grayout' ||
                        endingPhase === 'swapping' ||
                        endingPhase === 'solved'

                      return (
                        <div key={`w1-slot-${idx}`} className="letter-slot">
                          {isVisible && (
                            <span
                              className={`slot-letter ${
                                tile.isCollected ? 'letter-collected' : 'letter-grayout'
                              } ${isSwapping ? 'is-swapping' : ''}`}
                            >
                              {tile.char}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="phrase-word-gap" />

                  {/* Word 2: Slots 6..11 */}
                  <div className="phrase-word word-2">
                    {word2Tiles.map((tile, idx) => {
                      const isSwapping = activeSwappingIds.includes(tile.id)
                      const isVisible =
                        tile.isCollected ||
                        endingPhase === 'dropped_grayout' ||
                        endingPhase === 'swapping' ||
                        endingPhase === 'solved'

                      return (
                        <div key={`w2-slot-${idx}`} className="letter-slot">
                          {isVisible && (
                            <span
                              className={`slot-letter ${
                                tile.isCollected ? 'letter-collected' : 'letter-grayout'
                              } ${isSwapping ? 'is-swapping' : ''}`}
                            >
                              {tile.char}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {endingPhase === 'solved' && (
                  <div className="phrase-complete-footer">
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
