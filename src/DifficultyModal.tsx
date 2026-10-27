import type { Difficulty, DifficultyConfig } from './VeilGame'

type DifficultyModalProps = {
  difficulty: Difficulty
  difficultyConfigs: Record<Difficulty, DifficultyConfig>
  onSelectDifficulty: (difficulty: Difficulty) => void
  onStartGame: () => void
  soundMuted: boolean
  onToggleSound: () => void
}

export default function DifficultyModal({
  difficulty,
  difficultyConfigs,
  onSelectDifficulty,
  onStartGame,
  soundMuted,
  onToggleSound,
}: DifficultyModalProps) {
  const difficultyKeys: Difficulty[] = ['easy', 'medium', 'hard']

  return (
    <div className="game-overlay difficulty-modal-overlay">
      <div className="difficulty-modal-card" role="dialog" aria-modal="true" aria-labelledby="difficulty-modal-title">
        {/* Górny pasek modala z wyciszeniem dźwięku */}
        <div className="difficulty-modal-header">
          <span className="difficulty-modal-badge">Przygotowanie do gry</span>
          <button
            type="button"
            className="game-audio-btn difficulty-audio-btn"
            onClick={onToggleSound}
            aria-label={soundMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
            title={soundMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* Tytuł i opis */}
        <div className="difficulty-modal-intro">
          <h3 id="difficulty-modal-title" className="difficulty-modal-heading">
            Wybierz poziom trudności
          </h3>
          <p className="difficulty-modal-subtext">
            Steruj strzałkami lub tapuj lewą i prawą stronę ekranu. Omijaj przeszkody i zbieraj złote litery.
          </p>
        </div>

        {/* Karty wyboru poziomu trudności z wyraźnym podświetleniem */}
        <div className="difficulty-cards-list" role="radiogroup" aria-label="Poziomy trudności">
          {difficultyKeys.map((key) => {
            const config = difficultyConfigs[key]
            const isSelected = difficulty === key

            return (
              <button
                key={key}
                type="button"
                className={`difficulty-card-item ${key} ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectDifficulty(key)}
                role="radio"
                aria-checked={isSelected}
              >
                <div className="difficulty-card-content">
                  <div className="difficulty-card-title-row">
                    <span className="difficulty-card-name">{config.label}</span>
                    {isSelected && (
                      <span className="difficulty-selected-pill">Wybrany</span>
                    )}
                  </div>
                  <p className="difficulty-card-desc">{config.description}</p>
                </div>

                <div className="difficulty-radio-indicator" aria-hidden="true">
                  <div className="difficulty-radio-dot" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Przyciski akcji */}
        <div className="difficulty-modal-actions">
          <button
            type="button"
            className="game-primary-btn difficulty-start-btn"
            onClick={onStartGame}
          >
            Wyruszmy na przygodę
          </button>
        </div>
      </div>
    </div>
  )
}
