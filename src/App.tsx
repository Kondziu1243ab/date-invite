import { useState } from 'react'
import FleeingButton from './FleeingButton'
import VeilGame, { PICNIC_ITEMS, PICNIC_ASSETS, type PicnicItemKey, type VeilGameResult } from './VeilGame'
import { notifyPicnicScheduled } from './notifyNtfy'
import { inviteName } from './config'
import './App.css'

const CAT_GIF_URL = '/krolik.gif'

type Step = 'invite' | 'veil' | 'success'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function App() {
  const [step, setStep] = useState<Step>('invite')
  const [collectedPicnic, setCollectedPicnic] = useState<PicnicItemKey[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isSending, setIsSending] = useState(false)

  function handleVeilComplete(result: VeilGameResult) {
    setCollectedPicnic(result.picnicItems)
    setStep('success')
  }

  async function handleConfirmDate() {
    if (!selectedDate || isSending) return
    setIsSending(true)
    try {
      const itemNames = collectedPicnic.map(
        (key) => PICNIC_ITEMS.find((i) => i.id === key)?.name ?? key,
      )
      await notifyPicnicScheduled(selectedDate, itemNames)
    } finally {
      setIsSending(false)
      setIsConfirmed(true)
    }
  }

  return (
    <div className={`page ${step === 'veil' ? 'page-game' : ''}`}>
      <div className={`card ${step === 'veil' ? 'card-game' : ''} ${step === 'success' ? 'card-picnic' : ''}`}>
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

        {/* Step 3: Ekran zebranych smakołyków i wybór daty (bez królika) */}
        {step === 'success' && !isConfirmed && (
          <div className="picnic-results-screen">
            <h2 className="picnic-heading">Udało Ci się zebrać na nasz piknik:</h2>

            <div className="picnic-items-row">
              {collectedPicnic.length > 0 ? (
                collectedPicnic.map((key) => {
                  const item = PICNIC_ITEMS.find((i) => i.id === key)
                  if (!item) return null
                  return (
                    <div key={key} className="picnic-item-badge">
                      <img src={PICNIC_ASSETS[key]} alt={item.name} className="picnic-item-thumb" />
                      <span className="picnic-item-name">{item.name}</span>
                    </div>
                  )
                })
              ) : (
                <p className="picnic-empty">Wszystko jeszcze przed nami! 🧺</p>
              )}
            </div>

            <div className="picnic-schedule-container">
              <label className="picnic-date-label">
                <span className="picnic-prompt-text">To kiedy idziemy na piknik? 🧺</span>
                <input
                  type="date"
                  className="form-input picnic-date-input"
                  min={todayIso()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </label>

              <button
                type="button"
                className={`btn btn-umow ${selectedDate ? 'btn-umow-ready' : 'btn-umow-locked'}`}
                disabled={!selectedDate || isSending}
                onClick={handleConfirmDate}
              >
                {isSending ? 'Zapisywanie... 💕' : 'Umówieni 💕'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Finalny ekran z potwierdzeniem (bez królika) */}
        {step === 'success' && isConfirmed && (
          <div className="final-celebration-screen">
            <h1 className="final-message-title">Do zobaczenia :p</h1>
            <div className="final-details">
              <span className="final-date-tag">📅 {selectedDate}</span>
              <span className="final-picnic-tag">🧺 Piknik zaklepany!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
