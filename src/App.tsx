import { useState } from 'react'
import FleeingButton from './FleeingButton'
import VeilGame, { PICNIC_ITEMS, type PicnicItemKey, type VeilGameResult } from './VeilGame'
import InstagramForm from './InstagramForm'
import { notifyInstagramSubmitted } from './notifyNtfy'
import { inviteName } from './config'
import './App.css'

const CAT_GIF_URL = '/krolik.gif'

type Step = 'invite' | 'veil' | 'instagram' | 'success'

export default function App() {
  const [step, setStep] = useState<Step>('invite')
  const [collectedPicnic, setCollectedPicnic] = useState<PicnicItemKey[]>([])

  function handleVeilComplete(result: VeilGameResult) {
    setCollectedPicnic(result.picnicItems)
    setStep('instagram')
  }

  async function handleInstagramComplete(instagram: string) {
    const itemNames = collectedPicnic.map(
      (key) => PICNIC_ITEMS.find((i) => i.id === key)?.name ?? key,
    )
    await notifyInstagramSubmitted(instagram, itemNames)
    setStep('success')
  }

  return (
    <div className={`page ${step === 'veil' ? 'page-game' : ''}`}>
      <div className={`card ${step === 'veil' ? 'card-game' : ''}`}>
        {/* Step 1: Pytanie początkowe */}
        {step === 'invite' && (
          <>
            <img className="cat-gif" src={CAT_GIF_URL} alt="Słodkie zaproszenie" />
            <p className="invite-text text-center">
              Hej {inviteName}, wyjdziesz za mnie? 💕
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

        {/* Step 2: Gra z welonem i koszykiem piknikowym */}
        {step === 'veil' && (
          <VeilGame onComplete={handleVeilComplete} />
        )}

        {/* Step 3: Formularz Instagrama z animacją koperty */}
        {step === 'instagram' && (
          <InstagramForm onComplete={handleInstagramComplete} />
        )}

        {/* Step 4: Finalny ekran z potwierdzeniem */}
        {step === 'success' && (
          <div className="final-celebration-screen">
            <h1 className="final-message-title">Do zobaczenia na insta :p</h1>
          </div>
        )}
      </div>
    </div>
  )
}
