import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics, Rectangle, Sprite, Texture, Assets, type Ticker } from 'pixi.js'

export type PicnicItemKey =
  | 'grapes'
  | 'lays_orange'
  | 'blueberries'
  | 'garage_beer'
  | 'cookies'
  | 'strawberry_cake'
  | 'rose'

export type PicnicItem = {
  id: PicnicItemKey
  name: string
  emoji: string
}

export const PICNIC_ITEMS: readonly PicnicItem[] = [
  { id: 'grapes', name: 'Winogrono', emoji: '🍇' },
  { id: 'lays_orange', name: 'Laysy pomarańczowe', emoji: '🥔' },
  { id: 'blueberries', name: 'Parę borówek', emoji: '🫐' },
  { id: 'garage_beer', name: 'Piwo Garage', emoji: '🍺' },
  { id: 'cookies', name: 'Ciastka', emoji: '🍪' },
  { id: 'strawberry_cake', name: 'Tort z truskawkami', emoji: '🍰' },
  { id: 'rose', name: 'Róża', emoji: '🌹' },
] as const

export const PICNIC_ASSETS: Record<PicnicItemKey, string> = {
  grapes: '/picnic/grapes.jpg',
  lays_orange: '/lays.png',
  blueberries: '/picnic/blueberries.jpg',
  garage_beer: '/garage.png',
  cookies: '/picnic/cookies.jpg',
  strawberry_cake: '/picnic/strawberry_cake.png',
  rose: '/picnic/rose.png',
}


export type VeilGameResult = {
  pearls: number
  picnicItems: PicnicItemKey[]
}

type EventBanner = {
  title: string
  subtitle: string
  type: 'storm' | 'gust' | 'wind_right' | 'rose'
}

type VeilGameProps = { onComplete: (result: VeilGameResult) => void }
type GameState = 'ready' | 'playing' | 'checkpoint' | 'paused' | 'gameover' | 'victory'
type BiomeId = 'autumn' | 'winter' | 'spring'
type EntityKind = 'hazard' | 'pearl' | 'heart' | 'picnic'
type Metrics = { width: number; height: number; xScale: number; yScale: number; unit: number }
type Entity = {
  view: Container
  graphics: Graphics
  sprite: Sprite
  kind: EntityKind
  picnicKey?: PicnicItemKey
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
  pearls: number
  biome: BiomeId
  player: { x: number; y: number; vx: number; vy: number; invulnerableUntil: number }
  metrics: Metrics
  nextHazardAt: number
  nextPearlAt: number
  nextHeartAt: number
  eventEndsAt: number
  eventWind: number
  eventLift: number
  message: string | null
  messageEndsAt: number
  lastHudAt: number
  hasReachedCheckpoint: boolean
  stage3Started: boolean
  picnicQueue: { key: PicnicItemKey; spawnAt: number }[]
  collectedPicnicItems: PicnicItemKey[]
  freezeUntil: number
  eventBanner: EventBanner | null
  postFreezeAction: (() => void) | null
  autumnEventTriggered: boolean
  winterEventTriggered: boolean
  springWindTriggered: boolean
  difficulty: Difficulty
  springStart: number
  totalDuration: number
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export type DifficultyConfig = {
  label: string
  emoji: string
  description: string
  springStart: number
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
    springStart: 46_000,
    totalDuration: 90_000,
    hazardIntervalMultiplier: 1.0,
    eventWindMultiplier: 1.0,
    eventDurationMultiplier: 1.0,
    sideDamage: false,
  },
  medium: {
    label: 'Średni',
    emoji: '⚡',
    description: 'Ściany boczne ranią! Nieco dłuższe i silniejsze zjawiska pogodowe, ciut więcej przeszkód.',
    springStart: 52_000,
    totalDuration: 104_000,
    hazardIntervalMultiplier: 0.82,
    eventWindMultiplier: 1.25,
    eventDurationMultiplier: 1.2,
    sideDamage: true,
  },
  hard: {
    label: 'Trudny',
    emoji: '🔥',
    description: 'Prawdziwe wyzwanie! Raniące ściany, potężne wichury, gęste przeszkody i dłuższy lot.',
    springStart: 58_000,
    totalDuration: 118_000,
    hazardIntervalMultiplier: 0.68,
    eventWindMultiplier: 1.55,
    eventDurationMultiplier: 1.35,
    sideDamage: true,
  },
}

export const getBiomesForDifficulty = (diff: Difficulty) => {
  const cfg = DIFFICULTY_CONFIGS[diff]
  return [
    { id: 'autumn' as BiomeId, label: '🍂 Jesienny wiatr', until: Math.round(cfg.springStart * 0.48), event: 'Ciepły podmuch' },
    { id: 'winter' as BiomeId, label: '❄️ Zimowy mróz', until: cfg.springStart, event: 'Śnieżyca' },
    { id: 'spring' as BiomeId, label: '🧺 Wiosenny piknik', until: cfg.totalDuration, event: 'Radosny powiew' },
  ] as const
}

const biomeAt = (elapsed: number, diff: Difficulty) => {
  const biomes = getBiomesForDifficulty(diff)
  return biomes.find((biome) => elapsed < biome.until) ?? biomes[biomes.length - 1]
}


const createMetrics = (width: number, height: number): Metrics => ({
  width,
  height,
  xScale: Math.max(width / 340, 0.72),
  yScale: Math.max(height / 520, 0.72),
  unit: Math.max(Math.min(width / 340, height / 520), 0.72),
})

function drawPlayer(view: Graphics, size: number, isBasket: boolean): void {
  view.clear()

  if (isBasket) {
    // In Stage 3, the veil transforms into a charming picnic basket!
    const w = size * 0.44
    const h = size * 0.32

    // Arched woven handle above basket
    view.moveTo(-w * 0.58, -h * 0.2)
      .bezierCurveTo(-w * 0.65, -h * 1.5, w * 0.65, -h * 1.5, w * 0.58, -h * 0.2)
      .stroke({ width: (3.6 * size) / 64, color: 0x795548, cap: 'round' })
    // Handle inner highlight
    view.moveTo(-w * 0.5, -h * 0.3)
      .bezierCurveTo(-w * 0.55, -h * 1.35, w * 0.55, -h * 1.35, w * 0.5, -h * 0.3)
      .stroke({ width: (1.4 * size) / 64, color: 0xa1887f, cap: 'round' })
    // Cute pink bow on top of handle
    view.ellipse(0, -h * 1.25, (5 * size) / 64, (2.6 * size) / 64).fill(0xe91e63)
    view.circle(0, -h * 1.25, (2.2 * size) / 64).fill(0xff80ab)

    // Red & white cloth lining peaking out
    view.poly([
      -w * 0.75, -h * 0.22,
      -w * 0.45, -h * 0.05,
      -w * 0.15, -h * 0.28,
      w * 0.15, -h * 0.05,
      w * 0.5, -h * 0.26,
      w * 0.75, -h * 0.18,
      w * 0.7, 0,
      -w * 0.7, 0,
    ], true).fill(0xffcdd2)

    // Checkered dots on cloth
    view.circle(-w * 0.4, -h * 0.12, (2.5 * size) / 64).fill(0xe53935)
    view.circle(0, -h * 0.14, (2.5 * size) / 64).fill(0xe53935)
    view.circle(w * 0.4, -h * 0.12, (2.5 * size) / 64).fill(0xe53935)

    // Main basket body (woven wicker tub)
    view.poly([
      -w * 0.85, -h * 0.1,
      w * 0.85, -h * 0.1,
      w * 0.65, h * 0.85,
      -w * 0.65, h * 0.85,
    ], true).fill(0xc48247)
      .stroke({ width: (2 * size) / 64, color: 0x8d532b, join: 'round' })

    // Horizontal wicker ribs
    view.roundRect(-w * 0.88, -h * 0.15, w * 1.76, h * 0.18, (3 * size) / 64)
      .fill(0xb26b34)
      .stroke({ width: (1.5 * size) / 64, color: 0x79401b })
    view.roundRect(-w * 0.74, h * 0.32, w * 1.48, h * 0.15, (2 * size) / 64)
      .fill(0xb26b34)
      .stroke({ width: (1.2 * size) / 64, color: 0x79401b })

    // Woven cross-diagonal weave lines
    for (let i = -2; i <= 2; i++) {
      view.moveTo(i * (w * 0.3) - w * 0.18, 0)
        .lineTo(i * (w * 0.3) + w * 0.18, h * 0.8)
        .stroke({ width: (1.3 * size) / 64, color: 0x935223 })
      view.moveTo(i * (w * 0.3) + w * 0.18, 0)
        .lineTo(i * (w * 0.3) - w * 0.18, h * 0.8)
        .stroke({ width: (1.3 * size) / 64, color: 0x935223 })
    }
    return
  }

  // Flying wedding veil (Stages 1 & 2)
  view.moveTo(-size * 0.17, -size * 0.32)
    .quadraticCurveTo(0, -size * 0.38, size * 0.17, -size * 0.32)
    .bezierCurveTo(size * 0.24, -size * 0.04, size * 0.46, size * 0.2, size * 0.34, size * 0.54)
    .quadraticCurveTo(size * 0.27, size * 0.68, size * 0.15, size * 0.57)
    .quadraticCurveTo(size * 0.05, size * 0.73, -size * 0.05, size * 0.58)
    .quadraticCurveTo(-size * 0.2, size * 0.7, -size * 0.31, size * 0.52)
    .bezierCurveTo(-size * 0.45, size * 0.17, -size * 0.24, -size * 0.06, -size * 0.17, -size * 0.32)
    .closePath()
    .fill({ color: 0xffffff, alpha: 0.82 })
    .stroke({ width: (1.3 * size) / 64, color: 0xe9a5c0, alpha: 0.9, join: 'round' })
  view.moveTo(-size * 0.1, -size * 0.26)
    .bezierCurveTo(-size * 0.24, size * 0.04, -size * 0.15, size * 0.31, -size * 0.16, size * 0.56)
    .stroke({ width: (1.2 * size) / 64, color: 0xf6d4e3, alpha: 0.9 })
  view.moveTo(size * 0.08, -size * 0.25)
    .bezierCurveTo(size * 0.25, size * 0.03, size * 0.19, size * 0.28, size * 0.17, size * 0.55)
    .stroke({ width: (1.2 * size) / 64, color: 0xf6d4e3, alpha: 0.9 })
  view.roundRect(-size * 0.2, -size * 0.39, size * 0.4, size * 0.075, size * 0.035).fill(0xd879a3)
  view.circle(-size * 0.09, -size * 0.355, size * 0.015).fill(0xffffff)
  view.circle(0, -size * 0.355, size * 0.015).fill(0xffffff)
  view.circle(size * 0.09, -size * 0.355, size * 0.015).fill(0xffffff)
}

function drawEntity(entity: Entity, biome: BiomeId, unit: number): void {
  const { graphics, sprite } = entity
  graphics.clear()

  if (entity.kind === 'pearl') {
    sprite.visible = false
    entity.radius = 11 * unit
    graphics.circle(0, 0, entity.radius).fill(0xfff9f1)
      .circle(entity.radius * 0.27, entity.radius * 0.27, entity.radius * 0.68).fill({ color: 0xf4bad5, alpha: 0.5 })
    graphics.circle(-entity.radius * 0.32, -entity.radius * 0.32, entity.radius * 0.22).fill(0xffffff)
      .circle(0, 0, entity.radius).stroke({ width: 1.4, color: 0xe5a4c1, alpha: 0.85 })
    return
  }

  if (entity.kind === 'heart') {
    sprite.visible = false
    entity.radius = 15 * unit
    const r = entity.radius
    graphics.circle(-r * 0.45, -r * 0.2, r * 0.55).fill(0xef476f)
      .circle(r * 0.45, -r * 0.2, r * 0.55).fill(0xef476f)
      .poly([-r, 0, r, 0, 0, r * 1.2], true).fill(0xef476f)
    graphics.circle(-r * 0.35, -r * 0.38, r * 0.16).fill({ color: 0xffffff, alpha: 0.72 })
    return
  }

  if (entity.kind === 'picnic') {
    entity.radius = 20 * unit
    const r = entity.radius

    if (entity.picnicKey) {
      try {
        const tex = Texture.from(PICNIC_ASSETS[entity.picnicKey])
        sprite.texture = tex
        sprite.anchor.set(0.5)
        sprite.visible = true

        if (entity.picnicKey === 'rose') {
          // Transparent cut-out rose
          sprite.width = 44 * unit
          sprite.height = 44 * unit
          // Subtle glow
          graphics.circle(0, 0, r * 1.1).fill({ color: 0xffcdd2, alpha: 0.25 })
        } else if (entity.picnicKey === 'strawberry_cake') {
          // Transparent cut-out cake
          sprite.width = 42 * unit
          sprite.height = 42 * unit
          graphics.circle(0, 0, r * 1.05).fill({ color: 0xfff9c4, alpha: 0.3 })
        } else if (entity.picnicKey === 'lays_orange') {
          // Transparent cut-out of Lay's MAX Karbowane Paprika bag
          sprite.width = 38 * unit
          sprite.height = 42 * unit
          graphics.circle(0, 0, r * 1.05).fill({ color: 0xffe0b2, alpha: 0.25 })
        } else if (entity.picnicKey === 'garage_beer') {
          // Transparent cut-out of Hardmade / Garage bottle
          sprite.width = 24 * unit
          sprite.height = 48 * unit
          graphics.circle(0, 0, r * 1.05).fill({ color: 0xf8bbd0, alpha: 0.25 })
        } else {
          // Real photo inside a glossy golden round medallion badge!
          graphics.circle(0, 0, r + 2)
            .fill(0xffffff)
            .stroke({ width: 2.2, color: 0xffa726, alpha: 0.95 })
          sprite.width = r * 1.7
          sprite.height = r * 1.7
        }
      } catch {
        sprite.visible = false
      }
    }
    return
  }

  // Hazard handling
  sprite.visible = false
  if (biome === 'spring') {
    // Falling twig / branch obstacle ("gałązka")
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
  } else if (biome === 'winter') {
    entity.radius = 19 * unit
    const r = entity.radius
    graphics.poly([-r, -r * 0.65, r, -r * 0.65, r * 0.55, r, -r * 0.7, r], true).fill(0xc7e8f3)
      .poly([-r * 0.45, -r * 0.55, r * 0.45, -r * 0.55, 0, r * 0.55], true).fill(0xeffcff)
    graphics.poly([-r, -r * 0.65, r, -r * 0.65, r * 0.55, r, -r * 0.7, r], true).stroke({ width: 1.5, color: 0x6d95b8 })
  } else {
    entity.radius = 17 * unit
    const r = entity.radius
    graphics.circle(0, 0, r).fill(0x9a6139).arc(0, 0, r * 0.62, Math.PI, Math.PI * 2).stroke({ width: 2, color: 0xf6c27c, alpha: 0.8 })
    graphics.moveTo(0, -r).lineTo(r * 0.45, -r * 1.4).stroke({ width: 2, color: 0x5c8f61 })
  }
}

function drawBackdrop(view: Graphics, metrics: Metrics, biome: BiomeId): void {
  const palette =
    biome === 'autumn'
      ? [0xfffbf5, 0xfceddc, 0xf6b27f]
      : biome === 'winter'
        ? [0xf4fafd, 0xe3f2fd, 0x9ec5e5]
        : [0xf7fff1, 0xe5f7d5, 0x9fd596]
  view.clear()
    .rect(0, 0, metrics.width, metrics.height * 0.48).fill(palette[0])
    .rect(0, metrics.height * 0.48, metrics.width, metrics.height * 0.52).fill(palette[1])
    .rect(0, metrics.height * 0.82, metrics.width, metrics.height * 0.18).fill({ color: palette[2], alpha: 0.2 })
}

export default function VeilGame({ onComplete }: VeilGameProps) {
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
  const [pearls, setPearls] = useState(0)
  const [picnicCount, setPicnicCount] = useState(0)
  const [hasCheckpoint, setHasCheckpoint] = useState(false)
  const [checkpointReady, setCheckpointReady] = useState(false)
  const [biome, setBiome] = useState<BiomeId>('autumn')
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [eventBanner, setEventBanner] = useState<EventBanner | null>(null)
  const [error, setError] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const difficultyRef = useRef<Difficulty>('easy')

  const selectDifficulty = useCallback((nextDifficulty: Difficulty) => {
    difficultyRef.current = nextDifficulty
    setDifficulty(nextDifficulty)
  }, [])

  const startGame = useCallback(() => controlsRef.current?.start(), [])
  const restartFromCheckpoint = useCallback(() => controlsRef.current?.startCheckpoint(), [])
  const resumeCheckpoint = useCallback(() => controlsRef.current?.resumeCheckpoint(), [])
  const togglePause = useCallback(() => controlsRef.current?.pause(), [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let app: Application | null = null
    let finishTimer: number | null = null
    let resizeObserver: ResizeObserver | null = null
    let tickerUpdate: ((ticker: Ticker) => void) | null = null

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
      pearls: 0,
      biome: 'autumn',
      player: { x: 170, y: 110, vx: 0, vy: 0, invulnerableUntil: 0 },
      metrics: createMetrics(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1)),
      nextHazardAt: 1200,
      nextPearlAt: 2600,
      nextHeartAt: Infinity,
      eventEndsAt: 0,
      eventWind: 0,
      eventLift: 0,
      message: null,
      messageEndsAt: 0,
      lastHudAt: 0,
      hasReachedCheckpoint: false,
      stage3Started: false,
      picnicQueue: [],
      collectedPicnicItems: [],
      freezeUntil: 0,
      eventBanner: null,
      postFreezeAction: null,
      autumnEventTriggered: false,
      winterEventTriggered: false,
      springWindTriggered: false,
      difficulty,
      springStart: DIFFICULTY_CONFIGS[difficulty].springStart,
      totalDuration: DIFFICULTY_CONFIGS[difficulty].totalDuration,
    }

    const applyDifficulty = (nextDifficulty: Difficulty) => {
      const config = DIFFICULTY_CONFIGS[nextDifficulty]
      runtime.difficulty = nextDifficulty
      runtime.springStart = config.springStart
      runtime.totalDuration = config.totalDuration
    }

    const syncHud = (force = false) => {
      if (!force && runtime.elapsed - runtime.lastHudAt < 120) return
      runtime.lastHudAt = runtime.elapsed
      setLives(runtime.lives)
      setPearls(runtime.pearls)
      setPicnicCount(runtime.collectedPicnicItems.length)
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
        container.addChild(graphics, sprite)
        entity = {
          view: container,
          graphics,
          sprite,
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
      entity.picnicKey = undefined
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
      entity.spin = (Math.random() - 0.5) * (kind === 'hazard' ? 1.4 : 2.2)
      drawEntity(entity, runtime.biome, m.unit)
    }

    const spawnPicnic = (key: PicnicItemKey) => {
      const m = runtime.metrics
      const entity = acquire('picnic')
      entity.picnicKey = key
      entity.x = 35 * m.xScale + Math.random() * Math.max(1, m.width - 70 * m.xScale)
      entity.y = -44 * m.yScale
      if (key === 'rose') {
        entity.vx = (Math.random() < 0.5 ? -1 : 1) * 110 * m.xScale
        entity.vy = 68 * m.yScale
        entity.spin = 1.6
      } else {
        entity.vx = (Math.random() - 0.5) * 22 * m.xScale
        entity.vy = 120 * m.yScale
        entity.spin = (Math.random() - 0.5) * 1.1
      }
      drawEntity(entity, runtime.biome, m.unit)
    }

    const message = (next: string, duration: number) => {
      runtime.message = next
      runtime.messageEndsAt = runtime.elapsed + duration
      syncHud(true)
    }

    const updatePlayerGraphic = () => {
      drawPlayer(playerView, 64 * runtime.metrics.unit, runtime.biome === 'spring')
    }

    const applyBiome = (next: BiomeId, announce: boolean) => {
      runtime.biome = next
      if (announce) message(`${biomeAt(runtime.elapsed, runtime.difficulty).label.replace(/^..\s/, '')}!`, 2000)
      drawBackdrop(backdrop, runtime.metrics, next)
      updatePlayerGraphic()
      for (const particle of particles) {
        particle.tint = next === 'autumn' ? 0xd17b52 : next === 'winter' ? 0xffffff : 0x81c784
      }
    }

    const damage = () => {
      if (runtime.elapsed < runtime.player.invulnerableUntil || runtime.state !== 'playing') return
      runtime.lives -= 1
      runtime.player.invulnerableUntil = runtime.elapsed + 850
      runtime.player.vy = -210 * runtime.metrics.yScale
      runtime.nextHeartAt = runtime.lives > 0 ? runtime.elapsed + 4500 : Infinity
      message('Uważaj! ♥', 950)
      if (runtime.lives <= 0) runtime.state = 'gameover'
      syncHud(true)
    }

    const finish = () => {
      if (runtime.state !== 'playing') return
      runtime.state = 'victory'
      runtime.message = null
      syncHud(true)
      finishTimer = window.setTimeout(() => {
        onCompleteRef.current({
          pearls: runtime.pearls,
          picnicItems: [...runtime.collectedPicnicItems],
        })
      }, 900)
    }

    const reset = () => {
      applyDifficulty(difficultyRef.current)
      recycleAll()
      runtime.state = 'playing'
      runtime.elapsed = 0
      runtime.lives = 3
      runtime.pearls = 0
      runtime.biome = 'autumn'
      runtime.hasReachedCheckpoint = false
      runtime.stage3Started = false
      runtime.collectedPicnicItems = []
      runtime.picnicQueue = []
      runtime.nextHazardAt = 1200
      runtime.nextPearlAt = 2600
      runtime.nextHeartAt = Infinity
      runtime.eventEndsAt = 0
      runtime.eventWind = 0
      runtime.eventLift = 0
      runtime.freezeUntil = 0
      runtime.eventBanner = null
      runtime.postFreezeAction = null
      runtime.autumnEventTriggered = false
      runtime.winterEventTriggered = false
      runtime.springWindTriggered = false
      runtime.message = 'Jesienny wiatr 🍂'
      runtime.messageEndsAt = 1300
      runtime.player = {
        x: runtime.metrics.width / 2,
        y: runtime.metrics.height * 0.27,
        vx: 0,
        vy: -90 * runtime.metrics.yScale,
        invulnerableUntil: 0,
      }
      applyBiome('autumn', false)
      syncHud(true)
    }

    const resetToCheckpoint = () => {
      applyDifficulty(difficultyRef.current)
      recycleAll()
      runtime.state = 'playing'
      runtime.elapsed = runtime.springStart
      runtime.lives = 3
      runtime.biome = 'spring'
      runtime.hasReachedCheckpoint = true
      runtime.stage3Started = true
      runtime.collectedPicnicItems = []
      runtime.nextPearlAt = Infinity
      runtime.nextHazardAt = runtime.springStart + 1500
      runtime.nextHeartAt = Infinity
      runtime.eventEndsAt = 0
      runtime.eventWind = 0
      runtime.eventLift = 0
      runtime.freezeUntil = 0
      runtime.eventBanner = null
      runtime.postFreezeAction = null
      runtime.springWindTriggered = false

      // Reshuffle picnic items queue
      const shuffled = [...PICNIC_ITEMS].map((item) => item.id).sort(() => Math.random() - 0.5)
      runtime.picnicQueue = shuffled.map((key, index) => ({
        key,
        spawnAt: runtime.springStart + 3000 + index * 4500,
      }))

      runtime.player = {
        x: runtime.metrics.width / 2,
        y: runtime.metrics.height * 0.32,
        vx: 0,
        vy: -90 * runtime.metrics.yScale,
        invulnerableUntil: runtime.springStart + 800,
      }
      applyBiome('spring', false)
      message('Łap jedzonko do koszyka! 🧺', 1500)
      syncHud(true)
    }

    const resumeFromCheckpoint = () => {
      if (runtime.state !== 'checkpoint') return
      runtime.state = 'playing'
      runtime.player.vy = -180 * runtime.metrics.yScale
      message('Łap jedzonko do koszyka! 🧺', 1400)
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
      const gravity = runtime.biome === 'winter' ? 1.12 : runtime.biome === 'spring' ? 0.84 : 1
      const damping = runtime.biome === 'winter' ? 0.975 : 0.955
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
      playerLayer.rotation = Math.max(-0.3, Math.min(0.34, player.vy / (1100 * m.yScale)))
      playerLayer.alpha =
        runtime.elapsed < player.invulnerableUntil && Math.floor(runtime.elapsed / 90) % 2 === 0 ? 0.3 : 1
    }

    const moveEntities = (delta: number) => {
      const seconds = delta / 1000
      const next: Entity[] = []
      for (const entity of entities) {
        if (entity.kind === 'picnic' && entity.picnicKey === 'rose') {
          // Playful, tricky bouncy jumping rose!
          const t = runtime.elapsed / 1000
          const wave = Math.sin(t * 4.2) * 135 * runtime.metrics.xScale
          const leap = Math.cos(t * 2.1) * 75 * runtime.metrics.xScale
          entity.x += (entity.vx + wave + leap) * seconds
          entity.y += (entity.vy + Math.sin(t * 6.5) * 45 * runtime.metrics.yScale) * seconds

          // Rebound on walls
          const wallPadding = 26 * runtime.metrics.xScale
          if (entity.x < wallPadding) {
            entity.x = wallPadding
            entity.vx = Math.abs(entity.vx || 90 * runtime.metrics.xScale) + 40 * runtime.metrics.xScale
          } else if (entity.x > runtime.metrics.width - wallPadding) {
            entity.x = runtime.metrics.width - wallPadding
            entity.vx = -Math.abs(entity.vx || 90 * runtime.metrics.xScale) - 40 * runtime.metrics.xScale
          }

          // Playful evasion when basket gets directly underneath
          const dx = entity.x - runtime.player.x
          const dy = runtime.player.y - entity.y
          if (dy > 0 && dy < 95 * runtime.metrics.yScale && Math.abs(dx) < 65 * runtime.metrics.xScale) {
            entity.x += (dx >= 0 ? 1 : -1) * 110 * seconds * runtime.metrics.xScale
          }

          entity.view.position.set(entity.x, entity.y)
          entity.view.rotation = Math.sin(t * 5) * 0.7
        } else {
          entity.x += (entity.vx + runtime.eventWind * (entity.kind === 'hazard' ? 0.22 : 0.08)) * seconds
          entity.y += entity.vy * seconds
          entity.view.position.set(entity.x, entity.y)
          entity.view.rotation += entity.spin * seconds
        }

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
          if (entity.kind === 'pearl') runtime.pearls += 1
          if (entity.kind === 'heart' && runtime.lives < 3) {
            runtime.lives += 1
            runtime.nextHeartAt = runtime.elapsed + 16000
            message('Serduszko odzyskane! ♥', 1000)
          }
          if (entity.kind === 'picnic') {
            if (entity.picnicKey && !runtime.collectedPicnicItems.includes(entity.picnicKey)) {
              runtime.collectedPicnicItems.push(entity.picnicKey)
              const itemMeta = PICNIC_ITEMS.find((i) => i.id === entity.picnicKey)
              if (entity.picnicKey === 'rose') {
                message('Udało się! Złapano Różę! 🌹✨', 2000)
              } else {
                message(`Złapano: ${itemMeta?.name ?? 'Smakołyk'} ${itemMeta?.emoji ?? '🧺'}!`, 1300)
              }
            }
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

      // Handle freeze for events and alerts
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

      // Checkpoint trigger when reaching Spring (stage 3)
      if (runtime.elapsed >= runtime.springStart && !runtime.stage3Started) {
        runtime.elapsed = runtime.springStart
        runtime.stage3Started = true
        runtime.hasReachedCheckpoint = true
        runtime.state = 'checkpoint'
        runtime.lives = 3
        runtime.nextPearlAt = Infinity
        runtime.nextHazardAt = runtime.springStart + 1800
        runtime.nextHeartAt = Infinity
        recycleAll()
        const shuffled = [...PICNIC_ITEMS].map((item) => item.id).sort(() => Math.random() - 0.5)
        runtime.picnicQueue = shuffled.map((key, index) => ({
          key,
          spawnAt: runtime.springStart + 3000 + index * 4500,
        }))
        applyBiome('spring', false)
        runtime.player.x = runtime.metrics.width / 2
        runtime.player.y = runtime.metrics.height * 0.32
        runtime.player.vx = 0
        runtime.player.vy = 0
        syncHud(true)
        // Give 400ms delay before button becomes active to prevent accidental clicks
        setCheckpointReady(false)
        setTimeout(() => setCheckpointReady(true), 400)
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

      // Major Event 1: Autumn Warm Gust with Freeze (at ~9.5s) - 2.8s freeze
      if (!runtime.autumnEventTriggered && runtime.elapsed >= 9500 && runtime.elapsed < 18000) {
        runtime.autumnEventTriggered = true
        runtime.eventBanner = {
          title: '🍂 CIEPŁY PODMUCH! 🍂',
          subtitle: 'Jesienny wiatr znosi welon w bok!',
          type: 'gust',
        }
        runtime.freezeUntil = runtime.elapsed + 2800
        runtime.postFreezeAction = () => {
          const dir = Math.random() < 0.5 ? -1 : 1
          runtime.eventWind = dir * 90 * runtime.metrics.xScale * DIFFICULTY_CONFIGS[runtime.difficulty].eventWindMultiplier
          runtime.eventEndsAt = runtime.elapsed + 3400 * DIFFICULTY_CONFIGS[runtime.difficulty].eventDurationMultiplier
        }
        syncHud(true)
        return
      }

      // Major Event 2: Winter Snow Squall with Freeze (at ~32s) - 2.8s freeze
      if (!runtime.winterEventTriggered && runtime.elapsed >= 32000 && runtime.elapsed < 44000) {
        runtime.winterEventTriggered = true
        runtime.eventBanner = {
          title: '❄️ ŚNIEŻYCA! ❄️',
          subtitle: 'Zimowy wiatr spycha w bok – uważaj na sople!',
          type: 'storm',
        }
        runtime.freezeUntil = runtime.elapsed + 2800
        runtime.postFreezeAction = () => {
          const dir = Math.random() < 0.5 ? -1 : 1
          runtime.eventWind = dir * 155 * runtime.metrics.xScale * DIFFICULTY_CONFIGS[runtime.difficulty].eventWindMultiplier
          runtime.eventEndsAt = runtime.elapsed + 3800 * DIFFICULTY_CONFIGS[runtime.difficulty].eventDurationMultiplier
        }
        syncHud(true)
        return
      }

      // Major Event 3: Spring Strong Wind from Right with Freeze (at ~62s) - 2.8s freeze
      if (!runtime.springWindTriggered && runtime.elapsed >= 62000 && runtime.elapsed < 76000) {
        runtime.springWindTriggered = true
        runtime.eventBanner = {
          title: '💨 MOCNY WIATR Z PRAWEJ! 💨',
          subtitle: 'Wicher spycha w lewo – mocno steruj koszykiem w prawo!',
          type: 'wind_right',
        }
        runtime.freezeUntil = runtime.elapsed + 2800
        runtime.postFreezeAction = () => {
          runtime.eventWind = -175 * runtime.metrics.xScale * DIFFICULTY_CONFIGS[runtime.difficulty].eventWindMultiplier
          runtime.eventEndsAt = runtime.elapsed + 4200 * DIFFICULTY_CONFIGS[runtime.difficulty].eventDurationMultiplier
        }
        syncHud(true)
        return
      }

      // Spawn hazards (twigs in spring, snow in winter, leaf/acorn in autumn)
      if (runtime.elapsed >= runtime.nextHazardAt) {
        spawn('hazard')
        const base = runtime.biome === 'winter' ? 1050 : runtime.biome === 'spring' ? 1300 : 1350
        runtime.nextHazardAt = runtime.elapsed + (base + Math.random() * 500) * DIFFICULTY_CONFIGS[runtime.difficulty].hazardIntervalMultiplier
      }

      // Pearls only spawn before Spring (Autumn & Winter)
      if (runtime.biome !== 'spring' && runtime.elapsed >= runtime.nextPearlAt) {
        spawn('pearl')
        runtime.nextPearlAt = runtime.elapsed + 2650 + Math.random() * 850
      }

      // In Stage 3, spawn picnic items
      if (runtime.stage3Started && runtime.picnicQueue.length > 0) {
        if (runtime.elapsed >= runtime.picnicQueue[0].spawnAt) {
          const nextItem = runtime.picnicQueue.shift()!
          // If it's the Rose, freeze screen for 3.2s and announce!
          if (nextItem.key === 'rose') {
            runtime.eventBanner = {
              title: '🌹 UWAGA! ZŁAP RÓŻĘ! 🌹',
              subtitle: 'Róża ucieka i skacze po ekranie – złap ją do koszyka!',
              type: 'rose',
            }
            runtime.freezeUntil = runtime.elapsed + 3200
            runtime.postFreezeAction = () => {
              spawnPicnic('rose')
            }
            syncHud(true)
            return
          } else {
            spawnPicnic(nextItem.key)
          }
        }
      }

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
    }

    const handlePointer = (x: number) => {
      // If at checkpoint, DO NOT dismiss on canvas click! Only the button dismisses it!
      if (runtime.state === 'checkpoint') {
        return
      }
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

      // If at checkpoint, DO NOT dismiss on arrow keys or space!
      if (runtime.state === 'checkpoint') {
        return
      }

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
      }
      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        runtime.player.vx += 155 * runtime.metrics.xScale
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

        // Preload real picnic item textures
        try {
          await Assets.load(Object.values(PICNIC_ASSETS))
        } catch (loadErr) {
          console.warn('Could not preload some picnic textures:', loadErr)
        }

        app = nextApp
        app.canvas.classList.add('veil-pixi-canvas')
        host.appendChild(app.canvas)
        app.stage.addChild(backdrop, particleLayer, itemLayer, hazardLayer, playerLayer)
        playerLayer.addChild(playerView)
        app.stage.eventMode = 'static'
        app.stage.interactiveChildren = false
        app.stage.on('pointerdown', (event) => handlePointer(event.global.x))

        for (let index = 0; index < 20; index += 1) {
          const particle = new Graphics().circle(0, 0, 1.5 + (index % 3)).fill({ color: 0xd17b52, alpha: 0.28 })
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
      if (finishTimer) window.clearTimeout(finishTimer)
      resizeObserver?.disconnect()
      window.removeEventListener('keydown', handleKey)
      controlsRef.current = null
      if (app) {
        if (tickerUpdate) app.ticker.remove(tickerUpdate)
        app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true, texture: true, textureSource: true })
      }
    }
  }, [])

  const biomes = getBiomesForDifficulty(difficulty)
  const stageLabel = biomes.find((item) => item.id === biome)?.label ?? biomes[0].label

  return (
    <><style>{`
        .game-difficulty-selector {
          width: 100%;
          margin: 14px 0 10px;
        }

        .game-difficulty-title {
          margin: 0 0 8px;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .game-difficulty-options {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
        }

        .game-difficulty-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 42px;
          padding: 8px 6px;
          border: 2px solid rgba(255, 255, 255, 0.25);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          color: inherit;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }

        .game-difficulty-btn:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.14);
        }

        .game-difficulty-btn.selected,
        .game-difficulty-btn[aria-pressed="true"] {
          border-color: #ff7aa8;
          background: linear-gradient(135deg, #ff5f96, #ff8fb8);
          color: #fff;
          box-shadow: 0 0 0 3px rgba(255, 95, 150, 0.18);
        }

        .game-difficulty-emoji {
          font-size: 1rem;
          line-height: 1;
        }

        .game-difficulty-label {
          white-space: nowrap;
        }

        .game-difficulty-selected-description {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 10px;
          padding: 9px 11px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 0.82rem;
          line-height: 1.35;
          text-align: left;
        }

        .game-difficulty-selected-icon {
          flex: 0 0 auto;
          font-size: 1.05rem;
        }

        @media (max-width: 380px) {
          .game-difficulty-options { gap: 6px; }
          .game-difficulty-btn {
            min-height: 40px;
            padding: 7px 4px;
            font-size: 0.74rem;
          }
          .game-difficulty-emoji { display: none; }
        }
      `}</style><div className="veil-game-wrapper">
        <div className="game-top-bar">
          <div className="game-lives" aria-label={`Pozostałe życia: ${lives}`}>
            {Array.from({ length: 3 }).map((_, index) => (
              <span key={index} className={`game-heart ${index < lives ? 'heart-alive' : 'heart-lost'}`}>
                {index < lives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
          <span className="game-stage-pill">{stageLabel}</span>
          <button
            type="button"
            className="game-pause-btn"
            onClick={togglePause}
            disabled={gameState === 'ready' || gameState === 'gameover' || gameState === 'victory' || gameState === 'checkpoint'}
          >
            {gameState === 'paused' ? 'Wznów' : 'Pauza'}
          </button>
        </div>

        <div className="game-progress-wrapper">
          <div className="game-progress-bar">
            <div className="game-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          {biome === 'spring' ? (
            <span className="game-picnic-counter">🧺 {picnicCount}/{PICNIC_ITEMS.length}</span>
          ) : (
            <span className="game-pearl-counter">◌ {pearls}</span>
          )}
          <span className="game-goal-icon">🧺</span>
        </div>

        <div className={`game-arena-container ${biome}`}>
          <div ref={hostRef} className="veil-pixi-host" aria-label="Obszar gry" />
          {toast && <div className="biome-toast">{toast}</div>}

          {/* Dramatic Freeze Alert Banner (Śnieżyca, Mocny wiatr, Róża itp.) with longer read time */}
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
              } }
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
              } }
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

          {gameState === 'ready' && !error && (
            <div className="game-overlay">
              <div className="game-modal-card">
                <h3 className="modal-heading">Utrzymaj welon w locie!</h3>
                <p className="modal-text">
                  Używaj strzałek lub dotykaj lewej/prawej strony ekranu, zbieraj perły i odzyskuj serduszka.
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
                  Rozpocznij grę
                </button>
              </div>
            </div>
          )}

          {/* Protected Checkpoint overlay: ONLY button click continues, with 400ms delay */}
          {gameState === 'checkpoint' && (
            <div className="game-overlay checkpoint-overlay">
              <div className="game-modal-card checkpoint-card" onClick={(e) => e.stopPropagation()}>
                <span className="checkpoint-badge">Checkpoint 🧺</span>
                <h3 className="modal-heading checkpoint-title">
                  Ok, wystarczy tej zabawy z welonem skompletujmy nasz piknik, gotowa?
                </h3>
                <p className="modal-text">
                  Życia odnowione! Twój welon zamienia się w koszyk – łap pyszności i omijaj gałązki.
                </p>
                <button
                  type="button"
                  className="game-primary-btn checkpoint-btn"
                  disabled={!checkpointReady}
                  onClick={resumeCheckpoint}
                >
                  Lecimy! 🧺
                </button>
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
                    ? 'Nie martw się! Możesz wznowić grę od koszyka piknikowego ze świeżymi siłami.'
                    : 'Złap serduszko po zderzeniu i leć dalej ku wiośnie.'}
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

                  <div className="game-difficulty-selected-description" aria-live="polite">
                    <span className="game-difficulty-selected-icon" aria-hidden="true">
                      {DIFFICULTY_CONFIGS[difficulty].emoji}
                    </span>
                    <span>{DIFFICULTY_CONFIGS[difficulty].description}</span>
                  </div>
                </div>

                {hasCheckpoint ? (
                  <div className="modal-actions-column">
                    <button type="button" className="game-primary-btn" onClick={restartFromCheckpoint}>
                      Zacznij od pikniku 🧺
                    </button>
                    <button type="button" className="game-subtle-btn" onClick={startGame}>
                      Od samego początku 🍂
                    </button>
                  </div>
                ) : (
                  <button type="button" className="game-primary-btn" onClick={startGame}>
                    Zagraj ponownie
                  </button>
                )}
              </div>
            </div>
          )}

          {gameState === 'victory' && (
            <div className="game-overlay">
              <div className="game-modal-card victory-card">
                <p className="modal-text">Udało się! Koszyk piknikowy spakowany! 🧺✨</p>
              </div>
            </div>
          )}
        </div>

        <div className="game-steering-hint">
          <span>Tapuj lewo/prawo, aby sterować</span>
          <span>•</span>
          <span>Spacja lub strzałki na klawiaturze</span>
        </div>
      </div></>
  )
}
