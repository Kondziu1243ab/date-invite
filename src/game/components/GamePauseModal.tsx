export type GamePauseModalProps = {
  onResume: () => void
  onSkip: () => void
}

export function GamePauseModal({ onResume, onSkip }: GamePauseModalProps) {
  return (
    <div className="game-overlay">
      <div className="game-modal-card">
        <h3 className="modal-heading">Pauza</h3>
        <p className="modal-text">Złap oddech i przygotuj się na kolejny etap przygody.</p>
        <div className="modal-actions-column">
          <button type="button" className="game-primary-btn" onClick={onResume}>
            Wznów grę
          </button>
          <button type="button" className="game-skip-btn" onClick={onSkip}>
            Pomiń etap ⏭️
          </button>
        </div>
      </div>
    </div>
  )
}
