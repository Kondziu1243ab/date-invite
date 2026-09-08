import { useState } from 'react'
import FleeingButton from './FleeingButton'
import VeilGame from './VeilGame'
import { notifyScheduled } from './notifyNtfy'
import { inviteName } from './config'
import './App.css'

const CAT_GIF_URL = '/krolik.gif'

type Step = 'invite' | 'veil' | 'success'

export default function App() {
  const [step, setStep] = useState<Step>('invite')
  const [earnedPearls, setEarnedPearls] = useState(0)

  async function handleVeilComplete(pearls: number) {
    await notifyScheduled()
    setEarnedPearls(pearls)
    setStep('success')
  }

  return (
    <div className={`page ${step === 'veil' ? 'page-game' : ''}`}>
      <div className={`card ${step === 'veil' ? 'card-game' : ''}`}>
        {/* Cute GIF shown on invite and success screens */}
        {step !== 'veil' && (
          <img
            className="cat-gif"
            src={CAT_GIF_URL}
            alt="Cute celebration"
          />
        )}

        {/* Step 1: Initial Question: Will you marry me? with Yes and Fleeing Button */}
        {step === 'invite' && (
          <>
            <p className="invite-text text-center">
              Hey {inviteName}, will you marry me?
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-tak"
                onClick={() => setStep('veil')}
              >
                Yes 💕
              </button>
              <FleeingButton />
            </div>
          </>
        )}

        {/* Step 2: Falling Veil Game / Animation */}
        {step === 'veil' && (
          <VeilGame onComplete={handleVeilComplete} />
        )}

        {/* Step 3: Final Success Screen */}
        {step === 'success' && (
          <div className="success-screen">
            <p className="success-line">You got it. I think I owe you {earnedPearls} pearls :p So when Wedding?</p>
          </div>
        )}
      </div>
    </div>
  )
}

