import { useState } from 'react'
import FleeingButton from './FleeingButton'
import ScheduleForm from './ScheduleForm'
import InstagramForm from './InstagramForm'
import { notifyScheduled } from './notifyNtfy'
import { inviteName } from './config'
import './App.css'

const CAT_GIF_URL = '/krolik.gif'

type Step = 'invite' | 'schedule' | 'instagram' | 'success'

export default function App() {
  const [step, setStep] = useState<Step>('invite')
  const [date, setDate] = useState('')
  const [place, setPlace] = useState('')
  const [isFoccaciaMode, setIsFoccaciaMode] = useState(false)

  async function handleInstagramComplete(instagram: string) {
    await notifyScheduled(date, place, instagram)
    setStep('success')
  }

  return (
    <div className="page">
      <div className="card">
        {step !== 'instagram' && (
          <img
            className="cat-gif"
            src={CAT_GIF_URL}
            alt="Słodki krolik"
          />
        )}

        {(step === 'invite' || step === 'schedule') && (
          <p className={isFoccaciaMode && step === 'schedule' ? "invite-text foccacia-header-text" : "invite-text"}>
            {step === 'schedule' && isFoccaciaMode
              ? 'hej chyba bylismy juz na cos umowieni :D'
              : step === 'schedule'
                ? `Hej ${inviteName} to kiedy spotkanko ?`
                : `Hej ${inviteName}, czy umówisz się ze mną?`}
          </p>
        )}

        {step === 'success' && (
          <div className="success-screen">
            <p className="success-submessage text-center">Dzięki, na pewno się odezwę! :)</p>
          </div>
        )}

        {step === 'invite' && (
          <div className="button-row">
            <button
              type="button"
              className="btn btn-tak"
              onClick={() => setStep('schedule')}
            >
              Tak
            </button>
            <FleeingButton />
          </div>
        )}

        {step === 'schedule' && (
          <ScheduleForm
            onScheduled={(d, p) => {
              setDate(d)
              setPlace(p)
              setStep('instagram')
            }}
            isFoccaciaMode={isFoccaciaMode}
            setIsFoccaciaMode={setIsFoccaciaMode}
          />
        )}

        {step === 'instagram' && (
          <InstagramForm onComplete={handleInstagramComplete} />
        )}
      </div>
    </div>
  )
}
