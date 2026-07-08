import { useState } from 'react'
import FleeingButton from './FleeingButton'
import ScheduleForm from './ScheduleForm'
import InstagramForm from './InstagramForm'
import { notifyScheduled } from './notifyNtfy'
import { inviteName } from './config'
import './App.css'

const CAT_GIF_URL = '/piesek.gif'

type Step = 'invite' | 'schedule' | 'instagram' | 'success'

export default function App() {
  const [step, setStep] = useState<Step>('invite')
  const [date, setDate] = useState('')
  const [place, setPlace] = useState('')

  async function handleInstagramComplete(instagram: string) {
    await notifyScheduled(date, place, instagram)
    setStep('success')
  }

  return (
    <div className="page">
      <div className="card">
        <img
          className="cat-gif"
          src={CAT_GIF_URL}
          alt="Słodki piesek"
        />

        {step === 'invite' && (
          <>
            <p className="invite-text text-center">
              Hej {inviteName}, czy pójdziesz ze mną na randkę?
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-tak"
                onClick={() => setStep('schedule')}
              >
                Tak ❤️
              </button>
              <FleeingButton />
            </div>
          </>
        )}

        {step === 'schedule' && (
          <>
            <p className="invite-text text-center">
              Świetnie! Wybierz termin i miejsce:
            </p>
            <ScheduleForm
              onNext={(d, p) => {
                setDate(d)
                setPlace(p)
                setStep('instagram')
              }}
            />
          </>
        )}

        {step === 'instagram' && (
          <InstagramForm onComplete={handleInstagramComplete} />
        )}

        {step === 'success' && (
          <div className="success-screen">
            <p className="success-submessage text-center">Dzięki, na pewno się odezwę! :)</p>
          </div>
        )}
      </div>
    </div>
  )
}
