import { useEffect, useState } from 'react'
import type { EndingPhase, GenieMood } from '../../types'
import { GenieActor } from './GenieActor'

export type Question1Option = 'bramkarz' | 'napastnik' | 'obronca'
export type Question2Option = 'na_moim' | 'silka' | 'podroze' | 'gry'

export type GuardianRiddleModalProps = {
  endingPhase: EndingPhase
  guardianHearts: number
  currentQuestion: number
  genieMood: GenieMood
  speechText: string | null
  selectedHotValue: number | null
  hasDiamondCard?: boolean
  isCardConsumed?: boolean
  isCardActiveOnCurrentQuestion?: boolean
  isCardUsedOnQuestion?: boolean
  onUseDiamondCard?: () => void
  onStartQuestions: () => void
  onAnswerQuestion1: (option: Question1Option) => void
  onAnswerQuestion2: (option: Question2Option) => void
  onAnswerHotQuestion: (value: number) => void
  onReturnToMuseum?: () => void
}

export function GuardianRiddleModal({
  endingPhase,
  guardianHearts,
  currentQuestion,
  genieMood,
  speechText,
  selectedHotValue,
  hasDiamondCard,
  isCardConsumed = false,
  isCardActiveOnCurrentQuestion,
  isCardUsedOnQuestion,
  onUseDiamondCard,
  onStartQuestions,
  onAnswerQuestion1,
  onAnswerQuestion2,
  onAnswerHotQuestion,
  onReturnToMuseum,
}: GuardianRiddleModalProps) {
  const [selectedQ1, setSelectedQ1] = useState<Question1Option | null>(null)
  const [selectedQ2, setSelectedQ2] = useState<Question2Option | null>(null)
  const [isPending, setIsPending] = useState(false)

  const isCardActive = isCardActiveOnCurrentQuestion ?? isCardUsedOnQuestion ?? false

  // Reset wyboru i blokady po powrocie Dżina do stanu spoczynku
  useEffect(() => {
    if (genieMood === 'idle') {
      setIsPending(false)
      setSelectedQ1(null)
      setSelectedQ2(null)
    }
  }, [genieMood, currentQuestion])

  const handleClickQ1 = (opt: Question1Option) => {
    if (isPending || genieMood !== 'idle') return
    setSelectedQ1(opt)
    setIsPending(true)
    setTimeout(() => {
      onAnswerQuestion1(opt)
    }, 280)
  }

  const handleClickQ2 = (opt: Question2Option) => {
    if (isPending || genieMood !== 'idle') return
    setSelectedQ2(opt)
    setIsPending(true)
    setTimeout(() => {
      onAnswerQuestion2(opt)
    }, 280)
  }

  const handleClickHot = (val: number) => {
    if (isPending || genieMood !== 'idle') return
    setIsPending(true)
    setTimeout(() => {
      onAnswerHotQuestion(val)
    }, 280)
  }

  // 1. Ekran wstępny (Intro Dżina)
  if (endingPhase === 'guardian_intro') {
    return (
      <div className="guardian-dialogue-stage guardian-intro-card">
        <div className="guardian-intro-header">
          <h2 className="guardian-intro-title">Strażnik Sarkofagu</h2>
          <p className="guardian-intro-subtitle">Przed Tobą mistyczny Dżin!</p>
        </div>

        <div className="guardian-intro-genie-preview">
          <GenieActor mood="idle" />
        </div>

        <div className="guardian-intro-body">
          <p className="guardian-intro-description">
            Dotarłaś do wrót pradawnego grobowca. Aby zdobyć <strong>Złoty Klucz Faraona</strong>{' '}
            i otworzyć sarkofag, musisz poprawnie odpowiedzieć na <strong>3 pytania</strong> Dżina.
          </p>

          <div className="guardian-intro-hearts-reminder">
            <span className="reminder-label">Twoje serduszka z podróży:</span>
            <div className="reminder-hearts">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={`heart-icon ${i < guardianHearts ? 'heart-full' : 'heart-lost'}`}
                >
                  {i < guardianHearts ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
            <span className="reminder-subtext">
              Każda błędna odpowiedź rozgniewa Dżina i zabierze jedno serduszko!
            </span>
          </div>

          {hasDiamondCard && (
            <div className="guardian-intro-card-reminder">
              <img src="./dama.jpg" alt="Dama Karo" className="card-reminder-thumb" />
              <div className="card-reminder-text">
                <span className="card-reminder-title">Szczęśliwa Dama Karo jest z Tobą! ♦️</span>
                <span className="card-reminder-desc">
                  To karta <strong>jednorazowa</strong> – możesz wykorzystać ją tylko do <strong>jednego wybranego pytania</strong> (przycisk u góry ekranu), aby odrzucić błędne opcje!
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="guardian-start-btn"
          onClick={onStartQuestions}
          autoFocus
        >
          Podejmij wyzwanie 🔮
        </button>
      </div>
    )
  }

  // 2. Ekran porażki (gdy skończyły się serduszka)
  if (guardianHearts <= 0) {
    return (
      <div className="guardian-dialogue-stage guardian-defeat-card shake-wrong">
        <GenieActor mood="wrong" />
        <div className="defeat-content">
          <h3 className="defeat-heading">Koniec serduszek! 💨</h3>
          <p className="defeat-text">
            Dżin uniósł się w obłoku purpurowego dymu i cofnął Cię do korytarzy Muzeum!
          </p>
          {onReturnToMuseum && (
            <button
              type="button"
              className="guardian-defeat-btn"
              onClick={onReturnToMuseum}
            >
              Wróć do Muzeum 🏛️
            </button>
          )}
        </div>
      </div>
    )
  }

  // 3. Główny panel zagadek z Dżinem
  return (
    <div
      className={`guardian-dialogue-stage ${endingPhase === 'guardian_wrong' ? 'shake-wrong' : ''}`}
    >
      {/* Pasek statusu: serduszka, Dama Karo i wskaźnik pytań */}
      <div className="guardian-top-bar">
        <div className="guardian-hearts-indicator" aria-label={`Pozostałe serduszka: ${guardianHearts}`}>
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={`guardian-heart ${i < guardianHearts ? 'heart-alive' : 'heart-dead'}`}
            >
              {i < guardianHearts ? '❤️' : '🖤'}
            </span>
          ))}
        </div>

        {hasDiamondCard && (
          <button
            type="button"
            className={`guardian-card-hud-badge ${isCardConsumed ? 'card-used' : 'card-ready'}`}
            onClick={onUseDiamondCard}
            disabled={isCardConsumed || isPending || genieMood !== 'idle'}
            title={
              isCardConsumed
                ? isCardActive
                  ? 'Dama Karo została użyta w tym pytaniu ✨'
                  : 'Dama Karo została już wykorzystana (karta jednorazowa) ✨'
                : 'Użyj Szczęśliwej Damy Karo ♦️ (karta jednorazowa – do 1 wybranego pytania)'
            }
          >
            <img src="./dama.jpg" alt="Dama Karo" className="card-hud-thumb" />
            <span className="card-hud-name">Dama Karo</span>
            <span className="card-hud-status">
              {isCardConsumed ? (isCardActive ? 'Aktywna ✨' : 'Zużyta ✨') : 'Użyj ♦️'}
            </span>
          </button>
        )}

        <span className="guardian-question-counter">
          Pytanie {currentQuestion + 1} / 3
        </span>
      </div>

      {/* Dżin unoszący się na chmurce z 2 osobnymi dłońmi */}
      <div className="guardian-genie-container">
        <GenieActor mood={genieMood} speechText={speechText} />
      </div>

      {/* Panel z aktualnym pytaniem */}
      <div className="guardian-question-panel">
        {/* PYTANIE 1: Pozycja w piłce nożnej */}
        {currentQuestion === 0 && (
          <div className="question-slide">
            <p className="guardian-question-prompt">
              Na jakiej pozycji grał w piłkę twórca tej gry?
            </p>

            <div className="question-answers-stack">
              <button
                type="button"
                className={`guardian-ans-btn ${selectedQ1 === 'bramkarz' ? 'btn-selected' : ''}`}
                onClick={() => handleClickQ1('bramkarz')}
                disabled={isPending || genieMood !== 'idle'}
              >
                <span className="ans-emoji">🧤</span> Bramkarz
              </button>
              {!isCardActive && (
                <button
                  type="button"
                  className={`guardian-ans-btn ${selectedQ1 === 'napastnik' ? 'btn-selected' : ''}`}
                  onClick={() => handleClickQ1('napastnik')}
                  disabled={isPending || genieMood !== 'idle'}
                >
                  <span className="ans-emoji">⚽</span> Napastnik
                </button>
              )}
              <button
                type="button"
                className={`guardian-ans-btn ${selectedQ1 === 'obronca' ? 'btn-selected' : ''}`}
                onClick={() => handleClickQ1('obronca')}
                disabled={isPending || genieMood !== 'idle'}
              >
                <span className="ans-emoji">🛡️</span> Obrońca
              </button>
            </div>
          </div>
        )}

        {/* PYTANIE 2: Obsesja twórcy */}
        {currentQuestion === 1 && (
          <div className="question-slide">
            <p className="guardian-question-prompt">
              Na jakim punkcie obsesję ma twórca tej gry?
            </p>

            <div className="question-answers-grid">
              <button
                type="button"
                className={`guardian-ans-btn ans-grid-btn ${selectedQ2 === 'na_moim' ? 'btn-selected' : ''}`}
                onClick={() => handleClickQ2('na_moim')}
                disabled={isPending || genieMood !== 'idle'}
              >
                <span className="ans-emoji">👸</span> Na moim 💕
              </button>
              <button
                type="button"
                className={`guardian-ans-btn ans-grid-btn ${selectedQ2 === 'silka' ? 'btn-selected' : ''}`}
                onClick={() => handleClickQ2('silka')}
                disabled={isPending || genieMood !== 'idle'}
              >
                <span className="ans-emoji">🏋️‍♂️</span> Siłka
              </button>
              {!isCardActive && (
                <>
                  <button
                    type="button"
                    className={`guardian-ans-btn ans-grid-btn ${selectedQ2 === 'podroze' ? 'btn-selected' : ''}`}
                    onClick={() => handleClickQ2('podroze')}
                    disabled={isPending || genieMood !== 'idle'}
                  >
                    <span className="ans-emoji">✈️</span> Podróże
                  </button>
                  <button
                    type="button"
                    className={`guardian-ans-btn ans-grid-btn ${selectedQ2 === 'gry' ? 'btn-selected' : ''}`}
                    onClick={() => handleClickQ2('gry')}
                    disabled={isPending || genieMood !== 'idle'}
                  >
                    <span className="ans-emoji">🎮</span> Gry
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* PYTANIE 3: Skala 1 do 10 */}
        {currentQuestion === 2 && (
          <div className="question-slide">
            <p className="guardian-question-prompt">
              Ostatnia próba: <strong>Jak bardzo hot jest twórca tej gry?</strong>
            </p>

            <div className="hot-scale-picker" role="radiogroup" aria-label="Ocena w skali 1 do 10">
              {Array.from({ length: 10 }, (_, i) => i + 1)
                .filter((val) => !isCardActive || val > 5)
                .map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`hot-scale-btn ${selectedHotValue === val ? 'btn-selected' : ''}`}
                    onClick={() => handleClickHot(val)}
                    disabled={isPending || genieMood !== 'idle'}
                  >
                    {val}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
