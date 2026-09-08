import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics, Rectangle, type Ticker } from 'pixi.js'

type VeilGameProps = { onComplete: (pearls: number) => void }
type GameState = 'ready' | 'playing' | 'paused' | 'gameover' | 'victory'
type BiomeId = 'autumn' | 'winter' | 'spring'
type EntityKind = 'hazard' | 'pearl' | 'heart'
type Metrics = { width: number; height: number; xScale: number; yScale: number; unit: number }
type Entity = { view: Graphics; kind: EntityKind; x: number; y: number; vx: number; vy: number; radius: number; spin: number; active: boolean }
type Runtime = {
  state: GameState; elapsed: number; lives: number; pearls: number; biome: BiomeId
  player: { x: number; y: number; vx: number; vy: number; invulnerableUntil: number }
  metrics: Metrics; nextHazardAt: number; nextPearlAt: number; nextHeartAt: number; nextEventAt: number
  eventEndsAt: number; eventWind: number; eventLift: number; message: string | null; messageEndsAt: number; lastHudAt: number
}

const TOTAL_DURATION = 72_000
const BIOMES: readonly { id: BiomeId; label: string; until: number; event: string }[] = [
  { id: 'autumn', label: '🍂 Autumn Breeze', until: 22_000, event: 'Warm Gust' },
  { id: 'winter', label: '❄️ Winter Frost', until: 46_000, event: 'Snow Squall' },
  { id: 'spring', label: '🌼 Spring Meadow', until: TOTAL_DURATION, event: 'Bloom Current' },
]

const biomeAt = (elapsed: number) => BIOMES.find((biome) => elapsed < biome.until) ?? BIOMES[BIOMES.length - 1]
const createMetrics = (width: number, height: number): Metrics => ({ width, height, xScale: Math.max(width / 340, 0.72), yScale: Math.max(height / 520, 0.72), unit: Math.max(Math.min(width / 340, height / 520), 0.72) })

function drawPlayer(view: Graphics, size: number): void {
  view.clear()
  // A single floating sheet of tulle with a narrow band and a scalloped lace hem.
  view.moveTo(-size * 0.17, -size * 0.32)
    .quadraticCurveTo(0, -size * 0.38, size * 0.17, -size * 0.32)
    .bezierCurveTo(size * 0.24, -size * 0.04, size * 0.46, size * 0.2, size * 0.34, size * 0.54)
    .quadraticCurveTo(size * 0.27, size * 0.68, size * 0.15, size * 0.57)
    .quadraticCurveTo(size * 0.05, size * 0.73, -size * 0.05, size * 0.58)
    .quadraticCurveTo(-size * 0.2, size * 0.7, -size * 0.31, size * 0.52)
    .bezierCurveTo(-size * 0.45, size * 0.17, -size * 0.24, -size * 0.06, -size * 0.17, -size * 0.32)
    .closePath()
    .fill({ color: 0xffffff, alpha: 0.82 })
    .stroke({ width: 1.3 * size / 64, color: 0xe9a5c0, alpha: 0.9, join: 'round' })
  view.moveTo(-size * 0.1, -size * 0.26)
    .bezierCurveTo(-size * 0.24, size * 0.04, -size * 0.15, size * 0.31, -size * 0.16, size * 0.56)
    .stroke({ width: 1.2 * size / 64, color: 0xf6d4e3, alpha: 0.9 })
  view.moveTo(size * 0.08, -size * 0.25)
    .bezierCurveTo(size * 0.25, size * 0.03, size * 0.19, size * 0.28, size * 0.17, size * 0.55)
    .stroke({ width: 1.2 * size / 64, color: 0xf6d4e3, alpha: 0.9 })
  view.roundRect(-size * 0.2, -size * 0.39, size * 0.4, size * 0.075, size * 0.035)
    .fill(0xd879a3)
  view.circle(-size * 0.09, -size * 0.355, size * 0.015).fill(0xffffff)
  view.circle(0, -size * 0.355, size * 0.015).fill(0xffffff)
  view.circle(size * 0.09, -size * 0.355, size * 0.015).fill(0xffffff)
}

function drawEntity(entity: Entity, biome: BiomeId, unit: number): void {
  const { view } = entity
  view.clear()
  if (entity.kind === 'pearl') {
    entity.radius = 11 * unit
    view.circle(0, 0, entity.radius).fill(0xfff9f1).circle(entity.radius * 0.27, entity.radius * 0.27, entity.radius * 0.68).fill({ color: 0xf4bad5, alpha: 0.5 })
    view.circle(-entity.radius * 0.32, -entity.radius * 0.32, entity.radius * 0.22).fill(0xffffff).circle(0, 0, entity.radius).stroke({ width: 1.4, color: 0xe5a4c1, alpha: 0.85 })
    return
  }
  if (entity.kind === 'heart') {
    entity.radius = 15 * unit
    const r = entity.radius
    view.circle(-r * 0.45, -r * 0.2, r * 0.55).fill(0xef476f).circle(r * 0.45, -r * 0.2, r * 0.55).fill(0xef476f).poly([-r, 0, r, 0, 0, r * 1.2], true).fill(0xef476f)
    view.circle(-r * 0.35, -r * 0.38, r * 0.16).fill({ color: 0xffffff, alpha: 0.72 })
    return
  }
  entity.radius = (biome === 'winter' ? 19 : 17) * unit
  const r = entity.radius
  if (biome === 'winter') {
    view.poly([-r, -r * 0.65, r, -r * 0.65, r * 0.55, r, -r * 0.7, r], true).fill(0xc7e8f3).poly([-r * 0.45, -r * 0.55, r * 0.45, -r * 0.55, 0, r * 0.55], true).fill(0xeffcff)
    view.poly([-r, -r * 0.65, r, -r * 0.65, r * 0.55, r, -r * 0.7, r], true).stroke({ width: 1.5, color: 0x6d95b8 })
  } else if (biome === 'spring') {
    for (let index = 0; index < 5; index += 1) { const angle = Math.PI * 2 * index / 5; view.circle(Math.cos(angle) * r * 0.56, Math.sin(angle) * r * 0.56, r * 0.48).fill(0xff8fb1) }
    view.circle(0, 0, r * 0.38).fill(0xffd166)
  } else {
    view.circle(0, 0, r).fill(0x9a6139).arc(0, 0, r * 0.62, Math.PI, Math.PI * 2).stroke({ width: 2, color: 0xf6c27c, alpha: 0.8 })
    view.moveTo(0, -r).lineTo(r * 0.45, -r * 1.4).stroke({ width: 2, color: 0x5c8f61 })
  }
}

function drawBackdrop(view: Graphics, metrics: Metrics, biome: BiomeId): void {
  const palette = biome === 'autumn' ? [0xfffbf5, 0xfceddc, 0xf6b27f] : biome === 'winter' ? [0xf4fafd, 0xe3f2fd, 0x9ec5e5] : [0xf7fff1, 0xe5f7d5, 0x9fd596]
  view.clear().rect(0, 0, metrics.width, metrics.height * 0.48).fill(palette[0]).rect(0, metrics.height * 0.48, metrics.width, metrics.height * 0.52).fill(palette[1]).rect(0, metrics.height * 0.82, metrics.width, metrics.height * 0.18).fill({ color: palette[2], alpha: 0.2 })
}

export default function VeilGame({ onComplete }: VeilGameProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<{ start: () => void; pause: () => void; steer: (direction: -1 | 1) => void } | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const [gameState, setGameState] = useState<GameState>('ready')
  const [lives, setLives] = useState(3)
  const [pearls, setPearls] = useState(0)
  const [biome, setBiome] = useState<BiomeId>('autumn')
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const startGame = useCallback(() => controlsRef.current?.start(), [])
  const togglePause = useCallback(() => controlsRef.current?.pause(), [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let app: Application | null = null
    let finishTimer: number | null = null
    let resizeObserver: ResizeObserver | null = null
    let tickerUpdate: ((ticker: Ticker) => void) | null = null
    const playerView = new Graphics(); const backdrop = new Graphics(); const particleLayer = new Container(); const itemLayer = new Container(); const hazardLayer = new Container(); const playerLayer = new Container()
    const particles: Graphics[] = []; const entities: Entity[] = []; const entityPool: Entity[] = []
    const runtime: Runtime = { state: 'ready', elapsed: 0, lives: 3, pearls: 0, biome: 'autumn', player: { x: 170, y: 110, vx: 0, vy: 0, invulnerableUntil: 0 }, metrics: createMetrics(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1)), nextHazardAt: 1200, nextPearlAt: 2600, nextHeartAt: Infinity, nextEventAt: 7000, eventEndsAt: 0, eventWind: 0, eventLift: 0, message: null, messageEndsAt: 0, lastHudAt: 0 }
    const syncHud = (force = false) => {
      if (!force && runtime.elapsed - runtime.lastHudAt < 120) return
      runtime.lastHudAt = runtime.elapsed; setLives(runtime.lives); setPearls(runtime.pearls); setBiome(runtime.biome); setProgress(Math.min(100, Math.floor(runtime.elapsed / TOTAL_DURATION * 100))); setGameState(runtime.state); setToast(runtime.message)
    }
    const recycle = (entity: Entity) => { entity.active = false; entity.view.visible = false; entityPool.push(entity) }
    const recycleAll = () => { while (entities.length) recycle(entities.pop()!) }
    const acquire = (kind: EntityKind): Entity => {
      const entity = entityPool.pop() ?? { view: new Graphics(), kind, x: 0, y: 0, vx: 0, vy: 0, radius: 0, spin: 0, active: false }
      entity.kind = kind; entity.active = true; entity.view.visible = true; entity.view.rotation = 0; entity.view.alpha = 1
      const layer = kind === 'hazard' ? hazardLayer : itemLayer
      if (entity.view.parent !== layer) layer.addChild(entity.view)
      entities.push(entity); return entity
    }
    const spawn = (kind: EntityKind) => {
      const m = runtime.metrics; const entity = acquire(kind)
      entity.x = 28 * m.xScale + Math.random() * Math.max(1, m.width - 56 * m.xScale); entity.y = -42 * m.yScale; entity.vx = (Math.random() - 0.5) * 30 * m.xScale; entity.vy = (kind === 'hazard' ? 150 : 125) * m.yScale; entity.spin = (Math.random() - 0.5) * (kind === 'hazard' ? 1.4 : 2.2)
      drawEntity(entity, runtime.biome, m.unit)
    }
    const message = (next: string, duration: number) => { runtime.message = next; runtime.messageEndsAt = runtime.elapsed + duration; syncHud(true) }
    const applyBiome = (next: BiomeId, announce: boolean) => { runtime.biome = next; if (announce) message(`${biomeAt(runtime.elapsed).label.replace(/^..\s/, '')}!`, 2000); drawBackdrop(backdrop, runtime.metrics, next); for (const particle of particles) particle.tint = next === 'autumn' ? 0xd17b52 : next === 'winter' ? 0xffffff : 0xffe08a }
    const damage = () => {
      if (runtime.elapsed < runtime.player.invulnerableUntil || runtime.state !== 'playing') return
      runtime.lives -= 1; runtime.player.invulnerableUntil = runtime.elapsed + 850; runtime.player.vy = -210 * runtime.metrics.yScale; runtime.nextHeartAt = runtime.lives > 0 ? runtime.elapsed + 4500 : Infinity; message('Ouch! Find a heart.', 950)
      if (runtime.lives <= 0) runtime.state = 'gameover'
      syncHud(true)
    }
    const beginEvent = () => {
      const direction = Math.random() < 0.5 ? -1 : 1
      if (runtime.biome === 'spring') runtime.eventLift = -230 * runtime.metrics.yScale
      else runtime.eventWind = direction * (runtime.biome === 'winter' ? 145 : 82) * runtime.metrics.xScale
      runtime.eventEndsAt = runtime.elapsed + 2800; message(`${biomeAt(runtime.elapsed).event}\nRide the current`, 1350); runtime.nextEventAt = runtime.elapsed + 9000 + Math.random() * 2000
    }
    const finish = () => { if (runtime.state !== 'playing') return; runtime.state = 'victory'; runtime.message = null; syncHud(true); finishTimer = window.setTimeout(() => onCompleteRef.current(runtime.pearls), 900) }
    const reset = () => {
      recycleAll(); runtime.state = 'playing'; runtime.elapsed = 0; runtime.lives = 3; runtime.pearls = 0; runtime.biome = 'autumn'; runtime.nextHazardAt = 1200; runtime.nextPearlAt = 2600; runtime.nextHeartAt = Infinity; runtime.nextEventAt = 7000; runtime.eventEndsAt = 0; runtime.eventWind = 0; runtime.eventLift = 0; runtime.message = 'Autumn Breeze'; runtime.messageEndsAt = 1300
      runtime.player = { x: runtime.metrics.width / 2, y: runtime.metrics.height * 0.27, vx: 0, vy: -90 * runtime.metrics.yScale, invulnerableUntil: 0 }; applyBiome('autumn', false); syncHud(true)
    }
    const layout = () => {
      if (!app) return
      const old = runtime.metrics; const x = old.width ? runtime.player.x / old.width : 0.5; const y = old.height ? runtime.player.y / old.height : 0.3
      runtime.metrics = createMetrics(Math.max(app.screen.width, 1), Math.max(app.screen.height, 1)); runtime.player.x = Math.min(Math.max(x * runtime.metrics.width, 28 * runtime.metrics.xScale), runtime.metrics.width - 28 * runtime.metrics.xScale); runtime.player.y = Math.min(Math.max(y * runtime.metrics.height, 58 * runtime.metrics.yScale), runtime.metrics.height - 30 * runtime.metrics.yScale)
      drawBackdrop(backdrop, runtime.metrics, runtime.biome); drawPlayer(playerView, 64 * runtime.metrics.unit); app.stage.hitArea = new Rectangle(0, 0, runtime.metrics.width, runtime.metrics.height)
    }
    const movePlayer = (delta: number) => {
      const m = runtime.metrics; const player = runtime.player; const seconds = delta / 1000; const gravity = runtime.biome === 'winter' ? 1.12 : runtime.biome === 'spring' ? 0.84 : 1; const damping = runtime.biome === 'winter' ? 0.975 : 0.955
      player.vy += (760 * gravity * m.yScale + runtime.eventLift) * seconds; player.vx += (Math.sin(runtime.elapsed / 750) * 28 * m.xScale + runtime.eventWind) * seconds; player.vx *= Math.pow(damping, delta / 16.67); player.x += player.vx * seconds; player.y += player.vy * seconds
      const edge = 30 * m.xScale
      if (player.x < edge) { player.x = edge; player.vx = Math.abs(player.vx) * 0.35 }
      if (player.x > m.width - edge) { player.x = m.width - edge; player.vx = -Math.abs(player.vx) * 0.35 }
      if (player.y < 36 * m.yScale) { player.y = 36 * m.yScale; player.vy = Math.max(player.vy, 80 * m.yScale) }
      if (player.y > m.height - 32 * m.yScale) { player.y = m.height - 32 * m.yScale; player.vy = -300 * m.yScale; damage() }
      playerLayer.position.set(player.x, player.y); playerLayer.rotation = Math.max(-0.3, Math.min(0.34, player.vy / (1100 * m.yScale))); playerLayer.alpha = runtime.elapsed < player.invulnerableUntil && Math.floor(runtime.elapsed / 90) % 2 === 0 ? 0.3 : 1
    }
    const moveEntities = (delta: number) => {
      const seconds = delta / 1000; const next: Entity[] = []
      for (const entity of entities) {
        entity.x += (entity.vx + runtime.eventWind * (entity.kind === 'hazard' ? 0.22 : 0.08)) * seconds; entity.y += entity.vy * seconds; entity.view.position.set(entity.x, entity.y); entity.view.rotation += entity.spin * seconds
        if (entity.y > runtime.metrics.height + 55 * runtime.metrics.yScale || entity.x < -60 || entity.x > runtime.metrics.width + 60) { recycle(entity); continue }
        if (Math.hypot(runtime.player.x - entity.x, runtime.player.y - entity.y) < entity.radius + 24 * runtime.metrics.unit) {
          if (entity.kind === 'hazard') damage()
          if (entity.kind === 'pearl') runtime.pearls += 1
          if (entity.kind === 'heart' && runtime.lives < 3) { runtime.lives += 1; runtime.nextHeartAt = runtime.elapsed + 16000; message('Heart restored! ♥', 1000) }
          recycle(entity); continue
        }
        next.push(entity)
      }
      entities.length = 0; entities.push(...next)
    }
    const moveParticles = (delta: number) => { for (let i = 0; i < particles.length; i += 1) { const particle = particles[i]; particle.y += (18 + i % 4 * 7) * runtime.metrics.yScale * delta / 1000; particle.x += Math.sin(runtime.elapsed / 600 + i) * 0.35 * runtime.metrics.xScale; if (particle.y > runtime.metrics.height + 10) { particle.y = -8; particle.x = (i * 53 + runtime.elapsed / 19) % runtime.metrics.width } } }
    const tick = (ticker: Ticker) => {
      if (runtime.state !== 'playing') return
      const delta = Math.min(ticker.deltaMS, 34); runtime.elapsed += delta
      if (runtime.elapsed >= TOTAL_DURATION) { finish(); return }
      const nextBiome = biomeAt(runtime.elapsed).id
      if (nextBiome !== runtime.biome) applyBiome(nextBiome, true)
      if (runtime.eventEndsAt && runtime.elapsed >= runtime.eventEndsAt) { runtime.eventEndsAt = 0; runtime.eventWind = 0; runtime.eventLift = 0 }
      if (runtime.elapsed >= runtime.nextEventAt && !runtime.eventEndsAt) beginEvent()
      if (runtime.elapsed >= runtime.nextHazardAt) { spawn('hazard'); const base = runtime.biome === 'winter' ? 1050 : runtime.biome === 'spring' ? 1230 : 1350; runtime.nextHazardAt = runtime.elapsed + base + Math.random() * 500 }
      if (runtime.elapsed >= runtime.nextPearlAt) { spawn('pearl'); runtime.nextPearlAt = runtime.elapsed + 2650 + Math.random() * 850 }
      if (runtime.lives < 3 && runtime.elapsed >= runtime.nextHeartAt) { spawn('heart'); runtime.nextHeartAt = runtime.elapsed + 16000 }
      movePlayer(delta); moveEntities(delta); moveParticles(delta); if (runtime.message && runtime.elapsed >= runtime.messageEndsAt) runtime.message = null; syncHud()
    }
    const steer = (direction: -1 | 1) => { if (runtime.state !== 'playing') return; runtime.player.vy = -330 * runtime.metrics.yScale; runtime.player.vx += direction * 155 * runtime.metrics.xScale }
    const handlePointer = (x: number) => { if (runtime.state === 'ready' || runtime.state === 'gameover') { reset(); return }; steer(x < runtime.metrics.width / 2 ? -1 : 1) }
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { controlsRef.current?.pause(); return }; if (![' ', 'ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) return; event.preventDefault(); if (runtime.state === 'ready' || runtime.state === 'gameover') { reset(); return }; if (runtime.state !== 'playing') return; runtime.player.vy = -330 * runtime.metrics.yScale; if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') runtime.player.vx -= 155 * runtime.metrics.xScale; if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') runtime.player.vx += 155 * runtime.metrics.xScale }
    controlsRef.current = { start: reset, pause: () => { if (runtime.state === 'playing') runtime.state = 'paused'; else if (runtime.state === 'paused') runtime.state = 'playing'; syncHud(true) }, steer }
    const init = async () => {
      try {
        const nextApp = new Application()
        await nextApp.init({ resizeTo: host, preference: 'webgl', antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), sharedTicker: false, backgroundAlpha: 1, eventFeatures: { move: false, globalMove: false, click: true, wheel: false } })
        if (disposed) { nextApp.destroy({ removeView: true, releaseGlobalResources: true }, { children: true, texture: true, textureSource: true }); return }
        app = nextApp; app.canvas.classList.add('veil-pixi-canvas'); host.appendChild(app.canvas); app.stage.addChild(backdrop, particleLayer, itemLayer, hazardLayer, playerLayer); playerLayer.addChild(playerView); app.stage.eventMode = 'static'; app.stage.interactiveChildren = false; app.stage.on('pointerdown', (event) => handlePointer(event.global.x))
        for (let index = 0; index < 20; index += 1) { const particle = new Graphics().circle(0, 0, 1.5 + index % 3).fill({ color: 0xd17b52, alpha: 0.28 }); particle.position.set((index * 47) % runtime.metrics.width, (index * 83) % runtime.metrics.height); particles.push(particle); particleLayer.addChild(particle) }
        layout(); tickerUpdate = tick; app.ticker.add(tickerUpdate); resizeObserver = new ResizeObserver(() => { app?.resize(); layout() }); resizeObserver.observe(host); window.addEventListener('keydown', handleKey)
      } catch (initError) { console.error('Could not initialize Veil Run', initError); if (!disposed) setError(true) }
    }
    void init()
    return () => { disposed = true; if (finishTimer) window.clearTimeout(finishTimer); resizeObserver?.disconnect(); window.removeEventListener('keydown', handleKey); controlsRef.current = null; if (app) { if (tickerUpdate) app.ticker.remove(tickerUpdate); app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true, texture: true, textureSource: true }) } }
  }, [])

  const stageLabel = BIOMES.find((item) => item.id === biome)?.label ?? BIOMES[0].label
  return <div className="veil-game-wrapper">
    <div className="game-top-bar"><div className="game-lives" aria-label={`${lives} lives remaining`}>{Array.from({ length: 3 }).map((_, index) => <span key={index} className={`game-heart ${index < lives ? 'heart-alive' : 'heart-lost'}`}>{index < lives ? '❤️' : '🖤'}</span>)}</div><span className="game-stage-pill">{stageLabel}</span><button type="button" className="game-pause-btn" onClick={togglePause} disabled={gameState === 'ready' || gameState === 'gameover' || gameState === 'victory'}>{gameState === 'paused' ? 'Resume' : 'Pause'}</button></div>
    <div className="game-progress-wrapper"><div className="game-progress-bar"><div className="game-progress-fill" style={{ width: `${progress}%` }} /></div><span className="game-pearl-counter">◌ {pearls}</span><span className="game-goal-icon">💒</span></div>
    <div className={`game-arena-container ${biome}`}><div ref={hostRef} className="veil-pixi-host" aria-label="Veil Run game area" />{toast && <div className="biome-toast">{toast}</div>}<div className="mobile-game-controls" aria-label="Touch controls"><button type="button" className="game-control game-control-left" aria-label="Steer left" onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.steer(-1) }}>←</button><button type="button" className="game-control game-control-right" aria-label="Steer right" onPointerDown={(event) => { event.preventDefault(); controlsRef.current?.steer(1) }}>→</button></div>{error && <div className="game-overlay"><div className="game-modal-card"><h3 className="modal-heading">The game could not start</h3><p className="modal-text">Please refresh and try again.</p></div></div>}{gameState === 'ready' && !error && <div className="game-overlay"><div className="game-modal-card"><h3 className="modal-heading">Keep the Veil Flying!</h3><p className="modal-text">Use the arrows or simply tap left/right sides, collect pearls and restore hearts.</p><button type="button" className="game-primary-btn" onClick={startGame}>Start Playing</button></div></div>}{gameState === 'paused' && <div className="game-overlay"><div className="game-modal-card"><h3 className="modal-heading">Paused</h3><p className="modal-text">Take a breath, then catch the next breeze.</p><button type="button" className="game-primary-btn" onClick={togglePause}>Resume</button></div></div>}{gameState === 'gameover' && <div className="game-overlay"><div className="game-modal-card"><h3 className="modal-heading">The Veil Fell!</h3><p className="modal-text">Collect a heart after a hit and keep flying toward the altar.</p><button type="button" className="game-primary-btn" onClick={startGame}>Play Again</button></div></div>}{gameState === 'victory' && <div className="game-overlay"><div className="game-modal-card victory-card"><p className="modal-text">You got it.</p></div></div>}</div>
    <div className="game-steering-hint"><span>Tap left/right to steer</span><span>•</span><span>Space or arrows on desktop</span></div>
  </div>
}
