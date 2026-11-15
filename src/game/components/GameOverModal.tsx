import type { Difficulty } from '../types'
import { DIFFICULTY_CONFIGS } from '../constants'

export type GameOverModalProps = {
  hasCheckpoint: boolean
  difficulty: Difficulty
  onSelectDifficulty: (difficulty: Difficulty) => void
  onResumeCheckpoint: () => void
  onRestart: () => void
  onSkip: () => void
}

export function GameOverModal({
  hasCheckpoint,
  difficulty,
  onSelectDifficulty,
  onResumeCheckpoint,
  onRestart,
  onSkip,
}: GameOverModalProps) {
  return (
    <div className="game-overlay">
      <div className="game-modal-card">
        <h3 className="modal-heading">Koniec lotu!</h3>
        <p className="modal-text">
          {hasCheckpoint
            ? 'Możesz wznowić grę bezpośrednio od wejścia do Muzeum!'
            : 'Skarabeusz może spróbować ponownie od początku.'}
        </p>

        <div
          className="game-difficulty-selector gameover-difficulty-selector"
          aria-label="Zmień poziom trudności"
        >
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
                  onClick={() => onSelectDifficulty(key)}
                  aria-pressed={selected}
                >
                  <span className="game-difficulty-emoji" aria-hidden="true">{config.emoji}</span>
                  <span className="game-difficulty-label">{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="modal-actions-column">
          {hasCheckpoint ? (
            <>
              <button
                type="button"
                className="game-primary-btn"
                onClick={onResumeCheckpoint}
              >
                Wróć do Muzeum 🏛️
              </button>
              <button
                type="button"
                className="game-subtle-btn"
                onClick={onRestart}
              >
                Od początku 🪲
              </button>
            </>
          ) : (
            <button
              type="button"
              className="game-primary-btn"
              onClick={onRestart}
            >
              Spróbuj ponownie ↺
            </button>
          )}
          <button
            type="button"
            className="game-skip-btn"
            onClick={onSkip}
          >
            Pomiń etap ⏭️
          </button>
        </div>
      </div>
    </div>
  )
}
