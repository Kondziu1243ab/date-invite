import { useState } from 'react'
import FleeingButton from './FleeingButton'
import VeilGame, { type VeilGameResult } from './VeilGame'
import InstagramForm from './InstagramForm'
import { notifyGameCompleted, notifyInstagramSubmitted } from './notifyNtfy'
import { inviteName } from './config'
import './App.css'

const CAT_GIF_URL = '/krolik.gif'

type Step = 'invite' | 'game' | 'instagram' | 'success'

export default function App() {
  const [step, setStep] = useState<Step>('invite')
  // const [skipToEndTest, setSkipToEndTest] = useState(false)
  const [gameResult, setGameResult] = useState<VeilGameResult | null>(null)

  function handleGameComplete(result: VeilGameResult) {
    setGameResult(result)
    void notifyGameCompleted({
      lettersCollected: result.lettersCollected,
      totalLetters: result.totalLetters,
      difficulty: result.difficultyLabel,
    })
    setStep('instagram')
  }

  function handleInstagramComplete(instagram: string) {
    void notifyInstagramSubmitted(instagram)
    setStep('success')
  }

  function handleRestart() {
    setGameResult(null)
    // setSkipToEndTest(false)
    setStep('game')
  }

  return (
    <div className={`page ${step === 'game' ? 'page-game' : ''}`}>
      <div className={`card ${step === 'game' ? 'card-game' : ''} ${step === 'success' ? 'card-success' : ''}`}>
        {/* Step 1: Pytanie początkowe */}
        {step === 'invite' && (
          <>
            <img className="cat-gif" src={CAT_GIF_URL} alt="Słodkie zaproszenie" />
            <p className="invite-text text-center">
              Hej {inviteName}, czy umówisz się ze mną na randkę?
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-tak"
                onClick={() => setStep('game')}
              >
                Tak 💕
              </button>
              <FleeingButton />
            </div>

            {/* Test button do szybkiego testu końcówki (odkomentuj w razie potrzeby):
            <div className="test-skip-container">
              <button
                type="button"
                className="btn-test-skip"
                onClick={() => {
                  setSkipToEndTest(true)
                  setStep('game')
                }}
              >
                ⚡ Skip to end (test z 50% liter)
              </button>
            </div>
            */}
          </>
        )}

        {/* Step 2: Gra (Wiosna -> Zima -> Ponury Cmentarz z nietoperzem i literami) */}
        {step === 'game' && (
          <VeilGame
            onComplete={handleGameComplete}
            /* skipToEndTest={skipToEndTest} */
          />
        )}

        {/* Step 3: Formularz Instagrama z animowanym ludzikiem i kopertą */}
        {step === 'instagram' && (
          <InstagramForm onComplete={handleInstagramComplete} />
        )}

        {/* Step 4: Finalny ekran z podsumowaniem */}
        {step === 'success' && (
          <div className="final-celebration-screen">
            <div className="final-celebration-badge">Jesteśmy umówieni! 💖</div>
            <h1 className="final-message-title">Wspaniale, {inviteName}!</h1>
            <p className="final-message-subtitle">
              Pokonałaś wiosenny wiatr, zimowy mróz oraz ponury cmentarz, a Twoja wiadomość dotarła do celu.
            </p>

            <div className="final-secret-badge">
              <span>Hasło: </span>
              <strong>JESTEŚ SŁODKA ✨</strong>
            </div>

            <div className="final-stats-grid">
              <div className="final-stat-box stat-pearls">
                <span className="stat-label">✨ Zebrane litery</span>
                <span className="stat-val">
                  {gameResult?.lettersCollected ?? 6} / {gameResult?.totalLetters ?? 12}
                </span>
              </div>
              <div className="final-stat-box stat-diff">
                <span className="stat-label">🎯 Poziom trudności</span>
                <span className="stat-val">{gameResult?.difficultyLabel ?? 'Łatwy'}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-tak btn-replay"
              onClick={handleRestart}
            >
              Zagraj jeszcze raz
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
