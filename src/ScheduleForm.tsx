import { useState, useEffect } from 'react'

const PLACES = [
  { value: 'park', label: 'Spacer w parku 🌳' },
  { value: 'pub', label: 'Pub 🍻' },
  { value: 'kinoplener', label: 'Gra w Paletki 🎾' },
  { value: 'suprise', label: 'Zaskocz mnie 🤫' },
  { value: 'wiselka', label: 'Gotowanie 🍳' },
  { value: 'film', label: 'Netlix & chill 🍿' },
] as const

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type ScheduleFormProps = {
  onScheduled: (date: string, placeLabel: string) => void
  isFoccaciaMode: boolean
  setIsFoccaciaMode: (val: boolean) => void
}

export default function ScheduleForm({
  onScheduled,
  isFoccaciaMode: _isFoccaciaMode,
}: ScheduleFormProps) {
  const [date, setDate] = useState('')
  const [place, setPlace] = useState('')
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Close custom dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.custom-select-container')) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [isOpen])

  function handleSubmit() {
    if (!date && !place) {
      setError('Wybierz datę i aktywność.')
      return
    }
    if (!date) {
      setError('Wybierz datę randki.')
      return
    }
    if (!place) {
      setError('Wybierz aktywność.')
      return
    }

    const label = PLACES.find((p) => p.value === place)?.label ?? place
    onScheduled(date, label)
  }

  function handleOptionSelect(value: string) {
    setPlace(value)
    setIsOpen(false)
  }

  return (
    <div className="schedule-form">
      <label className="form-field">
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
        <div className="custom-select-container">
          <div
            className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
            onClick={() => {
              setIsOpen(!isOpen)
              setError('')
            }}
          >
            <span>
              {place
                ? PLACES.find((p) => p.value === place)?.label
                : 'Wybierz aktywność…'}
            </span>
            <span className="arrow">▼</span>
          </div>

          {isOpen && (
            <ul className="custom-select-options">
              {PLACES.map((p) => {
                return (
                  <li
                    key={p.value}
                    className="custom-select-option"
                    onClick={() => handleOptionSelect(p.value)}
                  >
                    {p.label}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button
        type="button"
        className="btn btn-umow"
        onClick={handleSubmit}
      >
        Umówieni 
      </button>
    </div>
  )
}
