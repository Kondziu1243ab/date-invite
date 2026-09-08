import { useEffect, useRef, useState, useCallback } from 'react'

type VeilGameProps = {
  onComplete: () => void
}

type GameState = 'ready' | 'playing' | 'gameover' | 'victory'
type Biome = 'autumn' | 'winter'

interface Obstacle {
  x: number
  y: number
  vy: number
  emoji: string
  size: number
}

interface Particle {
  x: number
  y: number
  speedY: number
  speedX: number
  char: string
  size: number
}

export default function VeilGame({ onComplete }: VeilGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // React state ONLY for UI overlays and HUD updates (no per-frame React re-renders!)
  const [gameState, setGameState] = useState<GameState>('ready')
  const [biome, setBiome] = useState<Biome>('autumn')
  const [lives, setLives] = useState(3)
  const [progress, setProgress] = useState(0)
  const [biomeToast, setBiomeToast] = useState<string | null>(null)

  // Fast mutable game state for 60-120fps hardware-accelerated Canvas loop
  const gameRef = useRef({
    state: 'ready' as GameState,
    biome: 'autumn' as Biome,
    lives: 3,
    progress: 0,
    startTime: 0,
    totalDuration: 19000, // ~19 seconds to reach altar
    veil: {
      x: 140,
      y: 70,
      vx: 0,
      vy: 0,
      width: 64,
      height: 70,
      invulnerableFrames: 0,
    },
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    lastSpawn: 0,
    hitFlashFrames: 0,
    animId: 0,
    lastTime: 0,
    width: 340,
    height: 380,
  })

  // Start / Restart
  const startGame = useCallback(() => {
    const g = gameRef.current
    const canvas = canvasRef.current
    const width = canvas?.parentElement?.clientWidth || 340
    const height = 380

    g.width = width
    g.height = height
    g.state = 'playing'
    g.biome = 'autumn'
    g.lives = 3
    g.progress = 0
    g.startTime = performance.now()
    g.lastSpawn = performance.now()
    g.hitFlashFrames = 0
    g.obstacles = []

    // Spawn initial ambient particles
    g.particles = []
    for (let i = 0; i < 14; i++) {
      g.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedY: 0.7 + Math.random() * 0.8,
        speedX: (Math.random() - 0.5) * 0.6,
        char: Math.random() > 0.5 ? '🍁' : '🍂',
        size: 14 + Math.floor(Math.random() * 8),
      })
    }

    g.veil = {
      x: width / 2 - 32,
      y: 60,
      vx: 0,
      vy: -1.2,
      width: 64,
      height: 70,
      invulnerableFrames: 0,
    }

    setGameState('playing')
    setBiome('autumn')
    setLives(3)
    setProgress(0)
    setBiomeToast(null)
  }, [])

  // Responsive pointer tap (steers and bounces)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const g = gameRef.current
      if (g.state === 'ready') {
        startGame()
        return
      }
      if (g.state !== 'playing') return

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const isLeft = clickX < rect.width / 2

      // Flappy-like instant lift with zero input latency
      g.veil.vy = -6.2

      // Directional impulse
      if (isLeft) {
        g.veil.vx = 2.8
      } else {
        g.veil.vx = -2.8
      }
    },
    [startGame]
  )

  // Main Canvas Rendering Loop (Silky smooth 60 FPS)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const g = gameRef.current

    // Setup high-DPI crisp canvas
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.width = rect.width
      g.height = rect.height
    }
    updateCanvasSize()

    let lastProgressUpdate = 0

    const renderLoop = (now: number) => {
      if (!g.lastTime) g.lastTime = now
      const delta = Math.min(now - g.lastTime, 40)
      g.lastTime = now

      const width = g.width
      const height = g.height

      // 1. Draw Background Gradient
      const isWinter = g.biome === 'winter'
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height)
      if (!isWinter) {
        bgGrad.addColorStop(0, '#fff3e0')
        bgGrad.addColorStop(0.5, '#fbe9e7')
        bgGrad.addColorStop(1, '#fce4ec')
      } else {
        bgGrad.addColorStop(0, '#e1f5fe')
        bgGrad.addColorStop(0.5, '#e8eaf6')
        bgGrad.addColorStop(1, '#ede7f6')
      }
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // 2. Active Game Logic
      if (g.state === 'playing') {
        const elapsed = now - g.startTime
        const currentProgress = Math.min(100, Math.floor((elapsed / g.totalDuration) * 100))

        if (currentProgress !== g.progress) {
          g.progress = currentProgress
          // Throttle progress state update to React every 150ms to keep 60fps smooth
          if (now - lastProgressUpdate > 150) {
            lastProgressUpdate = now
            setProgress(currentProgress)
          }
        }

        // Biome switch at 50%
        if (currentProgress >= 50 && g.biome === 'autumn') {
          g.biome = 'winter'
          setBiome('winter')
          setBiomeToast('❄️ Winter Peak Reached!')
          setTimeout(() => setBiomeToast(null), 2500)
          // Switch ambient particles to snowflakes
          g.particles.forEach((p) => {
            p.char = Math.random() > 0.5 ? '❄️' : '✨'
          })
        }

        // Physics
        const v = g.veil
        if (v.invulnerableFrames > 0) v.invulnerableFrames--

        v.vy += 0.24 * (delta / 16) // Gravity
        v.vx *= 0.965 // Air damping
        v.x += v.vx * (delta / 16)
        v.y += v.vy * (delta / 16)

        // Walls
        if (v.x < 4) {
          v.x = 4
          v.vx = 0
        } else if (v.x > width - v.width - 4) {
          v.x = width - v.width - 4
          v.vx = 0
        }

        // Ceiling
        if (v.y < 0) {
          v.y = 0
          v.vy = 0.5
        }

        // Floor bounce check
        const maxY = height - v.height - 4
        if (v.y >= maxY) {
          v.y = maxY
          v.vy = -5.8 // Bounce up

          if (v.invulnerableFrames === 0) {
            v.invulnerableFrames = 50
            g.hitFlashFrames = 8
            g.lives--
            setLives(g.lives)

            if (g.lives <= 0) {
              g.state = 'gameover'
              setGameState('gameover')
            }
          }
        }

        // Obstacles Spawn
        const spawnInterval = isWinter ? 1250 : 1450
        if (now - g.lastSpawn > spawnInterval) {
          g.lastSpawn = now
          const emoji = isWinter
            ? Math.random() > 0.5 ? '🧊' : '❄️'
            : Math.random() > 0.5 ? '🍂' : '🌰'

          g.obstacles.push({
            x: 20 + Math.random() * (width - 55),
            y: -30,
            vy: 1.9 + Math.random() * 0.9,
            emoji,
            size: 28,
          })
        }

        // Obstacles update & collision
        const nextObstacles: Obstacle[] = []
        for (const obs of g.obstacles) {
          obs.y += obs.vy * (delta / 16)

          const veilCenterX = v.x + v.width / 2
          const veilCenterY = v.y + v.height / 2
          const obsCenterX = obs.x + obs.size / 2
          const obsCenterY = obs.y + obs.size / 2

          const dist = Math.hypot(veilCenterX - obsCenterX, veilCenterY - obsCenterY)
          if (dist < 32 && v.invulnerableFrames === 0) {
            // Hit!
            v.invulnerableFrames = 50
            g.hitFlashFrames = 8
            v.vy = -3.2
            g.lives--
            setLives(g.lives)

            if (g.lives <= 0) {
              g.state = 'gameover'
              setGameState('gameover')
              break
            }
            continue // Drop obstacle on hit
          }

          if (obs.y < height + 40) {
            nextObstacles.push(obs)
          }
        }
        g.obstacles = nextObstacles

        // Win check
        if (currentProgress >= 100) {
          g.state = 'victory'
          setGameState('victory')
          setTimeout(() => {
            onComplete()
          }, 2400)
        }
      }

      // 3. Draw Ambient Particles
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const p of g.particles) {
        p.y += p.speedY * (delta / 16)
        p.x += p.speedX * (delta / 16)
        if (p.y > height + 20) {
          p.y = -20
          p.x = Math.random() * width
        }
        ctx.font = `${p.size}px sans-serif`
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.fillText(p.char, p.x, p.y)
      }

      // 4. Draw Obstacles
      ctx.font = '28px sans-serif'
      for (const obs of g.obstacles) {
        ctx.fillText(obs.emoji, obs.x + 14, obs.y + 14)
      }

      // 5. Draw Veil (Crisp vector rendering on Canvas)
      const v = g.veil
      const isBlinking = v.invulnerableFrames > 0 && Math.floor(v.invulnerableFrames / 4) % 2 === 0

      if (!isBlinking) {
        ctx.save()
        ctx.translate(v.x + 32, v.y + 35)
        ctx.rotate((v.vx * 3.5 * Math.PI) / 180)

        // Veil shadow
        ctx.shadowColor = isWinter ? 'rgba(129, 212, 250, 0.5)' : 'rgba(244, 143, 177, 0.5)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetY = 4

        // Back tulle layer
        ctx.beginPath()
        ctx.moveTo(-18, -15)
        ctx.bezierCurveTo(-38, 5, -42, 35, -34, 52)
        ctx.bezierCurveTo(-20, 58, -10, 48, 0, 54)
        ctx.bezierCurveTo(10, 48, 20, 58, 34, 52)
        ctx.bezierCurveTo(42, 35, 38, 5, 18, -15)
        ctx.closePath()

        const tulleGrad = ctx.createLinearGradient(0, -20, 0, 55)
        tulleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)')
        tulleGrad.addColorStop(0.6, 'rgba(255, 240, 245, 0.88)')
        tulleGrad.addColorStop(1, 'rgba(255, 228, 230, 0.75)')
        ctx.fillStyle = tulleGrad
        ctx.fill()

        ctx.strokeStyle = isWinter ? '#81d4fa' : '#f48fb1'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Scalloped lace hem
        ctx.shadowColor = 'transparent'
        ctx.beginPath()
        ctx.arc(-22, 53, 5, 0, Math.PI)
        ctx.arc(-11, 54, 5, 0, Math.PI)
        ctx.arc(0, 54, 5, 0, Math.PI)
        ctx.arc(11, 54, 5, 0, Math.PI)
        ctx.arc(22, 53, 5, 0, Math.PI)
        ctx.strokeStyle = isWinter ? '#0288d1' : '#e91e63'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Tiara Headband
        ctx.beginPath()
        ctx.arc(0, -14, 20, Math.PI * 0.8, Math.PI * 0.2, true)
        ctx.strokeStyle = '#ec407a'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.stroke()

        // Tiara gems
        ctx.fillStyle = '#e91e63'
        ctx.beginPath()
        ctx.arc(0, -18, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, -18, 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#f8bbd0'
        ctx.beginPath()
        ctx.arc(-9, -17, 3.5, 0, Math.PI * 2)
        ctx.arc(9, -17, 3.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }

      // 6. Hit Red Flash overlay (for responsive damage feedback)
      if (g.hitFlashFrames > 0) {
        g.hitFlashFrames--
        ctx.fillStyle = 'rgba(244, 67, 54, 0.28)'
        ctx.fillRect(0, 0, width, height)
      }

      g.animId = requestAnimationFrame(renderLoop)
    }

    g.animId = requestAnimationFrame(renderLoop)

    const handleResize = () => updateCanvasSize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (g.animId) cancelAnimationFrame(g.animId)
    }
  }, [onComplete])

  return (
    <div className="veil-game-wrapper">
      {/* Top Header: Lives & Stage badge */}
      <div className="game-top-bar">
        <div className="game-lives" title={`${lives} lives remaining`}>
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={`game-heart ${i < lives ? 'heart-alive' : 'heart-lost'}`}
            >
              {i < lives ? '❤️' : '🖤'}
            </span>
          ))}
        </div>

        <span className="game-stage-pill">
          {biome === 'autumn' ? '🍂 Autumn Breeze' : '❄️ Winter Frost'}
        </span>
      </div>

      {/* Progress Track */}
      <div className="game-progress-wrapper">
        <div className="game-progress-bar">
          <div
            className="game-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="game-goal-icon">💒</span>
      </div>

      {/* Hardware-Accelerated 60FPS Canvas Arena */}
      <div className={`game-arena-container ${biome}`}>
        {biomeToast && <div className="biome-toast">{biomeToast}</div>}

        <canvas
          ref={canvasRef}
          className="game-canvas"
          onPointerDown={handlePointerDown}
        />

        {/* Start / Ready Overlay */}
        {gameState === 'ready' && (
          <div className="game-overlay">
            <div className="game-modal-card">
              <span className="modal-icon">👰‍♀️💨</span>
              <h3 className="modal-heading">Keep the Veil Flying!</h3>
              <p className="modal-text">
                Tap anywhere to bounce. Tap the left or right side to steer and dodge obstacles!
              </p>
              <button
                type="button"
                className="game-primary-btn"
                onClick={startGame}
              >
                Start Playing ✨
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="game-overlay">
            <div className="game-modal-card">
              <span className="modal-icon">💨💔</span>
              <h3 className="modal-heading">The Veil Fell!</h3>
              <p className="modal-text">
                Don't give up! Tap gently to keep it floating all the way to the altar.
              </p>
              <button
                type="button"
                className="game-primary-btn"
                onClick={startGame}
              >
                Play Again 🔄
              </button>
            </div>
          </div>
        )}

        {/* Victory Screen */}
        {gameState === 'victory' && (
          <div className="game-overlay">
            <div className="game-modal-card victory-card">
              <span className="modal-icon">💒💍✨</span>
              <h3 className="modal-heading">You Made It!</h3>
              <p className="modal-text">
                The veil reached the altar safely! 💕
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Steering hint */}
      <div className="game-steering-hint">
        <span>👈 Tap Left to steer Right</span>
        <span>•</span>
        <span>Tap Right to steer Left 👉</span>
      </div>
    </div>
  )
}
