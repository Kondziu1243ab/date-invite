import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics, Rectangle, Sprite, type Ticker } from 'pixi.js'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type DifficultyConfig = {
  label: string
  emoji: string
  description: string
  roomStart: number
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
    roomStart: 44_000,
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
    roomStart: 48_000,
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
    roomStart: 54_000,
    totalDuration: 106_000,
    hazardIntervalMultiplier: 0.68,
    eventWindMultiplier: 1.55,
    eventDurationMultiplier: 1.35,
    sideDamage: true,
  },
}

export type BiomeId = 'spring' | 'winter' | 'room'

export const getBiomesForDifficulty = (diff: Difficulty) => {
  const cfg = DIFFICULTY_CONFIGS[diff]
  return [
    { id: 'spring' as BiomeId, label: '🌸 Wiosenny wiatr', until: Math.round(cfg.roomStart * 0.48), event: 'Wiosenny podmuch' },
    { id: 'winter' as BiomeId, label: '❄️ Zimowy mróz', until: cfg.roomStart, event: 'Śnieżyca' },
    { id: 'room' as BiomeId, label: '🍷 Czerwony pokój', until: cfg.totalDuration, event: 'Zamęt w pokoju' },
  ] as const
}

const biomeAt = (elapsed: number, diff: Difficulty) => {
  const biomes = getBiomesForDifficulty(diff)
  return biomes.find((biome) => elapsed < biome.until) ?? biomes[biomes.length - 1]
}

export type VeilGameResult = {
  pearls: number
  triangles: number
  difficulty: Difficulty
  difficultyLabel: string
}

type EventBanner = {
  title: string
  subtitle: string
  type: 'gust' | 'storm' | 'room_chaos'
}

type VeilGameProps = { onComplete: (result: VeilGameResult) => void }
type GameState = 'ready' | 'playing' | 'checkpoint' | 'paused' | 'gameover' | 'victory'
type EntityKind = 'hazard' | 'pearl' | 'triangle' | 'heart'
type HazardType = 'twig' | 'icicle' | 'chair' | 'wine_glass' | 'rose'
type Metrics = { width: number; height: number; xScale: number; yScale: number; unit: number }

type Entity = {
  view: Container
  graphics: Graphics
  sprite: Sprite
  kind: EntityKind
  hazardType?: HazardType
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
  triangles: number
  biome: BiomeId
  player: { x: number; y: number; vx: number; vy: number; invulnerableUntil: number }
  metrics: Metrics
  nextHazardAt: number
  nextPearlAt: number
  nextTriangleAt: number
  nextHeartAt: number
  eventEndsAt: number
  eventWind: number
  eventLift: number
  message: string | null
  messageEndsAt: number
  lastHudAt: number
  hasReachedCheckpoint: boolean
  roomStageStarted: boolean
  freezeUntil: number
  eventBanner: EventBanner | null
  postFreezeAction: (() => void) | null
  springEventTriggered: boolean
  winterEventTriggered: boolean
  roomEventTriggered: boolean
  difficulty: Difficulty
  roomStart: number
  totalDuration: number
}

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

  // Tail ribbon string (graceful waving curves)
  view.moveTo(0, s * 0.52)
    .bezierCurveTo(-s * 0.28, s * 0.82, s * 0.28, s * 1.08, 0, s * 1.38)
    .bezierCurveTo(-s * 0.24, s * 1.64, s * 0.24, s * 1.88, 0, s * 2.15)
    .stroke({ width: (2.2 * size) / 64, color: 0xff80ab, cap: 'round' })

  // Ribbon bows on the tail (kokardki)
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
  // Top-left: vibrant coral rose
  view.poly([top.x, top.y, center.x, center.y, left.x, left.y], true).fill(0xff4081)
  // Top-right: sunny gold
  view.poly([top.x, top.y, right.x, right.y, center.x, center.y], true).fill(0xffd54f)
  // Bottom-left: bright sky cyan
  view.poly([left.x, left.y, center.x, center.y, bottom.x, bottom.y], true).fill(0x00e5ff)
  // Bottom-right: deep magenta pink
  view.poly([center.x, center.y, right.x, right.y, bottom.x, bottom.y], true).fill(0xf50057)

  // Outer kite border
  view.poly([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y], true)
    .stroke({ width: (2.4 * size) / 64, color: 0xffffff, alpha: 0.95, join: 'round' })

  // Wooden frame struts (spine & cross spar)
  view.moveTo(top.x, top.y).lineTo(bottom.x, bottom.y)
    .stroke({ width: (2.2 * size) / 64, color: 0x5d4037, cap: 'round' })
  view.moveTo(left.x, left.y).lineTo(right.x, right.y)
    .stroke({ width: (2.2 * size) / 64, color: 0x5d4037, cap: 'round' })

  // Center knot / ring
  view.circle(center.x, center.y, (3.4 * size) / 64).fill(0xffffff)
    .circle(center.x, center.y, (1.8 * size) / 64).fill(0xe91e63)

  // Sparkle gleam on upper tip
  view.circle(top.x, top.y + s * 0.12, (2.6 * size) / 64).fill({ color: 0xffffff, alpha: 0.65 })
}

function drawEntity(entity: Entity, biome: BiomeId, unit: number): void {
  const { graphics, sprite } = entity
  graphics.clear()
  sprite.visible = false

  if (entity.kind === 'pearl') {
    entity.radius = 11 * unit
    const r = entity.radius
    if (biome === 'winter') {
      // Ice crystal pearl
      graphics.circle(0, 0, r).fill(0xf0faff)
        .circle(r * 0.25, r * 0.25, r * 0.65).fill({ color: 0x81d4fa, alpha: 0.55 })
        .circle(-r * 0.32, -r * 0.32, r * 0.24).fill(0xffffff)
        .circle(0, 0, r).stroke({ width: 1.4, color: 0x4fc3f7, alpha: 0.85 })
    } else {
      // Spring floral dew pearl
      graphics.circle(0, 0, r).fill(0xfff9f1)
        .circle(r * 0.27, r * 0.27, r * 0.68).fill({ color: 0xf4bad5, alpha: 0.5 })
        .circle(-r * 0.32, -r * 0.32, r * 0.22).fill(0xffffff)
        .circle(0, 0, r).stroke({ width: 1.4, color: 0xe5a4c1, alpha: 0.85 })
    }
    return
  }

  if (entity.kind === 'triangle') {
    // Collectible ruby & gold triangle in Red Room
    entity.radius = 14 * unit
    const r = entity.radius
    const p1 = { x: 0, y: -r * 1.15 }
    const p2 = { x: r * 1.02, y: r * 0.65 }
    const p3 = { x: -r * 1.02, y: r * 0.65 }

    // Outer warm aura
    graphics.poly([p1.x * 1.3, p1.y * 1.3, p2.x * 1.3, p2.y * 1.3, p3.x * 1.3, p3.y * 1.3], true)
      .fill({ color: 0xff1744, alpha: 0.22 })

    // Ruby triangle body
    graphics.poly([p1.x, p1.y, p2.x, p2.y, p3.x, p3.y], true)
      .fill(0xff1744)
      .stroke({ width: 2.2 * unit, color: 0xffd54f, join: 'round' })

    // Inner bright peach facet
    graphics.poly([p1.x * 0.55, p1.y * 0.55, p2.x * 0.55, p2.y * 0.55, p3.x * 0.55, p3.y * 0.55], true)
      .fill(0xff8a80)

    // Center sparkling gem
    graphics.circle(0, 0, r * 0.24).fill(0xffffff)
    return
  }

  if (entity.kind === 'heart') {
    entity.radius = 15 * unit
    const r = entity.radius
    graphics.circle(-r * 0.45, -r * 0.2, r * 0.55).fill(0xef476f)
      .circle(r * 0.45, -r * 0.2, r * 0.55).fill(0xef476f)
      .poly([-r, 0, r, 0, 0, r * 1.2], true).fill(0xef476f)
    graphics.circle(-r * 0.35, -r * 0.38, r * 0.16).fill({ color: 0xffffff, alpha: 0.72 })
    return
  }

  // Hazard kinds:
  if (biome === 'room') {
    const hazard = entity.hazardType || 'wine_glass'

    if (hazard === 'chair') {
      entity.radius = 21 * unit
      const r = entity.radius
      // Wooden chair top rail
      graphics.roundRect(-r * 0.65, -r * 0.9, r * 1.3, r * 0.22, 2 * unit).fill(0x5d4037)
      // Vertical back slats
      for (let i = -2; i <= 2; i++) {
        graphics.rect(i * (r * 0.23) - r * 0.04, -r * 0.68, r * 0.08, r * 0.68).fill(0x795548)
      }
      // Luxurious red velvet cushion
      graphics.roundRect(-r * 0.8, 0, r * 1.6, r * 0.35, 4 * unit).fill(0xb71c1c)
        .stroke({ width: 1.2, color: 0xff5252, alpha: 0.8 })
      // Legs
      graphics.rect(-r * 0.7, r * 0.35, r * 0.12, r * 0.65).fill(0x4e342e)
      graphics.rect(r * 0.58, r * 0.35, r * 0.12, r * 0.65).fill(0x4e342e)
      // Leg rungs
      graphics.rect(-r * 0.65, r * 0.68, r * 1.3, r * 0.08).fill(0x5d4037)
      return
    }

    if (hazard === 'rose') {
      entity.radius = 18 * unit
      const r = entity.radius
      // Stem with thorn
      graphics.moveTo(0, 0).bezierCurveTo(-r * 0.2, r * 0.4, r * 0.2, r * 0.7, 0, r * 0.9)
        .stroke({ width: 2.4 * unit, color: 0x2e7d32, cap: 'round' })
      graphics.ellipse(-r * 0.35, r * 0.45, r * 0.28, r * 0.12).fill(0x43a047)
      // Rose petal clusters
      graphics.circle(-r * 0.3, -r * 0.2, r * 0.38).fill(0xc2185b)
      graphics.circle(r * 0.3, -r * 0.2, r * 0.38).fill(0xc2185b)
      graphics.circle(0, -r * 0.35, r * 0.42).fill(0xd81b60)
      graphics.circle(0, -r * 0.1, r * 0.45).fill(0xe91e63)
      graphics.ellipse(0, -r * 0.15, r * 0.3, r * 0.25).fill(0x880e4f)
      graphics.arc(0, -r * 0.15, r * 0.18, 0, Math.PI * 1.5).stroke({ width: 1.5, color: 0xff4081 })
      return
    }

    // Default room hazard: 'wine_glass'
    entity.radius = 18 * unit
    const r = entity.radius
    // Glass goblet outline
    graphics.poly([
      -r * 0.65, -r * 0.75,
      r * 0.65, -r * 0.75,
      r * 0.5, r * 0.1,
      0, r * 0.45,
      -r * 0.5, r * 0.1,
    ], true).fill({ color: 0xffffff, alpha: 0.18 })
      .stroke({ width: 1.5, color: 0xffcdd2, alpha: 0.85 })

    // Wine liquid
    graphics.poly([
      -r * 0.52, -r * 0.25,
      r * 0.52, -r * 0.25,
      r * 0.44, r * 0.08,
      0, r * 0.38,
      -r * 0.44, r * 0.08,
    ], true).fill(0x880e4f)
    graphics.ellipse(0, -r * 0.25, r * 0.52, r * 0.12).fill(0xb71c1c)

    // Stem & base
    graphics.rect(-1.2 * unit, r * 0.45, 2.4 * unit, r * 0.45).fill(0xffcdd2)
    graphics.ellipse(0, r * 0.9, r * 0.55, r * 0.12).fill({ color: 0xffffff, alpha: 0.4 })
      .stroke({ width: 1.2, color: 0xffcdd2, alpha: 0.8 })
    graphics.moveTo(-r * 0.4, -r * 0.6).lineTo(-r * 0.25, 0).stroke({ width: 1.2, color: 0xffffff, alpha: 0.75 })
    return
  }

  if (biome === 'winter') {
    // Sharp frosty icicle
    entity.radius = 19 * unit
    const r = entity.radius
    graphics.poly([-r, -r * 0.65, r, -r * 0.65, r * 0.55, r, -r * 0.7, r], true).fill(0xc7e8f3)
      .poly([-r * 0.45, -r * 0.55, r * 0.45, -r * 0.55, 0, r * 0.55], true).fill(0xeffcff)
    graphics.poly([-r, -r * 0.65, r, -r * 0.65, r * 0.55, r, -r * 0.7, r], true).stroke({ width: 1.5, color: 0x6d95b8 })
    return
  }

  // Spring twig / branch obstacle
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
  if (biome === 'room') {
    // Luxurious warm crimson / red room with ambient candlelight glow
    view.rect(0, 0, metrics.width, metrics.height * 0.52).fill(0x2d0b11)
    view.rect(0, metrics.height * 0.52, metrics.width, metrics.height * 0.48).fill(0x420f18)
    // Warm romantic center ambient lantern glow
    view.circle(metrics.width * 0.5, metrics.height * 0.36, metrics.width * 0.42).fill({ color: 0x881b24, alpha: 0.35 })
    view.circle(metrics.width * 0.5, metrics.height * 0.36, metrics.width * 0.24).fill({ color: 0xba2d38, alpha: 0.25 })
    // Dark mahogany baseboard / floor trim
    view.rect(0, metrics.height * 0.86, metrics.width, metrics.height * 0.14).fill(0x180508)
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
  const [triangles, setTriangles] = useState(0)
  const [hasCheckpoint, setHasCheckpoint] = useState(false)
  const [doorsOpen, setDoorsOpen] = useState(false)
  const [enterReady, setEnterReady] = useState(false)
  const [biome, setBiome] = useState<BiomeId>('spring')
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

  const handleOpenDoors = useCallback(() => {
    setDoorsOpen(true)
    setTimeout(() => {
      setEnterReady(true)
    }, 650)
  }, [])

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
      triangles: 0,
      biome: 'spring',
      player: { x: 170, y: 110, vx: 0, vy: 0, invulnerableUntil: 0 },
      metrics: createMetrics(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1)),
      nextHazardAt: 1200,
      nextPearlAt: 2400,
      nextTriangleAt: Infinity,
      nextHeartAt: Infinity,
      eventEndsAt: 0,
      eventWind: 0,
      eventLift: 0,
      message: null,
      messageEndsAt: 0,
      lastHudAt: 0,
      hasReachedCheckpoint: false,
      roomStageStarted: false,
      freezeUntil: 0,
      eventBanner: null,
      postFreezeAction: null,
      springEventTriggered: false,
      winterEventTriggered: false,
      roomEventTriggered: false,
      difficulty,
      roomStart: DIFFICULTY_CONFIGS[difficulty].roomStart,
      totalDuration: DIFFICULTY_CONFIGS[difficulty].totalDuration,
    }

    const applyDifficulty = (nextDifficulty: Difficulty) => {
      const config = DIFFICULTY_CONFIGS[nextDifficulty]
      runtime.difficulty = nextDifficulty
      runtime.roomStart = config.roomStart
      runtime.totalDuration = config.totalDuration
    }

    const syncHud = (force = false) => {
      if (!force && runtime.elapsed - runtime.lastHudAt < 120) return
      runtime.lastHudAt = runtime.elapsed
      setLives(runtime.lives)
      setPearls(runtime.pearls)
      setTriangles(runtime.triangles)
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
      entity.hazardType = undefined
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
      entity.spin = (Math.random() - 0.5) * (kind === 'hazard' ? 1.4 : 2.4)

      if (kind === 'hazard') {
        if (runtime.biome === 'room') {
          const roomHazards: HazardType[] = ['chair', 'wine_glass', 'rose']
          entity.hazardType = roomHazards[Math.floor(Math.random() * roomHazards.length)]
        } else if (runtime.biome === 'winter') {
          entity.hazardType = 'icicle'
        } else {
          entity.hazardType = 'twig'
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
      drawKite(playerView, 64 * runtime.metrics.unit)
    }

    const applyBiome = (next: BiomeId, announce: boolean) => {
      runtime.biome = next
      if (announce) message(`${biomeAt(runtime.elapsed, runtime.difficulty).label.replace(/^..\s/, '')}!`, 2000)
      drawBackdrop(backdrop, runtime.metrics, next)
      updatePlayerGraphic()
      for (const particle of particles) {
        particle.tint =
          next === 'spring' ? 0x81c784 : next === 'winter' ? 0xffffff : 0xff1744
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
          triangles: runtime.triangles,
          difficulty: runtime.difficulty,
          difficultyLabel: DIFFICULTY_CONFIGS[runtime.difficulty].label,
        })
      }, 900)
    }

    const reset = () => {
      applyDifficulty(difficultyRef.current)
      recycleAll()
      setDoorsOpen(false)
      setEnterReady(false)
      runtime.state = 'playing'
      runtime.elapsed = 0
      runtime.lives = 3
      runtime.pearls = 0
      runtime.triangles = 0
      runtime.biome = 'spring'
      runtime.hasReachedCheckpoint = false
      runtime.roomStageStarted = false
      runtime.nextHazardAt = 1200
      runtime.nextPearlAt = 2400
      runtime.nextTriangleAt = Infinity
      runtime.nextHeartAt = Infinity
      runtime.eventEndsAt = 0
      runtime.eventWind = 0
      runtime.eventLift = 0
      runtime.freezeUntil = 0
      runtime.eventBanner = null
      runtime.postFreezeAction = null
      runtime.springEventTriggered = false
      runtime.winterEventTriggered = false
      runtime.roomEventTriggered = false
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
      setDoorsOpen(true)
      setEnterReady(true)
      runtime.state = 'playing'
      runtime.elapsed = runtime.roomStart
      runtime.lives = 3
      runtime.biome = 'room'
      runtime.hasReachedCheckpoint = true
      runtime.roomStageStarted = true
      runtime.nextPearlAt = Infinity
      runtime.nextTriangleAt = runtime.roomStart + 1600
      runtime.nextHazardAt = runtime.roomStart + 1400
      runtime.nextHeartAt = Infinity
      runtime.eventEndsAt = 0
      runtime.eventWind = 0
      runtime.eventLift = 0
      runtime.freezeUntil = 0
      runtime.eventBanner = null
      runtime.postFreezeAction = null
      runtime.roomEventTriggered = false

      runtime.player = {
        x: runtime.metrics.width / 2,
        y: runtime.metrics.height * 0.32,
        vx: 0,
        vy: -90 * runtime.metrics.yScale,
        invulnerableUntil: runtime.roomStart + 800,
      }
      applyBiome('room', false)
      message('Łap spadające trójkąty! 🔺', 1500)
      syncHud(true)
    }

    const resumeFromCheckpoint = () => {
      if (runtime.state !== 'checkpoint') return
      runtime.state = 'playing'
      runtime.player.vy = -180 * runtime.metrics.yScale
      message('Witaj w Czerwonym Pokoju! 🍷🔺', 1500)
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
      const gravity = runtime.biome === 'winter' ? 1.12 : 0.94
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
          if (entity.kind === 'pearl') {
            runtime.pearls += 1
            message('+1 Perła! ✨', 700)
          }
          if (entity.kind === 'triangle') {
            runtime.triangles += 1
            message('+1 Trójkąt! 🔺✨', 800)
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

      // Checkpoint trigger: Reaching the Red Room (stage 3) with door opening animation!
      if (runtime.elapsed >= runtime.roomStart && !runtime.roomStageStarted) {
        runtime.elapsed = runtime.roomStart
        runtime.roomStageStarted = true
        runtime.hasReachedCheckpoint = true
        runtime.state = 'checkpoint'
        runtime.lives = 3
        runtime.nextPearlAt = Infinity
        runtime.nextTriangleAt = runtime.roomStart + 1800
        runtime.nextHazardAt = runtime.roomStart + 1400
        runtime.nextHeartAt = Infinity
        recycleAll()
        applyBiome('room', false)
        runtime.player.x = runtime.metrics.width / 2
        runtime.player.y = runtime.metrics.height * 0.32
        runtime.player.vx = 0
        runtime.player.vy = 0
        setDoorsOpen(false)
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

      // Event 3: Room chaos (~62s)
      if (!runtime.roomEventTriggered && runtime.elapsed >= 62000 && runtime.elapsed < 76000) {
        runtime.roomEventTriggered = true
        runtime.eventBanner = {
          title: '🍷 ZAMĘT W POKOJU! 🍷',
          subtitle: 'Wirujące meble i kieliszki – łap trójkąty i steruj uważnie!',
          type: 'room_chaos',
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
        const base = runtime.biome === 'winter' ? 1050 : runtime.biome === 'room' ? 1150 : 1350
        runtime.nextHazardAt = runtime.elapsed + (base + Math.random() * 500) * DIFFICULTY_CONFIGS[runtime.difficulty].hazardIntervalMultiplier
      }

      // Spawn pearls in Spring & Winter
      if (runtime.biome !== 'room' && runtime.elapsed >= runtime.nextPearlAt) {
        spawn('pearl')
        runtime.nextPearlAt = runtime.elapsed + 2400 + Math.random() * 750
      }

      // Spawn falling triangles in Room
      if (runtime.biome === 'room' && runtime.elapsed >= runtime.nextTriangleAt) {
        spawn('triangle')
        runtime.nextTriangleAt = runtime.elapsed + 2100 + Math.random() * 750
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
        {biome === 'room' ? (
          <span className="game-triangle-counter">🔺 {triangles}</span>
        ) : (
          <span className="game-pearl-counter">◌ {pearls}</span>
        )}
        <span className="game-goal-icon">🚪</span>
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
              <h3 className="modal-heading">Utrzymaj latawiec w locie!</h3>
              <p className="modal-text">
                Steruj latawcem za pomocą strzałek lub dotykając lewej/prawej strony ekranu.
                Omijaj przeszkody i zbieraj punkty w drodze do czerwonego pokoju!
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

        {/* 3D Door Opening Transition to Red Room */}
        {gameState === 'checkpoint' && (
          <div className="game-overlay room-door-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="door-cinematic-card">
              <span className="checkpoint-badge">Checkpoint • Przed drzwiami 🚪</span>

              {/* 3D Double Door Architecture */}
              <div className="door-stage-wrapper">
                <div className={`door-glow-interior ${doorsOpen ? 'active' : ''}`}>
                  <div className="door-light-beams" />
                  <div className="door-floating-particles">
                    <span className="dfp p1">🌹</span>
                    <span className="dfp p2">🔺</span>
                    <span className="dfp p3">✨</span>
                    <span className="dfp p4">🍷</span>
                    <span className="dfp p5">🔺</span>
                  </div>
                  {doorsOpen && <div className="flying-kite-door">🪁</div>}
                </div>

                <div className="door-frame">
                  <div className={`double-door door-left-wing ${doorsOpen ? 'opened' : ''}`}>
                    <div className="door-wood-panel top" />
                    <div className="door-wood-panel bottom" />
                    <div className="door-handle handle-left" />
                  </div>
                  <div className="door-center-gap" />
                  <div className={`double-door door-right-wing ${doorsOpen ? 'opened' : ''}`}>
                    <div className="door-wood-panel top" />
                    <div className="door-wood-panel bottom" />
                    <div className="door-handle handle-right" />
                  </div>
                </div>
              </div>

              {!doorsOpen ? (
                <>
                  <h3 className="modal-heading door-title">
                    Dotarłaś przed tajemnicze drzwi... 💕
                  </h3>
                  <p className="modal-text">
                    Przetrwałaś wiosenny wiatr i zimowy mróz. Co czeka za tymi drzwiami?
                  </p>
                  <button
                    type="button"
                    className="game-primary-btn door-action-btn"
                    onClick={handleOpenDoors}
                  >
                    Otwórz drzwi 🚪✨
                  </button>
                </>
              ) : (
                <>
                  <h3 className="modal-heading door-title door-welcome-title">
                    Witaj w Czerwonym Pokoju! 🍷✨
                  </h3>
                  <p className="modal-text">
                    Życia odnowione! Zbieraj <strong>spadające trójkąty 🔺</strong> i omijaj wirujące krzesła, kieliszki z winem oraz róże!
                  </p>
                  <button
                    type="button"
                    className="game-primary-btn door-action-btn door-enter-btn"
                    disabled={!enterReady}
                    onClick={resumeCheckpoint}
                  >
                    Wchodzimy! 🪁
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
                  ? 'Nie martw się! Możesz wznowić grę bezpośrednio od Czerwonego Pokoju.'
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
                    Wróć do pokoju 🍷🚪
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

        {gameState === 'victory' && (
          <div className="game-overlay">
            <div className="game-modal-card victory-card">
              <p className="modal-text">Udało się! Wszystkie etapy pokonane! 🍷✨</p>
            </div>
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
