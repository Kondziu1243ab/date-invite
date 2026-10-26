import { useState } from 'react'
import FleeingButton from './FleeingButton'
import VeilGame, { type VeilGameResult } from './VeilGame'
import InstagramForm from './InstagramForm'
import { notifyGameCompleted, notifyInstagramSubmitted } from './notifyNtfy'
import { inviteName } from './config'
import { stopMuseumJazzMusic } from './soundEffects'
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
    stopMuseumJazzMusic()
    setStep('success')
  }

  function handleRestart() {
    setGameResult(null)
    // setSkipToEndTest(false)
    setStep('game')
  }

  return (
    <div className={`page ${step === 'game' ? 'page-game' : ''} ${step === 'success' ? 'page-white-screen' : ''}`}>
      <div className={`card ${step === 'game' ? 'card-game' : ''} ${step === 'success' ? 'card-white-screen' : ''}`}>
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
          </>
        )}

        {/* Step 2: Gra (Wiosna -> Zima -> Muzeum Tajemnic ze złotym skarabeuszem) */}
        {step === 'game' && (
          <VeilGame
            onComplete={handleGameComplete}
          />
        )}

        {/* Step 3: Formularz Instagrama z animowanym ludzikiem i kopertą */}
        {step === 'instagram' && (
          <InstagramForm onComplete={handleInstagramComplete} />
        )}

        {/* Step 4: Czysty biały ekran z napisem po Instagramie */}
        {step === 'success' && (
          <div className="white-screen-message-container">
            <h1 className="white-screen-heading">Dzięki, odezwę się na instagramie ✨</h1>
          </div>
        )}
      </div>
    </div>
  )
}
