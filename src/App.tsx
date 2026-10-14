import { useState } from 'react'
import FleeingButton from './FleeingButton'
import ScheduleForm from './ScheduleForm'
import VeilGame, { PICNIC_ITEMS, type PicnicItemKey, type VeilGameResult, type WeddingPlan } from './VeilGame'
import { VENUE_DETAILS, CROWN_DETAILS, MUSIC_DETAILS, DRINK_DETAILS } from './WeddingPlannerModal'
import InstagramForm from './InstagramForm'
import { notifyWeddingDateSelected, notifyInstagramSubmitted } from './notifyNtfy'
import { inviteName } from './config'
import './App.css'

const CAT_GIF_URL = '/krolik.gif'

type Step = 'invite' | 'date' | 'veil' | 'instagram' | 'success'

export default function App() {
  const [step, setStep] = useState<Step>('invite')
  const [selectedDate, setSelectedDate] = useState('')
  const [isSendingDate, setIsSendingDate] = useState(false)
  const [collectedItems, setCollectedItems] = useState<PicnicItemKey[]>([])
  const [weddingPlan, setWeddingPlan] = useState<WeddingPlan | null>(null)
  const [instagramHandle, setInstagramHandle] = useState('')

  async function handleDateScheduled(date: string) {
    setSelectedDate(date)
    setIsSendingDate(true)
    try {
      await notifyWeddingDateSelected(date)
    } finally {
      setIsSendingDate(false)
      setStep('veil')
    }
  }

  function handleVeilComplete(result: VeilGameResult) {
    setCollectedItems(result.picnicItems)
    setWeddingPlan(result.weddingPlan)
    setStep('instagram')
  }

  async function handleInstagramComplete(instagram: string) {
    setInstagramHandle(instagram)
    const itemNames = collectedItems.map(
      (key) => PICNIC_ITEMS.find((i) => i.id === key)?.name ?? key,
    )
    await notifyInstagramSubmitted(instagram, selectedDate, itemNames, weddingPlan ?? undefined)
    setStep('success')
  }

  return (
    <div className={`page ${step === 'veil' ? 'page-game' : ''}`}>
      <div className={`card ${step === 'veil' ? 'card-game' : ''}`}>
        {/* GIF króliczka na krokach invite, date i success */}
        {step !== 'veil' && step !== 'instagram' && (
          <img className="cat-gif" src={CAT_GIF_URL} alt="Słodkie zaproszenie" />
        )}

        {/* Step 1: Pytanie początkowe */}
        {step === 'invite' && (
          <>
            <p className="invite-text text-center">
              Hej {inviteName}, wyjdziesz za mnie? 💕
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-tak"
                onClick={() => setStep('date')}
              >
                Tak 💕
              </button>
              <FleeingButton />
            </div>
          </>
        )}

        {/* Step 2: Kalendarz z wyborem daty i pytaniem "To kiedy wesele?" */}
        {step === 'date' && (
          <ScheduleForm
            onScheduled={handleDateScheduled}
            isSending={isSendingDate}
          />
        )}

        {/* Step 3: Gra z welonem w weselnym klimacie */}
        {step === 'veil' && (
          <VeilGame onComplete={handleVeilComplete} />
        )}

        {/* Step 4: Formularz Instagrama z animacją koperty */}
        {step === 'instagram' && (
          <InstagramForm onComplete={handleInstagramComplete} />
        )}

        {/* Step 5: Finalny ekran z potwierdzeniem */}
        {step === 'success' && (
          <div className="final-celebration-screen">
            <h1 className="final-message-title">Do zobaczenia na insta :p 💕</h1>
            <div className="final-details">
              {selectedDate && (
                <span className="final-date-tag">💒 Data wesela: {selectedDate}</span>
              )}
              {instagramHandle && (
                <span className="final-insta-tag">📸 {instagramHandle}</span>
              )}
              {weddingPlan && (
                <div className="final-plan-summary">
                  <span className="final-plan-heading">Twój wymarzony plan wesela:</span>
                  <div className="final-plan-badges">
                    <span className="final-plan-badge">{VENUE_DETAILS[weddingPlan.venue].emoji} {VENUE_DETAILS[weddingPlan.venue].label}</span>
                    <span className="final-plan-badge">{CROWN_DETAILS[weddingPlan.crown].emoji} {CROWN_DETAILS[weddingPlan.crown].label}</span>
                    <span className="final-plan-badge">{MUSIC_DETAILS[weddingPlan.music].emoji} {MUSIC_DETAILS[weddingPlan.music].label}</span>
                    <span className="final-plan-badge">{DRINK_DETAILS[weddingPlan.drink].emoji} {DRINK_DETAILS[weddingPlan.drink].label}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

