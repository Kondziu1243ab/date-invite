import { useState } from 'react'
import FleeingButton from './FleeingButton'
import ScheduleForm from './ScheduleForm'
import { inviteName } from './config'
import './App.css'

const CAT_GIF_URL = '/piesek.gif'

export default function App() {
  const [accepted, setAccepted] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const [isFoccaciaMode, setIsFoccaciaMode] = useState(false)

  return (
    <div className="page">
      <div className="card">
        <img
          className="cat-gif"
          src={CAT_GIF_URL}
          alt="Słodki piesek"
        />

        {!scheduled && (
          <p className={isFoccaciaMode ? "invite-text foccacia-header-text" : "invite-text"}>
            {isFoccaciaMode
              ? 'hej chyba bylismy juz na cos umowieni :D'
              : accepted
              ? 'Świetnie! Wybierz termin i miejsce:'
              : `Hej ${inviteName}, czy pójdziesz ze mną na randkę?`}
          </p>
        )}

        {scheduled ? (
          <p className="success-message">Czekam na Ciebie!</p>
        ) : accepted ? (
          <ScheduleForm
            onScheduled={() => setScheduled(true)}
            isFoccaciaMode={isFoccaciaMode}
            setIsFoccaciaMode={setIsFoccaciaMode}
          />
        ) : (
          <div className="button-row">
            <button
              type="button"
              className="btn btn-tak"
              onClick={() => setAccepted(true)}
            >
              Tak ❤️
            </button>
            <FleeingButton />
          </div>
        )}
      </div>
    </div>
  )
}
