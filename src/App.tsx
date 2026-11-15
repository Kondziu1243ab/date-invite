import { useEffect, useState } from 'react'
import FleeingButton from './FleeingButton'
import VeilGame, { type VeilGameResult } from './VeilGame'
import { notifyGameCompleted, notifyInviteAccepted } from './notifyNtfy'
import { inviteName } from './config'
import { stopMuseumJazzMusic } from './soundEffects'
import './styles/main.scss'

const CAT_GIF_URL = '/krolik.gif'

type Step = 'invite' | 'game' | 'success'

export default function App() {
  const [step, setStep] = useState<Step>('invite')

  // Prefetch obrazu muzeum od razu przy starcie aplikacji
  useEffect(() => {
    const preloader = new Image()
    preloader.src = '/muzeum-wejscie.jpg'
  }, [])

  function handleGameComplete(result: VeilGameResult) {
    void notifyGameCompleted({
      lettersCollected: result.lettersCollected,
      totalLetters: result.totalLetters,
      difficulty: result.difficultyLabel,
      skippedStages: result.skippedStages,
      manuallyCollectedCount: result.manuallyCollectedCount,
      hitsTaken: result.hitsTaken,
      deathsCount: result.deathsCount,
      guardianAttempts: result.guardianAttempts,
      totalPlayTimeSeconds: result.totalPlayTimeSeconds,
    })
    stopMuseumJazzMusic()
    setStep('success')
  }

  return (
    <div className={`page ${step === 'game' ? 'page-game' : ''} ${step === 'success' ? 'page-white-screen' : ''}`}>
      <div className={`card ${step === 'game' ? 'card-game' : ''} ${step === 'success' ? 'card-white-screen' : ''}`}>
        {/* Step 1: Pytanie początkowe */}
        {step === 'invite' && (
          <>
            <img className="cat-gif" src={CAT_GIF_URL} alt="Słodkie zaproszenie" />
            <p className="invite-text text-center">
              Hej {inviteName}, czy szalejesz za mną?
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-tak"
                onClick={() => {
                  void notifyInviteAccepted()
                  setStep('game')
                }}
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

        {/* Step 3: Czysty biały ekran z napisem po zakończeniu gry */}
        {step === 'success' && (
          <div className="white-screen-message-container">
            <h1 className="white-screen-heading">Dzięki !</h1>
          </div>
        )}
      </div>
    </div>
  )
}
