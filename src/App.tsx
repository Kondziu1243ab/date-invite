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
  const [inviteStage, setInviteStage] = useState<'initial' | 'not_so_fast' | 'no_husband' | 'just_kidding'>('initial')
  const [cardClass, setCardClass] = useState('')

  function triggerTransitionToSchedule(showJoke: boolean) {
    if (showJoke) {
      setInviteStage('just_kidding')
      // Wait 1.5 seconds so the user can read "Nie no, tylko żartowałem! 😜"
      setTimeout(() => {
        setCardClass('card-slide-out-right')
        setTimeout(() => {
          setStep('schedule')
          setCardClass('card-slide-in-left')
          setTimeout(() => {
            setCardClass('')
          }, 600)
        }, 600)
      }, 1500)
    } else {
      setCardClass('card-slide-out-right')
      setTimeout(() => {
        setStep('schedule')
        setCardClass('card-slide-in-left')
        setTimeout(() => {
          setCardClass('')
        }, 600)
      }, 600)
    }
  }

  async function handleInstagramComplete(instagram: string) {
    await notifyScheduled(date, place, instagram)
    setStep('success')
  }

  return (
    <div className="page">
      <div className={`card ${cardClass}`}>
        <img
          className="cat-gif"
          src={CAT_GIF_URL}
          alt="Słodki piesek"
        />

        {step === 'invite' && (
          <>
            <p className="invite-text text-center">
              {inviteStage === 'initial' && `Hej ${inviteName}, to co randka?`}
              {inviteStage === 'not_so_fast' && 'Hej, nie tak szybko! 😅'}
              {inviteStage === 'no_husband' && 'Hej, nie szukałaś męża? 🤔'}
              {inviteStage === 'just_kidding' && 'Nie no, tylko żartowałem! 😜'}
            </p>
            <div className="button-row">
              {inviteStage !== 'just_kidding' && (
                <>
                  <button
                    type="button"
                    className="btn btn-tak"
                    disabled={inviteStage === 'no_husband'}
                    onClick={() => {
                      if (inviteStage === 'not_so_fast') {
                        triggerTransitionToSchedule(false)
                      } else {
                        setInviteStage('no_husband')
                      }
                    }}
                  >
                    Randka
                  </button>
                  {inviteStage === 'no_husband' ? (
                    <button
                      type="button"
                      className="btn btn-think"
                      onClick={() => triggerTransitionToSchedule(true)}
                    >
                      Od razu ślub?
                    </button>
                  ) : (
                    <FleeingButton
                      text="Od razu ślub?"
                      onFlee={() => {
                        if (inviteStage !== 'not_so_fast') {
                          setInviteStage('not_so_fast')
                        }
                      }}
                    />
                  )}
                </>
              )}
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
            <p className="success-submessage text-center">Dzięki, do zobaczenia na insta :)</p>
          </div>
        )}
      </div>
    </div>
  )
}

