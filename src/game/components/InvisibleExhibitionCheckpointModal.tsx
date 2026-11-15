import { useState } from 'react'

export type InvisibleExhibitionCheckpointModalProps = {
  onEnter: () => void
  onSkip: () => void
}

export function InvisibleExhibitionCheckpointModal({
  onEnter,
  onSkip,
}: InvisibleExhibitionCheckpointModalProps) {
  const [fadingIn, setFadingIn] = useState(false)

  const handleEnterClick = () => {
    setFadingIn(true)
    setTimeout(() => {
      onEnter()
    }, 700)
  }

  return (
    <div
      className={`game-overlay exhibition-entrance-overlay ${fadingIn ? 'fade-to-black' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="exhibition-entrance-card">
        <span className="checkpoint-badge exhibition-badge">Checkpoint • Niewidzialna Wystawa 🕶️🕯️</span>

        <div className="exhibition-visual-banner" aria-hidden="true">
          <div className="exhibition-glow-circle">
            <span className="exhibition-center-icon">🪲</span>
          </div>
          <div className="exhibition-eyes-preview">
            <span className="eye-glow left-eye" />
            <span className="eye-glow right-eye" />
          </div>
        </div>

        <h3 className="modal-heading exhibition-title">Wkraczasz w całkowity mrok</h3>
        <p className="modal-text exhibition-text">
          Światła gasną... Przed Tobą niezwykła przestrzeń Niewidzialnej Wystawy!
          Złoty chrabąszcz emituje poświatę rozświetlającą drogę wokół niego.
          Uważaj na ślepia nietoperza czające się w ciemności i spadające czarne okulary!
        </p>

        <div className="modal-actions-column">
          <button
            type="button"
            className="game-primary-btn exhibition-enter-btn"
            onClick={handleEnterClick}
            disabled={fadingIn}
          >
            Wejdź w mrok 🕯️
          </button>
          <button
            type="button"
            className="game-skip-btn"
            onClick={onSkip}
            disabled={fadingIn}
          >
            Pomiń etap ⏭️
          </button>
        </div>
      </div>
    </div>
  )
}
