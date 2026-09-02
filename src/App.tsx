import { useState } from 'react'
import FleeingButton from './FleeingButton'
import VeilGame from './VeilGame'
import InstagramForm from './InstagramForm'
import { notifyScheduled } from './notifyNtfy'
import { inviteName } from './config'
import './App.css'

const CAT_GIF_URL = '/krolik.gif'

type Step = 'invite' | 'veil' | 'instagram' | 'success'

export default function App() {
  const [step, setStep] = useState<Step>('invite')

  async function handleInstagramComplete(instagram: string) {
    await notifyScheduled('Wesele', 'Wesele', instagram)
    setStep('success')
  }

  return (
    <div className="page">
      <div className="card">
        {/* Piesek / Kotek GIF shown on invite, instagram, success screens */}
        {(step !== 'veil') && (step !== 'instagram')   && (
          <img
            className="cat-gif"
            src={CAT_GIF_URL}
            alt="Słodki zwierzak"
          />
        )}

        {/* Step 1: Initial Question with Tak and Fleeing Button */}
        {step === 'invite' && (
          <>
            <p className="invite-text text-center">
              Hej {inviteName}, czy pójdziesz ze mną na wesele 05 września 2026 ?
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-tak"
                onClick={() => setStep('veil')}
              >
                Tak 💕
              </button>
              <FleeingButton />
            </div>
          </>
        )}

        {/* Step 2: Falling Veil Game / Animation */}
        {step === 'veil' && (
          <VeilGame onComplete={() => setStep('instagram')} />
        )}

        {/* Step 3: Instagram Form with Bike Envelope Animation */}
        {step === 'instagram' && (
          <InstagramForm onComplete={handleInstagramComplete} />
        )}

        {/* Step 4: Final Success Screen */}
        {step === 'success' && (
          <div className="success-screen">
            <p className="success-submessage text-center">Dzięki, widzimy się na instagramie! :)</p>
          </div>
        )}
      </div>
    </div>
  )
}
