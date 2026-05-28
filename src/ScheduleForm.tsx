import { useState } from 'react'

const PLACES = [
  { value: 'park', label: 'Piknik w parku 🌳' },
  { value: 'pub', label: 'Pub 🍻' },
  { value: 'suprise', label: 'Zaskocz mnie 🤫' },
  { value: 'kawiarnia', label: 'Restauracja 🍽️' },  
  { value: 'home', label: 'Netflix and chill 🍿' },
] as const

type PlaceFlow =
  | 'choosing'      // start
  | 'tease'         // kliknięto park, czekamy na „inne”
  | 'falling'       // trwa animacja
  | 'parkLocked'    // park wybrany, żart pokazany

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type ScheduleFormProps = {
  onNext: (date: string, placeLabel: string) => void
}

export default function ScheduleForm({ onNext }: ScheduleFormProps) {
  const [date, setDate] = useState('')
  const [place, setPlace] = useState('')
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<PlaceFlow>('choosing')
  const [bannerMessage, setBannerMessage] = useState<string | null>(null)

  function handlePlaceClick(value: string) {
    if (phase === 'falling' || phase === 'parkLocked') return

    setError('')

    if (value === 'park') {
      if (phase === 'choosing') {
        setPhase('tease')
        setBannerMessage('Hej, spróbuj wybrać coś innego 🙂')
      }
      return
    }

    const prevPhase = phase
    setPhase('falling')

    setTimeout(() => {
      setPlace('park')
      setPhase('parkLocked')
      if (prevPhase === 'tease') {
        setBannerMessage('Żartowałem, idziemy na piknik')
      } else {
        setBannerMessage('Hej, myślałem że już na coś się zdecydowaliśmy')
      }
    }, 800)
  }

  function handleSubmit() {
    if (!date || phase !== 'parkLocked') {
      setError('Wybierz datę i miejsce randki.')
      return
    }

    const label = PLACES.find((p) => p.value === place)?.label ?? place
    onNext(date, label)
  }

  return (
    <div className="schedule-form">
      <label className="form-field">
        <span className="form-label">Kiedy?</span>
        <input
          type="date"
          className="form-input"
          min={todayIso()}
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            setError('')
          }}
        />
      </label>

      <div className="form-field">
        <span className="form-label">Gdzie?</span>
        <div className="place-options">
          {PLACES.map((p, index) => {
            if (phase === 'parkLocked' && p.value !== 'park') {
              return null
            }
            
            const isPark = p.value === 'park'
            const isFalling = phase === 'falling'
            const isWinner = phase === 'parkLocked' && isPark
            
            let btnClass = 'place-option'
            if (isWinner) {
              btnClass += ' place-option--selected place-option--park-winner'
            } else if (isPark && phase === 'tease') {
              btnClass += ' place-option--teased'
            }
            if (isFalling && !isPark) {
              btnClass += ' place-option--falling'
            }

            return (
              <button
                key={p.value}
                type="button"
                className={btnClass}
                disabled={phase === 'falling' || phase === 'parkLocked'}
                onClick={() => handlePlaceClick(p.value)}
                style={
                  isFalling && !isPark
                    ? { animationDelay: `${index * 60}ms` }
                    : undefined
                }
              >
                {p.label}
              </button>
            )
          })}
        </div>
        {bannerMessage && <p className="place-banner">{bannerMessage}</p>}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button
        type="button"
        className="btn btn-umow"
        onClick={handleSubmit}
      >
        Umówieni 💌
      </button>
    </div>
  )
}

