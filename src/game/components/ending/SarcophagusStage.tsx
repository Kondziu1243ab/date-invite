import type { Difficulty, EndingPhase, SecretLetter } from '../../types'
import { DIFFICULTY_CONFIGS, FLIGHT_PATHS, SECRET_LETTERS } from '../../constants'

export type SarcophagusStageProps = {
  endingPhase: EndingPhase
  difficulty: Difficulty
  collectedLetters: SecretLetter[]
  skyLetters: SecretLetter[]
  placedCollectedIds: number[]
  activeFlyingId: number | null
  showGrayout: boolean
  isFlashing: boolean
  onInsertKey: () => void
  onContinue: () => void
}

export function SarcophagusStage({
  endingPhase,
  difficulty,
  collectedLetters,
  skyLetters,
  placedCollectedIds,
  activeFlyingId,
  showGrayout,
  isFlashing,
  onInsertKey,
  onContinue,
}: SarcophagusStageProps) {
  const isLidOpen = endingPhase === 'flying_letters' || endingPhase === 'complete'
  const isLidOpening = endingPhase === 'sarcophagus_opening'
  const isLocked = endingPhase === 'sarcophagus_locked'
  const isInsertingKey = endingPhase === 'key_inserting'

  return (
    <div className="sarcophagus-cinematic-stage">
      <div className="sarcophagus-header">
        <div className="sarcophagus-score-pill">
          <span className="score-icon">📜</span>
          <span className="score-text">
            Zebrane litery: <strong>{collectedLetters.length} / 12</strong>
          </span>
        </div>
        <span className="sarcophagus-stage-badge">Złoty Sarkofag Faraona ✨</span>
        <h2 className="sarcophagus-title">
          {endingPhase === 'complete'
            ? 'Hasło Odkryte!'
            : isLocked || isInsertingKey
              ? 'Złoty Sarkofag Faraona'
              : 'Sarkofag staje otworem...'}
        </h2>
        <p className="sarcophagus-flight-info-banner">
          {endingPhase === 'complete'
            ? 'Wszystkie złote litery połączyły się w proroctwo!'
            : isLocked
              ? 'Kliknij zamek sarkofagu, aby włożyć klucz! 🗝️✨'
              : isInsertingKey
                ? 'Przekręcanie złotego klucza w zamku... 🗝️✨'
                : '✨ Twoje zebrane litery unoszą się w powietrzu i wlatują do sarkofagu! ✨'}
        </p>
      </div>

      {/* Chmurka liter wiszących w powietrzu przed przelotem (w losowym układzie) */}
      {endingPhase !== 'complete' && (
        <div className="floating-letters-sky-cluster">
          <span className="sky-cluster-label">
            Zdobyte litery w powietrzu ({collectedLetters.length}/12):
          </span>
          <div className="sky-cluster-chips">
            {skyLetters.length === 0 ? (
              <span className="sky-empty-hint">Brak zdobytych liter – sarkofag sam uzupełni runy</span>
            ) : (
              skyLetters.map((item, idx) => {
                const hasFlown = placedCollectedIds.includes(item.id)
                const isCurrentlyFlying = activeFlyingId === item.id

                return (
                  <div
                    key={`sky-${item.id}-${idx}`}
                    className={`sky-letter-chip chip-gold ${hasFlown ? 'chip-departed' : ''} ${isCurrentlyFlying ? 'chip-launching' : ''}`}
                    style={{ animationDelay: `${(idx % 5) * 0.22}s` }}
                  >
                    {item.char}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Widok Sarkofagu w 3D */}
      <div className="sarcophagus-3d-wrapper">
        <div
          className={`sarcophagus-3d-box ${isLidOpen ? 'lid-opened' : ''} ${isLidOpening ? 'lid-animating-open' : ''} ${isFlashing ? 'sarcophagus-flashing' : ''} ${isLocked ? 'sarcophagus-locked' : ''}`}
        >
          {/* Złote wieko sarkofagu */}
          <div
            className={`sarcophagus-lid ${isLocked ? 'lid-clickable' : ''}`}
            onClick={isLocked ? onInsertKey : undefined}
            title={isLocked ? 'Kliknij, aby włożyć klucz' : undefined}
          >
            <div className="lid-pharaoh-face">👑</div>
            <div className="lid-gold-ornament" />

            {/* Zamek z dziurką na klucz na wieku */}
            {(isLocked || isInsertingKey) && (
              <div
                className={`lid-keyhole-lock ${isLocked ? 'lock-clickable' : ''}`}
                aria-label="Zamek sarkofagu - kliknij, aby włożyć klucz"
                role={isLocked ? 'button' : undefined}
                tabIndex={isLocked ? 0 : undefined}
                onClick={(e) => {
                  if (isLocked) {
                    e.stopPropagation()
                    onInsertKey()
                  }
                }}
                onKeyDown={(e) => {
                  if (isLocked && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onInsertKey()
                  }
                }}
              >
                <div className="keyhole-slot" />
              </div>
            )}
          </div>

          {/* Animacja wsadzania i przekręcania klucza */}
          {isInsertingKey && (
            <div className="sarcophagus-key-animation-zone" aria-hidden="true">
              <div className="sarcophagus-golden-key-actor">🗝️</div>
            </div>
          )}

          {/* Wnętrze sarkofagu ze slotami na litery */}
          <div className="sarcophagus-interior">
            <div className="sarcophagus-glow-aura" />

            <div className="sarcophagus-words-container">
              {/* Word 1: JESTEŚ (slots 0..5) */}
              <div className="sarcophagus-word word-1">
                {SECRET_LETTERS.slice(0, 6).map((letter, idx) => {
                  const isPlaced = placedCollectedIds.includes(letter.id)
                  const isFlying = activeFlyingId === letter.id
                  const p = FLIGHT_PATHS[idx]

                  return (
                    <div key={letter.id} className="sarcophagus-slot">
                      {isFlying || isPlaced ? (
                        <span
                          className={`slot-gold-letter letter-was-collected ${isFlying ? 'dynamic-swoop-in' : 'letter-settled'}`}
                          style={{
                            ['--start-x' as string]: `${p.startX}px`,
                            ['--start-y' as string]: `${p.startY}px`,
                            ['--mid-x' as string]: `${p.midX}px`,
                            ['--mid-y' as string]: `${p.midY}px`,
                            ['--rot' as string]: `${p.rot}deg`,
                          }}
                        >
                          {letter.char}
                        </span>
                      ) : showGrayout ? (
                        <span
                          className="slot-gold-letter letter-grayout scale-up-reveal"
                          style={{ animationDelay: `${(idx % 6) * 0.12}s` }}
                        >
                          {letter.char}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              <div className="sarcophagus-word-divider" />

              {/* Word 2: SŁODKA (slots 6..11) */}
              <div className="sarcophagus-word word-2">
                {SECRET_LETTERS.slice(6, 12).map((letter, idx) => {
                  const slotGlobalIndex = 6 + idx
                  const isPlaced = placedCollectedIds.includes(letter.id)
                  const isFlying = activeFlyingId === letter.id
                  const p = FLIGHT_PATHS[slotGlobalIndex]

                  return (
                    <div key={letter.id} className="sarcophagus-slot">
                      {isFlying || isPlaced ? (
                        <span
                          className={`slot-gold-letter letter-was-collected ${isFlying ? 'dynamic-swoop-in' : 'letter-settled'}`}
                          style={{
                            ['--start-x' as string]: `${p.startX}px`,
                            ['--start-y' as string]: `${p.startY}px`,
                            ['--mid-x' as string]: `${p.midX}px`,
                            ['--mid-y' as string]: `${p.midY}px`,
                            ['--rot' as string]: `${p.rot}deg`,
                          }}
                        >
                          {letter.char}
                        </span>
                      ) : showGrayout ? (
                        <span
                          className="slot-gold-letter letter-grayout scale-up-reveal"
                          style={{ animationDelay: `${(idx % 6) * 0.12}s` }}
                        >
                          {letter.char}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {endingPhase === 'complete' && (
        <div className="sarcophagus-celebration-footer">
          <div className="sarcophagus-final-count-badge">
            🏆 Zdobyłaś <strong>{collectedLetters.length} / 12</strong> liter na poziomie {DIFFICULTY_CONFIGS[difficulty].label}!
          </div>
          <button
            type="button"
            className="btn btn-tak btn-kontynuujmy"
            onClick={onContinue}
          >
            Kontynuujmy ✨
          </button>
        </div>
      )}
    </div>
  )
}
