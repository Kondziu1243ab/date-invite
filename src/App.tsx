import { useState } from 'react'
import FleeingButton from './FleeingButton'
import VeilGame, { type VeilGameResult } from './VeilGame'
import { notifyGameCompleted } from './notifyNtfy'
import { inviteName } from './config'
import './App.css'

const CAT_GIF_URL = '/krolik.gif'

type Step = 'invite' | 'game' | 'success'

export default function App() {
  const [step, setStep] = useState<Step>('invite')
  const [gameResult, setGameResult] = useState<VeilGameResult | null>(null)

  function handleGameComplete(result: VeilGameResult) {
    setGameResult(result)
    void notifyGameCompleted({
      pearls: result.pearls,
      triangles: result.triangles,
      difficulty: result.difficultyLabel,
    })
    setStep('success')
  }

  function handleRestart() {
    setGameResult(null)
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
              Hej {inviteName}, czy umówimy się na trójkąt ? 
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
          </>
        )}

        {/* Step 2: Gra z latawcem (Wiosna -> Zima -> Czerwony Pokój) */}
        {step === 'game' && (
          <VeilGame onComplete={handleGameComplete} />
        )}

        {/* Step 3: Finalny ekran z gratulacjami bez formularza o instagram */}
        {step === 'success' && (
          <div className="final-celebration-screen">
            <div className="final-celebration-badge">Wszystkie etapy ukończone! 🍷✨</div>
            <h1 className="final-message-title">Dotarliśmy do naszego pokoju!</h1>
            <p className="final-message-subtitle">
              Poradziłaś sobie z wiosennym wiatrem, zimowym mrozem i latającymi meblami!
            </p>

            <div className="final-stats-grid">
              <div className="final-stat-box stat-triangles">
                <span className="stat-label">🔺 Trójkąty w pokoju</span>
                <span className="stat-val">{gameResult?.triangles ?? 0}</span>
              </div>
              <div className="final-stat-box stat-pearls">
                <span className="stat-label">✨ Zebrane perły</span>
                <span className="stat-val">{gameResult?.pearls ?? 0}</span>
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
