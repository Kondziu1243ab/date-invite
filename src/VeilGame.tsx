import { useEffect, useRef, useState, useCallback } from 'react'

type VeilGameProps = {
  onComplete: () => void
}

type Phase = 'falling' | 'at_bottom' | 'blurring' | 'wedding_text' | 'fading_out'

export default function VeilGame({ onComplete }: VeilGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('falling')
  
  // Coordinates for the veil
  const [pos, setPos] = useState({ x: 130, y: 0, rot: 0 })
  const [dodgeMessage, setDodgeMessage] = useState<string | null>(null)
  
  const yRef = useRef(0)
  const swayTimeRef = useRef(0)
  const dodgeOffsetRef = useRef(0)
  const animFrameIdRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('falling')
  phaseRef.current = phase

  // Handle dodge on click or tap
  const handleVeilClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (phaseRef.current !== 'falling') return

    // Determine current sway direction
    const currentVelocity = Math.cos(swayTimeRef.current * 0.003)
    const dir = currentVelocity >= 0 ? 1 : -1

    // Add dodge impulse
    const impulse = dir * 65
    dodgeOffsetRef.current += impulse

    // Show brief playful feedback text
    const funnyWords = ['Ucieka! 💨', 'Ooo nie! 🤭', 'Prawie! ✨', 'Hyca! 👰‍♀️']
    const word = funnyWords[Math.floor(Math.random() * funnyWords.length)]
    setDodgeMessage(word)
    setTimeout(() => {
      setDodgeMessage(null)
    }, 700)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const veilWidth = 70
    const veilHeight = 80
    const containerHeight = container.clientHeight || 380
    const maxY = containerHeight - veilHeight

    const updateLoop = (now: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = now
      }
      const delta = Math.min(now - lastTimeRef.current, 50)
      lastTimeRef.current = now

      if (phaseRef.current === 'falling') {
        swayTimeRef.current += delta

        // Falling speed: ~48px per second
        yRef.current += (delta * 0.048)

        // Sway amplitude & rotation
        const containerWidth = container.clientWidth || 340
        const centerX = (containerWidth - veilWidth) / 2
        const swayX = Math.sin(swayTimeRef.current * 0.0028) * 65
        const rot = Math.sin(swayTimeRef.current * 0.0028) * 16

        // Bound x with dodge offset included
        let rawX = centerX + swayX + dodgeOffsetRef.current
        const minX = 8
        const maxX = containerWidth - veilWidth - 8

        if (rawX < minX) {
          rawX = minX
          dodgeOffsetRef.current = minX - centerX - swayX
        } else if (rawX > maxX) {
          rawX = maxX
          dodgeOffsetRef.current = maxX - centerX - swayX
        }

        if (yRef.current >= maxY) {
          yRef.current = maxY
          setPos({ x: rawX, y: maxY, rot: 0 })
          setPhase('at_bottom')

          // 1. Wait 1 second after hitting the bottom edge
          setTimeout(() => {
            setPhase('blurring')

            // 2. Veil blurs out and title disappears (1s transition)
            setTimeout(() => {
              setPhase('wedding_text')

              // 3. Wedding text is displayed for 2 seconds
              setTimeout(() => {
                setPhase('fading_out')

                // 4. Smooth transition to next screen
                setTimeout(() => {
                  onComplete()
                }, 400)
              }, 2000)
            }, 1000)
          }, 1000)

          return
        }

        setPos({ x: rawX, y: yRef.current, rot })
      }

      animFrameIdRef.current = requestAnimationFrame(updateLoop)
    }

    animFrameIdRef.current = requestAnimationFrame(updateLoop)

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
    }
  }, [onComplete])

  return (
    <div className="veil-game-wrapper">
      {/* Title that fades out when veil reaches bottom & blurs */}
      <p
        className={`invite-text text-center veil-title ${
          phase === 'blurring' || phase === 'wedding_text' || phase === 'fading_out'
            ? 'veil-title-hidden'
            : ''
        }`}
      >
        Złap Welon !
      </p>

      {/* Main Game Fall Area */}
      <div
        ref={containerRef}
        className="veil-fall-container"
        onTouchStart={handleVeilClick}
      >
        {/* Subtle decorative sparkles / mist in background */}
        <div className="veil-sparkle s1">✨</div>
        <div className="veil-sparkle s2">🌸</div>
        <div className="veil-sparkle s3">✨</div>

        {/* The Falling / Dodging Veil */}
        {(phase === 'falling' || phase === 'at_bottom' || phase === 'blurring') && (
          <div
            className={`veil-element ${phase === 'blurring' ? 'veil-blur-out' : ''}`}
            style={{
              transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${pos.rot}deg)`,
            }}
            onClick={handleVeilClick}
            onTouchStart={handleVeilClick}
            role="button"
            tabIndex={0}
            aria-label="Welon"
          >
            {/* Dodge Word Indicator */}
            {dodgeMessage && (
              <span className="veil-dodge-bubble">{dodgeMessage}</span>
            )}

            {/* Delicate Wedding Veil SVG */}
            <svg
              viewBox="0 0 100 110"
              width="70"
              height="77"
              className="wedding-veil-svg"
            >
              <defs>
                <linearGradient id="tulleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="40%" stopColor="#fff0f5" stopOpacity="0.82" />
                  <stop offset="100%" stopColor="#ffe4e6" stopOpacity="0.68" />
                </linearGradient>
                <filter id="veilGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="4"
                    floodColor="#f48fb1"
                    floodOpacity="0.35"
                  />
                </filter>
              </defs>

              <g filter="url(#veilGlow)">
                {/* Outer Back Layer */}
                <path
                  d="M 30 25 C 10 45, 5 75, 12 98 C 25 105, 38 95, 50 102 C 62 95, 75 105, 88 98 C 95 75, 90 45, 70 25 Z"
                  fill="url(#tulleGrad)"
                  stroke="#f8bbd0"
                  strokeWidth="1.5"
                />

                {/* Middle Tulle Layer with Lace Folds */}
                <path
                  d="M 35 27 C 20 48, 18 72, 24 92 C 34 86, 42 94, 50 88 C 58 94, 66 86, 76 92 C 82 72, 80 48, 65 27 Z"
                  fill="rgba(255, 255, 255, 0.72)"
                  stroke="#f48fb1"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />

                {/* Fold lines / soft drapery */}
                <path
                  d="M 40 28 Q 36 60 32 90"
                  stroke="rgba(244, 143, 177, 0.4)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M 50 28 Q 50 62 50 88"
                  stroke="rgba(244, 143, 177, 0.4)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M 60 28 Q 64 60 68 90"
                  stroke="rgba(244, 143, 177, 0.4)"
                  strokeWidth="1.5"
                  fill="none"
                />

                {/* Scalloped lace hem at bottom */}
                <path
                  d="M 12 98 Q 20 104 28 99 Q 36 104 44 99 Q 50 103 56 99 Q 64 104 72 99 Q 80 104 88 98"
                  stroke="#e91e63"
                  strokeWidth="1.5"
                  fill="none"
                />
              </g>

              {/* Floral Tiara / Headband */}
              <g className="veil-tiara">
                <path
                  d="M 28 25 Q 50 18 72 25"
                  stroke="#f06292"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="20" r="5" fill="#ff4081" />
                <circle cx="50" cy="20" r="2" fill="#fff" />
                <circle
                  cx="40"
                  cy="22"
                  r="3.5"
                  fill="#f8bbd0"
                  stroke="#f06292"
                  strokeWidth="1"
                />
                <circle
                  cx="60"
                  cy="22"
                  r="3.5"
                  fill="#f8bbd0"
                  stroke="#f06292"
                  strokeWidth="1"
                />
                <circle cx="32" cy="25" r="2.5" fill="#fff" />
                <circle cx="68" cy="25" r="2.5" fill="#fff" />

                <path
                  d="M 50 10 L 51 13 L 54 14 L 51 15 L 50 18 L 49 15 L 46 14 L 49 13 Z"
                  fill="#ffd54f"
                />
                <path
                  d="M 25 18 L 26 20 L 28 21 L 26 22 L 25 24 L 24 22 L 22 21 L 24 20 Z"
                  fill="#ffd54f"
                />
                <path
                  d="M 75 18 L 76 20 L 78 21 L 76 22 L 75 24 L 74 22 L 72 21 L 74 20 Z"
                  fill="#ffd54f"
                />
              </g>
            </svg>
          </div>
        )}

        {/* Center Text Transition: "Może na weselu sie uda :D" */}
        <div
          className={`wedding-reveal-message ${
            phase === 'wedding_text'
              ? 'show'
              : phase === 'fading_out'
                ? 'fade-out'
                : ''
          }`}
        >
          <span className="wedding-reveal-text">
            Może na weselu sie uda :D
          </span>
          <span className="wedding-reveal-sub">💃🥂🤵</span>
        </div>
      </div>
    </div>
  )
}
