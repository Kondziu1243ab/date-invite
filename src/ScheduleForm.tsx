import { useState, useEffect } from 'react'

const PLACES = [
  { value: 'park', label: 'Statki w parku 🌳' },
  { value: 'pub', label: 'Pub 🍻' },
  { value: 'kinoplener', label: 'Kino plenerowe 🎬 ' },
  { value: 'suprise', label: 'Zaskocz mnie 🤫' },
  { value: 'wiselka', label: 'Piwko nad wisełką 🍻' },
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
  // setIsFoccaciaMode,
}: ScheduleFormProps) {
  const [date, setDate] = useState('')
  const [place, _setPlace] = useState('')
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  // const [animatingOption, setAnimatingOption] = useState<string | null>(null)

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
    if (!date) {
      setError('Wybierz datę randki.')
      return
    }

    const label = PLACES.find((p) => p.value === place)?.label ?? place
    onScheduled(date, label)
  }

  /*
  function handleOptionSelect(value: string) {
    // Normal selection behavior
    setPlace(value)
    setIsOpen(false)

    /* Focaccia mode commented out:
    if (isFoccaciaMode || animatingOption) return

    setAnimatingOption(value)
    setIsFoccaciaMode(true)

    // Play transition for 1200ms, then swap to locked foccacia state
    setTimeout(() => {
      setPlace('foccacia')
      setAnimatingOption(null)
      setIsOpen(false)
    }, 1200)
    * /
  }
  */

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

      {/* Opcja wyboru miejsca zakomentowana:
      <label className="form-field">
        <span className="form-label">Gdzie?</span>
        <div className="custom-select-container">
          <div
            className={`custom-select-trigger ${isFoccaciaMode ? 'locked' : ''} ${isOpen ? 'open' : ''}`}
            onClick={() => {
              if (!isFoccaciaMode) {
                setIsOpen(!isOpen)
                setError('')
              }
            }}
          >
            <span>
              {place
                ? PLACES.find((p) => p.value === place)?.label
                : 'Wybierz miejsce…'}
            </span>
            <span className="arrow">{isFoccaciaMode ? '🔒' : '▼'}</span>
          </div>

          {isOpen && (
            <ul className="custom-select-options">
              {PLACES.map((p) => {
                let optionClass = 'custom-select-option'
                return (
                  <li
                    key={p.value}
                    className={optionClass}
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
      */}

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
