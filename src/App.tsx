import { useState } from 'react'
import FleeingButton from './FleeingButton'
import FaceQuestion from './FaceQuestion'
import VeilGame, { type VeilGameResult } from './VeilGame'
import { notifyGameCompleted } from './notifyNtfy'
import { inviteName } from './config'
import { stopMuseumJazzMusic } from './soundEffects'
import './App.css'

const CAT_GIF_URL = '/krolik.gif'

type Step = 'invite' | 'face' | 'game' | 'final'

export default function App() {
  const [step, setStep] = useState<Step>('invite')

  function handleGameComplete(result: VeilGameResult) {
    void notifyGameCompleted({
      lettersCollected: result.lettersCollected,
      totalLetters: result.totalLetters,
      difficulty: result.difficultyLabel,
      wasSkipped: result.wasSkipped,
      guardianClicks: result.guardianClicks,
    })
    stopMuseumJazzMusic()
    setStep('final')
  }

  return (
    <div className={`page ${step === 'game' ? 'page-game' : ''} ${step === 'final' ? 'page-white-screen' : ''}`}>
      <div className={`card ${step === 'game' ? 'card-game' : ''} ${step === 'final' ? 'card-white-screen' : ''}`}>
        {/* Step 1: Pytanie początkowe przed GTA 6 */}
        {step === 'invite' && (
          <>
            <img className="cat-gif" src={CAT_GIF_URL} alt="Słodkie zaproszenie" />
            <p className="invite-text text-center">
              Hej {inviteName}, czy umówisz się ze mną przed GTA 6?
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-tak"
                onClick={() => setStep('face')}
              >
                Tak
              </button>
              <FleeingButton
                label="Być może"
                onProceed={() => setStep('face')}
              />
            </div>
          </>
        )}

        {/* Step 2: Buźka z poziomym uśmiechem i pytaniem o grę */}
        {step === 'face' && (
          <FaceQuestion onAccept={() => setStep('game')} />
        )}

        {/* Step 3: Gra w chrabąszcza (Wiosna -> Zima -> Muzeum Tajemnic ze złotym skarabeuszem) */}
        {step === 'game' && (
          <VeilGame
            onComplete={handleGameComplete}
          />
        )}

        {/* Step 4: Finalny ekran po przejściu gry */}
        {step === 'final' && (
          <div className="white-screen-message-container date-final-container">
            <h1 className="white-screen-heading date-final-heading">
              To widzimy się 7 listopada!
            </h1>
          </div>
        )}
      </div>
    </div>
  )
}
