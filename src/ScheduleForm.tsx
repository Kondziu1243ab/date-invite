import { useState } from 'react'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type ScheduleFormProps = {
  onScheduled: (date: string) => void
  isSending?: boolean
}

export default function ScheduleForm({
  onScheduled,
  isSending = false,
}: ScheduleFormProps) {
  const [date, setDate] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) {
      setError('Wybierz datę wesela!')
      return
    }
    setError('')
    onScheduled(date)
  }

  return (
    <div className="schedule-form wedding-date-step">
      <p className="invite-text text-center wedding-date-title">
        To kiedy wesele? 💒💍
      </p>

      <form onSubmit={handleSubmit} className="wedding-date-form">
        <label className="form-field">
          <input
            type="date"
            className="form-input wedding-date-input"
            min={todayIso()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setError('')
            }}
            disabled={isSending}
            autoFocus
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button
          type="submit"
          className="btn btn-tak btn-wedding-date"
          disabled={!date || isSending}
        >
          {isSending ? 'Zapisywanie terminu... 💕' : 'Zatwierdź i lecimy dalej 💕'}
        </button>
      </form>
    </div>
  )
}

