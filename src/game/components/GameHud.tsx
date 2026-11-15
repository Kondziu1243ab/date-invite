import type { BiomeId, Difficulty, SecretLetter } from '../types'
import { getBiomesForDifficulty } from '../constants'

export type GameHudProps = {
  lives: number
  biome: BiomeId
  difficulty: Difficulty
  soundMuted: boolean
  isPauseDisabled: boolean
  isPaused: boolean
  progress: number
  collectedLetters: SecretLetter[]
  hasDiamondCard?: boolean
  onToggleSound: () => void
  onTogglePause: () => void
  onSkip?: () => void
}

export function GameHud({
  lives,
  biome,
  difficulty,
  soundMuted,
  isPauseDisabled,
  isPaused,
  progress,
  collectedLetters,
  hasDiamondCard,
  onToggleSound,
  onTogglePause,
  onSkip,
}: GameHudProps) {
  const biomes = getBiomesForDifficulty(difficulty)
  const stageLabel = biomes.find((item) => item.id === biome)?.label ?? biomes[0].label

  const isSkipDisabled = isPauseDisabled || (biome === 'spring' && progress < 3)

  return (
    <>
      <div className="game-top-bar">
        <div className="game-lives" aria-label={`Pozostałe życia: ${lives}`}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span
              key={index}
              className={`game-heart ${index < lives ? 'heart-alive' : 'heart-lost'}`}
            >
              {index < lives ? '❤️' : '🖤'}
            </span>
          ))}
        </div>

        <span className="game-stage-pill">{stageLabel}</span>

        <div className="game-top-actions">
          <button
            type="button"
            className="game-audio-btn"
            onClick={onToggleSound}
            aria-label={soundMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
            title={soundMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            className="game-pause-btn"
            onClick={onTogglePause}
            disabled={isPauseDisabled}
          >
            {isPaused ? 'Wznów' : 'Pauza'}
          </button>
          {onSkip && (
            <button
              type="button"
              className="game-skip-hud-btn"
              onClick={onSkip}
              disabled={isSkipDisabled}
              title={
                biome === 'spring' && progress < 3
                  ? 'Pomiń etap (dostępne po chwili lotu)'
                  : 'Pomiń etap'
              }
            >
              Pomiń ⏭️
            </button>
          )}
        </div>
      </div>

      <div className="game-progress-wrapper">
        <div className="game-progress-bar">
          <div className="game-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="game-letter-counter">
          ✨ {collectedLetters.length}/12
        </span>
        <span className="game-goal-icon">🏛️</span>
      </div>

      {/* Zebrane litery w locie */}
      <div className="game-letters-shelf" aria-label="Zebrane litery w locie">
        <span className="letters-shelf-title">Zebrane litery:</span>
        <div className="letters-shelf-chips">
          {collectedLetters.length === 0 ? (
            <span className="shelf-empty-hint">Łap złote runy z literami!</span>
          ) : (
            collectedLetters.map((item, idx) => (
              <span key={`${item.id}-${idx}`} className="letter-shelf-chip pop-in">
                {item.char}
              </span>
            ))
          )}
        </div>
        {hasDiamondCard && (
          <div className="game-card-collected-chip pop-in" title="Szczęśliwa Dama Karo – przyda się u Dżina!">
            <img src="./dama.jpg" alt="Dama Karo" className="card-chip-img" />
            <span className="card-chip-text">Dama Karo</span>
          </div>
        )}
      </div>
    </>
  )
}
