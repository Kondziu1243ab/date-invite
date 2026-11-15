import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, type Ticker } from 'pixi.js'
import type {
  BiomeId,
  Difficulty,
  Entity,
  EntityKind,
  EventBanner,
  GameState,
  HazardType,
  Runtime,
  SecretLetter,
} from '../types'
import {
  DIFFICULTY_CONFIGS,
  SECRET_LETTERS,
  SPAWN_LETTER_ORDER,
  biomeAt,
} from '../constants'
import {
  CARD_IMAGE_PATH,
  createDiamondCardGraphic,
  createMetrics,
  drawBackdrop,
  drawEntity,
  drawScarab,
  updateDiamondCardGraphic,
} from '../rendering'
import {
  playCardCollect,
  playLetterChime,
  playScarabFlap,
  startMuseumJazzMusic,
  stopMuseumJazzMusic,
} from '../../soundEffects'
import {
  notifyDiamondCardCollected,
  notifyMuseumReached,
  notifyStageSkipped,
} from '../../notifyNtfy'

export type UsePixiGameOptions = {
  hostRef: React.RefObject<HTMLDivElement | null>
  difficulty: Difficulty
  onTriggerEnding: (collectedLetters: SecretLetter[], lives: number, hasDiamondCard: boolean) => void
}

export function usePixiGame({
  hostRef,
  difficulty,
  onTriggerEnding,
}: UsePixiGameOptions) {
  const onTriggerEndingRef = useRef(onTriggerEnding)
  onTriggerEndingRef.current = onTriggerEnding

  const difficultyRef = useRef(difficulty)
  difficultyRef.current = difficulty

  const controlsRef = useRef<{
    start: () => void
    resumeCheckpoint: () => void
    pause: () => void
    skip: () => void
    steer: (direction: -1 | 1) => void
    getCollectedLetters: () => SecretLetter[]
    getStats: () => {
      skippedStages: string[]
      manuallyCollectedCount: number
      hitsTaken: number
      deathsCount: number
      totalPlayTimeSeconds: number
      hasDiamondCard: boolean
    }
  } | null>(null)

  const [gameState, setGameState] = useState<GameState>('ready')
  const [lives, setLives] = useState(3)
  const [collectedLetters, setCollectedLetters] = useState<SecretLetter[]>([])
  const [hasCheckpoint, setHasCheckpoint] = useState(false)
  const [biome, setBiome] = useState<BiomeId>('spring')
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [eventBanner, setEventBanner] = useState<EventBanner | null>(null)
  const [hasDiamondCard, setHasDiamondCard] = useState(false)
  const [error, setError] = useState(false)

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

    let diamondCardEntity: {
      container: Container
      graphics: Graphics
      sprite: Sprite
      glow: Graphics
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      active: boolean
      collected: boolean
      spawnTime: number
      duration: number
    } | null = null

    const currentDiff = difficultyRef.current
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
      diamondCardEventTriggered: false,
      hasDiamondCard: false,
      difficulty: currentDiff,
      museumStart: DIFFICULTY_CONFIGS[currentDiff].museumStart,
      totalDuration: DIFFICULTY_CONFIGS[currentDiff].totalDuration,
      collectedLetters: [],
      checkpointLetters: [],
      hitsTaken: 0,
      deathsCount: 0,
      manuallyCollectedCount: 0,
      skippedStages: [],
      startTime: performance.now(),
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
      setHasDiamondCard(runtime.hasDiamondCard)
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
      if (diamondCardEntity) {
        diamondCardEntity.active = false
        diamondCardEntity.container.visible = false
      }
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
          const museumHazards: HazardType[] = ['vase', 'brush', 'hieroglyph_slab']
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

    const spawnDiamondCard = () => {
      if (diamondCardEntity?.active || runtime.hasDiamondCard) return
      const cardDuration = 7000 // Card flies for 7 seconds before escaping
      if (!diamondCardEntity) {
        const { container, graphics, sprite, glow } = createDiamondCardGraphic(runtime.metrics.unit)
        diamondCardEntity = {
          container,
          graphics,
          sprite,
          glow,
          x: runtime.metrics.width * 0.5,
          y: runtime.metrics.height * 0.4,
          vx: (Math.random() < 0.5 ? -1 : 1) * 110 * runtime.metrics.xScale,
          vy: -35 * runtime.metrics.yScale,
          radius: 23 * runtime.metrics.unit,
          active: true,
          collected: false,
          spawnTime: runtime.elapsed,
          duration: cardDuration,
        }
        container.eventMode = 'static'
        container.cursor = 'pointer'
        container.on('pointerdown', (e) => {
          e.stopPropagation()
          collectDiamondCard()
        })
        itemLayer.addChild(container)
      } else {
        diamondCardEntity.active = true
        diamondCardEntity.collected = false
        diamondCardEntity.spawnTime = runtime.elapsed
        diamondCardEntity.duration = cardDuration
        diamondCardEntity.x = runtime.metrics.width * 0.5
        diamondCardEntity.y = runtime.metrics.height * 0.4
        diamondCardEntity.vx = (Math.random() < 0.5 ? -1 : 1) * 110 * runtime.metrics.xScale
        diamondCardEntity.vy = -35 * runtime.metrics.yScale
        diamondCardEntity.container.visible = true
        diamondCardEntity.container.alpha = 1
        diamondCardEntity.container.scale.set(1)
        if (diamondCardEntity.container.parent !== itemLayer) {
          itemLayer.addChild(diamondCardEntity.container)
        }
      }
      diamondCardEntity.container.position.set(diamondCardEntity.x, diamondCardEntity.y)
    }

    const collectDiamondCard = () => {
      if (!diamondCardEntity || !diamondCardEntity.active || diamondCardEntity.collected) return
      diamondCardEntity.collected = true
      diamondCardEntity.active = false
      runtime.hasDiamondCard = true
      playCardCollect()
      void notifyDiamondCardCollected()
      message('♦️ Zdobyto Damę Karo! Przyda się u Dżina! ♦️', 2600)

      const cardView = diamondCardEntity.container
      let animProgress = 0
      const onCardAnim = (t: Ticker) => {
        animProgress += t.deltaMS
        const ratio = Math.min(1, animProgress / 380)
        cardView.scale.set(1 + ratio * 0.6)
        cardView.alpha = 1 - ratio
        cardView.rotation += (t.deltaMS / 1000) * 8
        if (ratio >= 1) {
          cardView.visible = false
          if (app) app.ticker.remove(onCardAnim)
        }
      }
      if (app) app.ticker.add(onCardAnim)
      syncHud(true)
    }

    const message = (next: string, duration: number) => {
      runtime.message = next
      runtime.messageEndsAt = runtime.elapsed + duration
      syncHud(true)
    }

    const updatePlayerGraphic = () => {
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
      runtime.hitsTaken += 1
      runtime.lives -= 1
      runtime.player.invulnerableUntil = runtime.elapsed + 850
      runtime.player.vy = -210 * runtime.metrics.yScale
      runtime.nextHeartAt = runtime.lives > 0 ? runtime.elapsed + 4500 : Infinity
      message('Uważaj! ♥', 950)
      if (runtime.lives <= 0) {
        runtime.deathsCount += 1
        runtime.state = 'gameover'
      }
      syncHud(true)
    }

    const finish = () => {
      if (runtime.state !== 'playing') return
      runtime.state = 'ending'
      runtime.message = null
      syncHud(true)
      onTriggerEndingRef.current([...runtime.collectedLetters], runtime.lives, runtime.hasDiamondCard)
    }

    const reset = () => {
      applyDifficulty(difficultyRef.current)
      recycleAll()
      startMuseumJazzMusic()
      runtime.state = 'playing'
      runtime.elapsed = 0
      runtime.lives = 3
      runtime.hitsTaken = 0
      runtime.deathsCount = 0
      runtime.manuallyCollectedCount = 0
      runtime.skippedStages = []
      runtime.startTime = performance.now()
      runtime.biome = 'spring'
      runtime.hasReachedCheckpoint = false
      runtime.museumStageStarted = false
      runtime.collectedLetters = []
      runtime.checkpointLetters = []
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
      runtime.diamondCardEventTriggered = false
      runtime.hasDiamondCard = false
      if (diamondCardEntity) {
        diamondCardEntity.active = false
        diamondCardEntity.collected = false
        diamondCardEntity.container.visible = false
      }
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

    const resumeCheckpointInternal = () => {
      recycleAll()

      runtime.elapsed = runtime.museumStart
      runtime.museumStageStarted = true
      runtime.hasReachedCheckpoint = true
      runtime.state = 'playing'
      runtime.lives = 3

      // Przywróć dokładnie litery z Wiosny i Zimy (usuń zebrane w Muzeum)
      runtime.collectedLetters = [...runtime.checkpointLetters]
      runtime.spawnedLetterIndex = 8 // Litery w Muzeum zaczynają się od indeksu 8

      // Zresetuj Damę Karo, aby pojawiła się ponownie w Muzeum
      runtime.hasDiamondCard = false
      runtime.diamondCardEventTriggered = false
      if (diamondCardEntity) {
        diamondCardEntity.active = false
        diamondCardEntity.collected = false
        diamondCardEntity.container.visible = false
      }

      runtime.nextLetterAt = runtime.museumStart + 2200
      runtime.nextHazardAt = runtime.museumStart + 1400
      runtime.nextHeartAt = Infinity

      runtime.player = {
        x: runtime.metrics.width / 2,
        y: runtime.metrics.height * 0.35,
        vx: 0,
        vy: -180 * runtime.metrics.yScale,
        invulnerableUntil: runtime.elapsed + 1400,
      }

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
        runtime.metrics.width - 28 * runtime.metrics.xScale
      )
      runtime.player.y = Math.min(
        Math.max(y * runtime.metrics.height, 58 * runtime.metrics.yScale),
        runtime.metrics.height - 30 * runtime.metrics.yScale
      )
      drawBackdrop(backdrop, runtime.metrics, runtime.biome)
      updatePlayerGraphic()
      if (diamondCardEntity) {
        updateDiamondCardGraphic(
          diamondCardEntity.graphics,
          diamondCardEntity.glow,
          diamondCardEntity.sprite,
          runtime.metrics.unit
        )
        diamondCardEntity.radius = 23 * runtime.metrics.unit
      }
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
              runtime.manuallyCollectedCount += 1
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

    const moveDiamondCard = (delta: number) => {
      if (!diamondCardEntity || !diamondCardEntity.active || diamondCardEntity.collected) return
      const card = diamondCardEntity
      const m = runtime.metrics
      const player = runtime.player
      const seconds = delta / 1000

      // Expiration check ("powinna po jakims czasie zniknac")
      const timeAlive = runtime.elapsed - card.spawnTime
      if (timeAlive >= card.duration) {
        card.active = false
        message('Dama Karo uciekła w zakamarki Muzeum! 💨', 2400)
        const c = card.container
        let fadeElapsed = 0
        const fadeAnim = (t: Ticker) => {
          fadeElapsed += t.deltaMS
          const p = Math.min(1, fadeElapsed / 400)
          c.scale.set(1 - p * 0.3)
          c.alpha = 1 - p
          if (p >= 1) {
            c.visible = false
            if (app) app.ticker.remove(fadeAnim)
          }
        }
        if (app) app.ticker.add(fadeAnim)
        return
      }

      // Warning flicker during last 2.2s before escape
      if (card.duration - timeAlive < 2200) {
        card.container.alpha = 0.55 + Math.sin(runtime.elapsed / 90) * 0.45
      } else {
        card.container.alpha = 1
      }

      const dx = card.x - player.x
      const dy = card.y - player.y
      const dist = Math.hypot(dx, dy)

      // 1. Proximity evasion ("ta karta ma uciekac po ekranie")
      const fleeRadius = 175 * m.unit
      if (dist < fleeRadius && dist > 0.01) {
        const intensity = 1 - dist / fleeRadius
        const fleeSpeed = 460 * m.unit * intensity
        card.vx += (dx / dist) * fleeSpeed * seconds
        card.vy += (dy / dist) * fleeSpeed * seconds
      }

      // 2. Playful fluttering & oscillation
      card.vy += Math.sin(runtime.elapsed / 220) * 45 * m.yScale * seconds
      card.vx += Math.cos(runtime.elapsed / 340) * 35 * m.xScale * seconds

      // 3. Max speed limit
      const speed = Math.hypot(card.vx, card.vy)
      const maxSpeed = 220 * m.unit
      if (speed > maxSpeed) {
        card.vx = (card.vx / speed) * maxSpeed
        card.vy = (card.vy / speed) * maxSpeed
      }

      // 4. Update coordinates
      card.x += card.vx * seconds
      card.y += card.vy * seconds

      // 5. Screen boundary bouncing (elastic rebound so it never gets lost off-screen)
      const padX = 35 * m.xScale
      const padY = 55 * m.yScale
      if (card.x < padX) {
        card.x = padX
        card.vx = Math.abs(card.vx) * 0.95
      } else if (card.x > m.width - padX) {
        card.x = m.width - padX
        card.vx = -Math.abs(card.vx) * 0.95
      }
      if (card.y < padY) {
        card.y = padY
        card.vy = Math.abs(card.vy) * 0.95
      } else if (card.y > m.height - padY) {
        card.y = m.height - padY
        card.vy = -Math.abs(card.vy) * 0.95
      }

      // 6. Visual rotation (tilt with movement)
      card.container.position.set(card.x, card.y)
      card.container.rotation = (card.vx / maxSpeed) * 0.35 + Math.sin(runtime.elapsed / 260) * 0.12

      // 7. Collision with Scarab
      if (dist < card.radius + 24 * m.unit) {
        collectDiamondCard()
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
        runtime.checkpointLetters = [...runtime.collectedLetters]
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
        void notifyMuseumReached()
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

      // Event: Museum Lucky Queen of Diamonds Card Event (Dama Karo) (~6.5s into Museum)
      if (
        !runtime.diamondCardEventTriggered &&
        !runtime.hasDiamondCard &&
        runtime.biome === 'museum' &&
        runtime.elapsed >= runtime.museumStart + 6500
      ) {
        runtime.diamondCardEventTriggered = true
        runtime.eventBanner = {
          title: '♦️ SZCZĘŚLIWA KARTA KARO ♦️',
          subtitle: 'Szczęśliwa karta Karo – może się przydać! Złap ją!',
          type: 'diamond_card',
        }
        runtime.freezeUntil = runtime.elapsed + 2400
        runtime.postFreezeAction = () => {
          spawnDiamondCard()
          message('Szczęśliwa karta Karo – może się przydać! Złap ją! ♦️', 2600)
        }
        syncHud(true)
        return
      }

      // Event 3: Museum golden aura (~68s)
      if (!runtime.museumEventTriggered && runtime.elapsed >= 68000 && runtime.elapsed < 80000) {
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
      moveDiamondCard(delta)
      moveParticles(delta)
      if (runtime.message && runtime.elapsed >= runtime.messageEndsAt) runtime.message = null
      syncHud()
    }

    let lastSteerTime = 0
    const steer = (direction: -1 | 1) => {
      const now = performance.now()
      if (now - lastSteerTime < 50) return
      lastSteerTime = now
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

    const handleHostPointer = (e: PointerEvent) => {
      if (runtime.state !== 'playing' || runtime.freezeUntil > runtime.elapsed) return
      const rect = host.getBoundingClientRect()
      const x = e.clientX - rect.left
      steer(x < rect.width / 2 ? -1 : 1)
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
          eventFeatures: { move: false, globalMove: false, click: true, wheel: false },
        })
        if (disposed) {
          nextApp.destroy()
          return
        }
        app = nextApp
        Assets.load(CARD_IMAGE_PATH).catch(() => null)
        app.canvas.classList.add('veil-pixi-canvas')
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
        app.stage.eventMode = 'static'
        app.stage.interactiveChildren = false
        app.stage.hitArea = new Rectangle(0, 0, 10000, 10000)
        app.stage.on('pointerdown', (event) => {
          if (runtime.state !== 'playing' || runtime.freezeUntil > runtime.elapsed) return
          const isLeft = event.global.x < runtime.metrics.width / 2
          steer(isLeft ? -1 : 1)
        })

        host.addEventListener('pointerdown', handleHostPointer)

        const skipCurrentStage = () => {
          applyDifficulty(difficultyRef.current)

          // Anuluj wszelkie aktywne zdarzenia pogodowe i zamrożenia
          runtime.freezeUntil = 0
          runtime.eventBanner = null
          runtime.postFreezeAction = null
          runtime.eventEndsAt = 0
          runtime.eventWind = 0
          runtime.eventLift = 0

          // Nie zezwalaj na skipowanie przed startem lub w pierwszych 2 sekundach
          if (runtime.state === 'ready' || (runtime.biome === 'spring' && runtime.elapsed < 2000)) {
            message('Daj Skarabeuszowi chwilę polatać! 🌸', 1200)
            return
          }

          // Poziom 1: Wiosna (początek lub w trakcie wiosny) -> przeskocz do Zimy
          if (runtime.biome === 'spring') {
            if (!runtime.skippedStages.includes('Wiosna')) {
              runtime.skippedStages.push('Wiosna')
            }
            void notifyStageSkipped('Wiosna', 'Zima')
            runtime.spawnedLetterIndex = Math.max(runtime.spawnedLetterIndex, 4)

            recycleAll()
            const springEnd = Math.round(runtime.museumStart * 0.48)
            runtime.elapsed = springEnd + 100
            applyBiome('winter', false)
            runtime.springEventTriggered = true
            runtime.lives = 3
            runtime.nextHazardAt = runtime.elapsed + 1200
            runtime.nextLetterAt = runtime.elapsed + 2400
            runtime.nextHeartAt = Infinity
            runtime.player = {
              x: runtime.metrics.width / 2,
              y: runtime.metrics.height * 0.35,
              vx: 0,
              vy: -180 * runtime.metrics.yScale,
              invulnerableUntil: 0,
            }
            runtime.state = 'playing'
            startMuseumJazzMusic()
            message('❄️ Przeskoczono do Zimy!', 1500)
            syncHud(true)
            return
          }

          // Poziom 2: Zima -> przeskocz do Muzeum (Checkpoint)
          if (runtime.biome === 'winter' && runtime.state !== 'checkpoint') {
            if (!runtime.skippedStages.includes('Zima')) {
              runtime.skippedStages.push('Zima')
            }
            void notifyStageSkipped('Zima', 'Muzeum')
            runtime.spawnedLetterIndex = Math.max(runtime.spawnedLetterIndex, 8)

            recycleAll()
            runtime.winterEventTriggered = true
            runtime.elapsed = runtime.museumStart
            runtime.museumStageStarted = true
            runtime.hasReachedCheckpoint = true
            runtime.checkpointLetters = [...runtime.collectedLetters]
            runtime.state = 'checkpoint'
            runtime.lives = 3
            runtime.nextLetterAt = runtime.museumStart + 1800
            runtime.nextHazardAt = runtime.museumStart + 1400
            runtime.nextHeartAt = Infinity
            applyBiome('museum', false)
            runtime.player = {
              x: runtime.metrics.width / 2,
              y: runtime.metrics.height * 0.32,
              vx: 0,
              vy: 0,
              invulnerableUntil: 0,
            }
            syncHud(true)
            return
          }

          // Poziom 3: Muzeum (na checkpoincie lub w trakcie muzeum) -> przeskocz do Strażnika Sarkofagu!
          if (!runtime.skippedStages.includes('Muzeum')) {
            runtime.skippedStages.push('Muzeum')
          }
          void notifyStageSkipped('Muzeum', 'Strażnik Sarkofagu')
          runtime.spawnedLetterIndex = 12
          runtime.lives = 3
          recycleAll()
          runtime.museumEventTriggered = true
          runtime.elapsed = runtime.totalDuration
          runtime.state = 'ending'
          runtime.message = null
          syncHud(true)
          onTriggerEndingRef.current([...runtime.collectedLetters], 3, runtime.hasDiamondCard)
        }

        controlsRef.current = {
          start: reset,
          resumeCheckpoint: resumeCheckpointInternal,
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
          skip: skipCurrentStage,
          steer,
          getCollectedLetters: () => runtime.collectedLetters,
          getStats: () => ({
            skippedStages: [...runtime.skippedStages],
            manuallyCollectedCount: runtime.manuallyCollectedCount,
            hitsTaken: runtime.hitsTaken,
            deathsCount: runtime.deathsCount,
            totalPlayTimeSeconds: Math.round((performance.now() - runtime.startTime) / 1000),
            hasDiamondCard: runtime.hasDiamondCard,
          }),
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
      host.removeEventListener('pointerdown', handleHostPointer)
      resizeObserver?.disconnect()
      window.removeEventListener('keydown', handleKey)
      controlsRef.current = null
      if (app) {
        if (tickerUpdate) app.ticker.remove(tickerUpdate)
        app.destroy(
          { removeView: true, releaseGlobalResources: true },
          { children: true, texture: true, textureSource: true }
        )
      }
    }
  }, [hostRef])

  const startGame = useCallback(() => {
    startMuseumJazzMusic()
    controlsRef.current?.start()
  }, [])

  const resumeCheckpoint = useCallback(() => {
    startMuseumJazzMusic()
    controlsRef.current?.resumeCheckpoint()
  }, [])

  const togglePause = useCallback(() => {
    controlsRef.current?.pause()
  }, [])

  const steer = useCallback((direction: -1 | 1) => {
    controlsRef.current?.steer(direction)
  }, [])

  const skipGame = useCallback(() => {
    controlsRef.current?.skip()
  }, [])

  const getCollectedLetters = useCallback(() => {
    return controlsRef.current?.getCollectedLetters() ?? collectedLetters
  }, [collectedLetters])

  const getStats = useCallback(() => {
    return (
      controlsRef.current?.getStats() ?? {
        skippedStages: [],
        manuallyCollectedCount: 0,
        hitsTaken: 0,
        deathsCount: 0,
        totalPlayTimeSeconds: 0,
        hasDiamondCard: false,
      }
    )
  }, [])

  return {
    gameState,
    setGameState,
    lives,
    setLives,
    collectedLetters,
    setCollectedLetters,
    hasCheckpoint,
    biome,
    progress,
    toast,
    eventBanner,
    hasDiamondCard,
    setHasDiamondCard,
    error,
    startGame,
    resumeCheckpoint,
    togglePause,
    steer,
    skipGame,
    getCollectedLetters,
    getStats,
  }
}
