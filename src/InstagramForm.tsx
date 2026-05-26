import { useState, useEffect } from 'react'

type InstagramFormProps = {
  onComplete: (instagram: string) => void
}

type AnimStage = 'idle' | 'entering' | 'grabbing' | 'walking' | 'packing' | 'flying' | 'done'

export default function InstagramForm({ onComplete }: InstagramFormProps) {
  const [instagram, setInstagram] = useState('')
  const [error, setError] = useState('')
  const [animStage, setAnimStage] = useState<AnimStage>('idle')
  const [floatingText, setFloatingText] = useState('')
  const [flapClosed, setFlapClosed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanInsta = instagram.trim()
    if (!cleanInsta) {
      setError('Podaj nazwę swojego profilu!')
      return
    }
    setError('')
    setFloatingText(cleanInsta.startsWith('@') ? cleanInsta : `@${cleanInsta}`)
    setAnimStage('entering')
  }

  useEffect(() => {
    if (animStage === 'entering') {
      // 1. Ludzik enters from left. Walks to grabbing spot in 1.2s.
      const t = setTimeout(() => {
        setAnimStage('grabbing')
      }, 1200)
      return () => clearTimeout(t)
    }

    if (animStage === 'grabbing') {
      // 2. Ludzik reaches input. The input text clears. The text bubble pops up.
      setInstagram('') // Clear/reset input field!
      const t = setTimeout(() => {
        setAnimStage('walking')
      }, 600)
      return () => clearTimeout(t)
    }

    if (animStage === 'walking') {
      // 3. Ludzik walks to the right to the envelope. Takes 1.2s.
      const t = setTimeout(() => {
        setAnimStage('packing')
      }, 1200)
      return () => clearTimeout(t)
    }

    if (animStage === 'packing') {
      // 4. Ludzik stops, packs the bubble into the envelope.
      // Text scales down & disappears inside the envelope pocket.
      // After 500ms, flap folds closed.
      const flapT = setTimeout(() => {
        setFlapClosed(true)
      }, 500)

      // After 1000ms, transition to flying.
      const stageT = setTimeout(() => {
        setAnimStage('flying')
      }, 1000)

      return () => {
        clearTimeout(flapT)
        clearTimeout(stageT)
      }
    }

    if (animStage === 'flying') {
      // 5. Envelope flies away up-right (1.2s). Ludzik waves goodbye.
      const t = setTimeout(() => {
        setAnimStage('done')
        onComplete(floatingText)
      }, 1200)
      return () => clearTimeout(t)
    }
  }, [animStage, floatingText, onComplete])

  const isWalking = animStage === 'entering' || animStage === 'walking'

  return (
    <div className="instagram-step">
      <p className="invite-text text-center">
        Teraz tylko podaj mi swojego insta
      </p>

      {/* Animation Stage */}
      <div className="anim-stage-container">
        {/* Decorative background hearts/stars */}
        <div className="anim-bg-elements">
          <span className="bg-heart heart-1">❤️</span>
          <span className="bg-heart heart-2">💖</span>
          <span className="bg-heart heart-3">✨</span>
        </div>

        {/* Floating Instagram Text Bubble */}
        {animStage !== 'idle' && (
          <div className={`floating-text-bubble stage-${animStage}`}>
            {floatingText}
          </div>
        )}

        {/* Ludzik (Character) SVG */}
        <div className={`ludzik stage-${animStage} ${isWalking ? 'walking-anim' : ''}`}>
          <svg viewBox="0 0 100 120" width="70" height="84" className="ludzik-svg">
            {/* Feet */}
            <ellipse cx="40" cy="110" rx="8" ry="4" fill="#3d3a36" className="foot left-foot" />
            <ellipse cx="60" cy="110" rx="8" ry="4" fill="#3d3a36" className="foot right-foot" />
            {/* Body (pill shape) */}
            <rect x="30" y="45" width="40" height="55" rx="20" fill="#fff" stroke="#3d3a36" strokeWidth="4" />
            {/* Eyes */}
            <circle cx="43" cy="65" r="3.5" fill="#3d3a36" />
            <circle cx="57" cy="65" r="3.5" fill="#3d3a36" />
            {/* blush */}
            <circle cx="37" cy="72" r="3.5" fill="#f48fb1" opacity="0.6" />
            <circle cx="63" cy="72" r="3.5" fill="#f48fb1" opacity="0.6" />
            {/* Cute smile */}
            <path d="M 46 73 Q 50 77 54 73" fill="none" stroke="#3d3a36" strokeWidth="2.5" strokeLinecap="round" />
            {/* Left Arm */}
            <path d="M 28 65 Q 16 70 20 80" fill="none" stroke="#3d3a36" strokeWidth="4" strokeLinecap="round" className="arm left-arm" />
            {/* Right Arm */}
            <path d="M 72 65 Q 84 70 80 80" fill="none" stroke="#3d3a36" strokeWidth="4" strokeLinecap="round" className="arm right-arm" />
          </svg>
        </div>

        {/* Envelope SVG Wrapper */}
        <div className={`envelope-wrapper stage-${animStage}`}>
          <svg viewBox="0 0 80 60" width="60" height="45" className="envelope-svg">
            {/* Envelope Back */}
            <rect x="2" y="15" width="76" height="43" rx="4" fill="#ffccd5" stroke="#e91e63" strokeWidth="3" />
            {/* Left and right folds (front pocket) */}
            <path d="M 2 58 L 40 35 L 78 58 Z" fill="#ffb3c1" stroke="#e91e63" strokeWidth="2" />
            <path d="M 2 15 L 40 38 L 2 58 Z" fill="#ffa6c9" stroke="#e91e63" strokeWidth="2" />
            <path d="M 78 15 L 40 38 L 78 58 Z" fill="#ffa6c9" stroke="#e91e63" strokeWidth="2" />
            
            {/* Open Flap */}
            {!flapClosed && (
              <path d="M 2 15 L 40 -3 L 78 15 Z" fill="#ff85a1" stroke="#e91e63" strokeWidth="3" strokeLinejoin="round" className="envelope-flap-open" />
            )}
            
            {/* Closed Flap */}
            {flapClosed && (
              <>
                <path d="M 2 15 L 40 35 L 78 15 Z" fill="#ff85a1" stroke="#e91e63" strokeWidth="3" strokeLinejoin="round" className="envelope-flap-closed" />
                {/* Cute little heart seal */}
                <path d="M 40 28 C 38 24, 34 24, 34 27 C 34 30, 40 34, 40 34 C 40 34, 46 30, 46 27 C 46 24, 42 24, 40 28 Z" fill="#e91e63" />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Input Form Fields (Instagram Username) */}
      <form onSubmit={handleSubmit} className={`insta-form-fields ${animStage !== 'idle' ? 'faded' : ''}`}>
        <div className="form-field">
          <input
            type="text"
            className="form-input text-center"
            placeholder="@twoj_instagram"
            value={instagram}
            onChange={(e) => {
              setInstagram(e.target.value)
              setError('')
            }}
            disabled={animStage !== 'idle'}
            autoFocus
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button
          type="submit"
          className="btn btn-umow btn-insta-submit"
          disabled={animStage !== 'idle'}
        >
          Gotowe
        </button>
      </form>
    </div>
  )
}
