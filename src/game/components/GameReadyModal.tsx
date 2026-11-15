import type { Difficulty } from '../types'
import { DIFFICULTY_CONFIGS } from '../constants'

export type GameReadyModalProps = {
  difficulty: Difficulty
  soundMuted: boolean
  onSelectDifficulty: (difficulty: Difficulty) => void
  onToggleSound: () => void
  onStart: () => void
  onSkip?: () => void
}

export function GameReadyModal({
  difficulty,
  soundMuted,
  onSelectDifficulty,
  onToggleSound,
  onStart,
}: GameReadyModalProps) {
  return (
    <div className="game-overlay">
      <div className="game-modal-card">
        <div className="modal-top-corner-actions">
          <button
            type="button"
            className="game-audio-btn modal-audio-btn"
            onClick={onToggleSound}
            aria-label={soundMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
            title={soundMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="scarab-avatar-icon">🪲✨</div>
        <h3 className="modal-heading">Skarabeusz musi dostać się do muzeum, wyruszmy na przygodę!</h3>
        <p className="modal-text">
          Steruj za pomocą strzałek lub tapując lewą/prawą stronę ekranu.
          Omijaj przeszkody, zbieraj złote runy z literami i otwórz pradawny sarkofag!
        </p>

        <div className="game-difficulty-selector" aria-label="Wybór poziomu trudności">
          <p className="game-difficulty-title">Wybierz poziom trudności</p>
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

        <div className="game-difficulty-selected-description" aria-live="polite">
          <span className="game-difficulty-selected-icon" aria-hidden="true">
            {DIFFICULTY_CONFIGS[difficulty].emoji}
          </span>
          <span>{DIFFICULTY_CONFIGS[difficulty].description}</span>
        </div>

        <div className="modal-actions-column">
          <button type="button" className="game-primary-btn" onClick={onStart}>
            Wyruszmy na przygodę 🪲
          </button>
        </div>
      </div>
    </div>
  )
}
