import { useState } from 'react'

export type MuseumCheckpointModalProps = {
  doorOpening: boolean
  onEnter: () => void
  onSkip: () => void
}

export function MuseumCheckpointModal({
  doorOpening,
  onEnter,
  onSkip,
}: MuseumCheckpointModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div
      className="game-overlay museum-entrance-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Otwierające się drzwi i ściemnienie ekranu */}
      <div className={`museum-cinematic-doors ${doorOpening ? 'doors-open-anim' : ''}`}>
        <div className="museum-door-leaf leaf-left" />
        <div className="museum-door-leaf leaf-right" />
        <div className="screen-dark-fade" />
      </div>

      <div className="museum-entrance-card">
        <span className="checkpoint-badge museum-badge">Checkpoint • Wrota Muzeum 🏛️</span>
        <div className="museum-image-wrapper">
          {!imageLoaded && (
            <div className="museum-image-spinner-wrapper" aria-hidden="true">
              <div className="museum-golden-spinner" />
              <span className="museum-spinner-text">Wczytywanie wrót muzeum...</span>
            </div>
          )}
          <img
            src="/muzeum-wejscie.jpg"
            alt="Wejście do Muzeum Tajemnic"
            className={`museum-entrance-img ${imageLoaded ? 'img-loaded' : 'img-loading'}`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        <h3 className="modal-heading museum-title">Dotarłaś do muzeum</h3>
        <p className="modal-text museum-text">
          Wiosenny wiatr i zimowy mróz pokonane! Przed Tobą wejście do Muzeum Tajemnic. W środku gra jazzowa muzyka, a w głębi komnat czeka złoty sarkofag!
        </p>

        <div className="modal-actions-column">
          <button
            type="button"
            className="game-primary-btn museum-enter-btn"
            onClick={onEnter}
            disabled={doorOpening}
          >
            Wejdź 🗝️
          </button>
          <button
            type="button"
            className="game-skip-btn"
            onClick={onSkip}
            disabled={doorOpening}
          >
            Pomiń etap ⏭️
          </button>
        </div>
      </div>
    </div>
  )
}
