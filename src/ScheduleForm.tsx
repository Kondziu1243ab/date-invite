import { useState } from 'react'

const PLACES = [
  { value: 'park', label: 'Spacer w parku 🌳' },
  { value: 'pub', label: 'Pub 🍻' },
  { value: 'suprise', label: 'Zaskocz mnie 🤫' },
  { value: 'kawiarnia', label: 'Restauracja 🍽️' },  
  { value: 'home', label: 'U mnie 😏 (recommended) ' },
] as const

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

  function handleSubmit() {
    if (!date || !place) {
      setError('Wybierz datę  i miejsce randki.')
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

      <label className="form-field">
        <span className="form-label">Gdzie?</span>
        <select
          className="form-input"
          value={place}
          onChange={(e) => {
            setPlace(e.target.value)
            setError('')
          }}
        >
          <option value="">Wybierz miejsce…</option>
          {PLACES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

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
