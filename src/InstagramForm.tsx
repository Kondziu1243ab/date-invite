import { useState, useEffect } from 'react'

type DeliveryProps = {
  onComplete: (info?: string) => void
}

type AnimStage = 'idle' | 'packing_backpack' | 'riding' | 'packing_envelope' | 'flying' | 'done'

export default function InstagramForm({ onComplete }: DeliveryProps) {
  const [animStage, setAnimStage] = useState<AnimStage>('idle')
  const [flapClosed, setFlapClosed] = useState(false)

  const handleStartDelivery = () => {
    if (animStage !== 'idle') return
    setAnimStage('packing_backpack')
  }

  useEffect(() => {
    if (animStage === 'packing_backpack') {
      // 1. Tosty & Bimber float into ludzik's backpack (1.9s)
      const t = setTimeout(() => {
        setAnimStage('riding')
      }, 1900)
      return () => clearTimeout(t)
    }

    if (animStage === 'riding') {
      // 2. Ludzik rides Honda motorcycle smoothly across the screen (4.0s)
      const t = setTimeout(() => {
        setAnimStage('packing_envelope')
      }, 4000)
      return () => clearTimeout(t)
    }

    if (animStage === 'packing_envelope') {
      // 3. Bike stops near envelope, items pop into envelope (2.2s)
      const flapT = setTimeout(() => {
        setFlapClosed(true)
      }, 1200)

      const stageT = setTimeout(() => {
        setAnimStage('flying')
      }, 2200)

      return () => {
        clearTimeout(flapT)
        clearTimeout(stageT)
      }
    }

    if (animStage === 'flying') {
      // 4. Envelope launches into sky with goodies (1.8s)
      const t = setTimeout(() => {
        setAnimStage('done')
        onComplete('Wysłano pakiet dobroci: chrupiące tosty + kieliszek bimbru 70%!')
      }, 1800)
      return () => clearTimeout(t)
    }
  }, [animStage, onComplete])

  return (
    <div className="instagram-step delivery-step">
      <p className="invite-text text-center delivery-headline">
        Przesyłam parę dobroci, żebyś miała energię na jutro!
      </p>


      {/* Animation Stage Container */}
      <div className="anim-stage-container">
        {/* Background decorative floaters */}
        <div className="anim-bg-elements">
          <span className="bg-heart heart-1">✨</span>
          <span className="bg-heart heart-2">💛</span>
          <span className="bg-heart heart-3">🥪</span>
        </div>

        {/* Road line effect */}
        <div className={`road-strip ${animStage === 'riding' ? 'road-moving' : ''}`} />

        {/* Floating Tosty */}
        <div className={`floating-delivery-item floating-tosty stage-${animStage}`}>
          <img src="/tosty.svg" alt="Tosty" className="goodie-img tosty-img" />
          <span className="goodie-badge">Tosty 🥪</span>
        </div>

        {/* Floating Bimber Glass */}
        <div className={`floating-delivery-item floating-bimber stage-${animStage}`}>
          <img src="/bimber.svg" alt="Kieliszek bimbru" className="goodie-img bimber-img" />
          <span className="goodie-badge bimber-badge">Bimber 70% 🥃</span>
        </div>

        {/* Character Mounted on Honda Motorcycle */}
        <div className={`rider-bike-group stage-${animStage}`}>
          {/* SVG Character (Ludzik) with Helmet & Backpack */}
          <div className="ludzik-biker">
            <svg viewBox="0 0 100 120" width="65" height="78" className="ludzik-svg">
              {/* Backpack on back */}
              <g className={`backpack-group ${animStage !== 'idle' ? 'backpack-packed' : ''}`}>
                <rect x="10" y="50" width="26" height="36" rx="8" fill="#e91e63" stroke="#880e4f" strokeWidth="3" />
                <rect x="14" y="66" width="18" height="15" rx="4" fill="#ff4081" stroke="#880e4f" strokeWidth="2" />
                <path d="M 28 52 Q 34 48 36 54" stroke="#880e4f" strokeWidth="3" fill="none" />
              </g>

              {/* Feet / Legs positioned on motorcycle */}
              <ellipse cx="45" cy="106" rx="7" ry="4" fill="#3d3a36" className="foot left-foot" />
              <ellipse cx="62" cy="106" rx="7" ry="4" fill="#3d3a36" className="foot right-foot" />

              {/* Body */}
              <rect x="30" y="45" width="38" height="52" rx="19" fill="#fff" stroke="#3d3a36" strokeWidth="4" />

              {/* Helmet */}
              <path d="M 26 48 C 26 24, 74 24, 74 48 Z" fill="#ff4081" stroke="#3d3a36" strokeWidth="4" />
              {/* Visor */}
              <path d="M 40 38 Q 65 38 68 46 L 40 46 Z" fill="#263238" opacity="0.85" />

              {/* Eyes */}
              <circle cx="43" cy="62" r="3.5" fill="#3d3a36" />
              <circle cx="57" cy="62" r="3.5" fill="#3d3a36" />
              {/* Blush */}
              <circle cx="37" cy="68" r="3" fill="#f48fb1" opacity="0.6" />
              <circle cx="63" cy="68" r="3" fill="#f48fb1" opacity="0.6" />
              {/* Smile */}
              <path d="M 46 69 Q 50 73 54 69" fill="none" stroke="#3d3a36" strokeWidth="2.5" strokeLinecap="round" />

              {/* Arms */}
              <path d="M 32 60 Q 18 68 24 78" fill="none" stroke="#3d3a36" strokeWidth="4" strokeLinecap="round" className="arm left-arm" />
              <path d="M 66 60 Q 82 66 84 76" fill="none" stroke="#3d3a36" strokeWidth="4" strokeLinecap="round" className="arm right-arm" />
            </svg>
          </div>

          {/* Honda Motorcycle */}
          <img src="/honda.png" alt="Honda Motorcycle" className="honda-bike-img" />
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
                {/* Cute heart seal */}
                <path d="M 40 28 C 38 24, 34 24, 34 27 C 34 30, 40 34, 40 34 C 40 34, 46 30, 46 27 C 46 24, 42 24, 40 28 Z" fill="#e91e63" />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Action Button & Status */}
      <div className={`delivery-action-wrap ${animStage !== 'idle' ? 'in-progress' : ''}`}>
        <button
          type="button"
          onClick={handleStartDelivery}
          className="btn btn-umow btn-delivery-action"
          disabled={animStage !== 'idle'}
        >
          {animStage === 'idle' && 'Wyślij!'}
          {animStage === 'packing_backpack' && 'Pakowanie do plecaka... 🎒'}
          {animStage === 'riding' && 'Dostawa w toku... 🏍️'}
          {animStage === 'packing_envelope' && 'Pakowanie przesyłki... ✉️'}
          {animStage === 'flying' && 'Przesyłka w drodze do Ciebie! '}
          {animStage === 'done' && 'Dostarczono! '}
        </button>
      </div>
    </div>
  )
}
