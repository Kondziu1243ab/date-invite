import { useState, useEffect } from 'react'
import { notifyScheduled } from './notifyNtfy'

const PLACES = [
  { value: 'park', label: 'Spacer w parku 🌳' },
  { value: 'pub', label: 'Pub 🍻' },
  { value: 'komputer', label: 'Night ride 🚀' },
  { value: 'suprise', label: 'Zaskocz mnie 🤫' },
  { value: 'kawiarnia', label: 'Zagrajmy w grę 🎮' },  
  { value: 'home', label: 'Netflix and chill 🍿' },
  { value: 'foccacia', label: 'Focaccia i piknik w parku 🧺' },
] as const

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type ScheduleFormProps = {
  onScheduled: () => void
  isFoccaciaMode: boolean
  setIsFoccaciaMode: (val: boolean) => void
}

export default function ScheduleForm({
  onScheduled,
  isFoccaciaMode,
  setIsFoccaciaMode,
}: ScheduleFormProps) {
  const [date, setDate] = useState('')
  const [place, setPlace] = useState('')
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [animatingOption, setAnimatingOption] = useState<string | null>(null)

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

  async function handleSubmit() {
    if (!date || !place) {
      setError('Wybierz datę i miejsce randki.')
      return
    }

    const label = PLACES.find((p) => p.value === place)?.label ?? place
    await notifyScheduled(date, label)
    onScheduled()
  }

  function handleOptionSelect(value: string) {
    if (isFoccaciaMode || animatingOption) return

    setAnimatingOption(value)
    setIsFoccaciaMode(true)

    // Play transition for 1200ms, then swap to locked foccacia state
    setTimeout(() => {
      setPlace('foccacia')
      setAnimatingOption(null)
      setIsOpen(false)
    }, 1200)
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
                // If not in foccacia mode, hide foccacia from initial dropdown
                if (p.value === 'foccacia' && !isFoccaciaMode && animatingOption !== 'foccacia') {
                  return null
                }

                // If in locked foccacia mode, only render foccacia option
                if (isFoccaciaMode && p.value !== 'foccacia') {
                  return null
                }

                let optionClass = 'custom-select-option'
                if (animatingOption !== null) {
                  if (p.value === animatingOption) {
                    optionClass += ' morphing'
                  } else {
                    optionClass += ' fading-out'
                  }
                }

                return (
                  <li
                    key={p.value}
                    className={optionClass}
                    onClick={() => handleOptionSelect(p.value)}
                  >
                    {animatingOption === p.value ? (
                      <span className="morph-text-wrapper">
                        <span className="original-label">{p.label}</span>
                        <span className="foccacia-label">Focaccia i piknik w parku 🧺</span>
                      </span>
                    ) : (
                      p.label
                    )}
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
        Umówieni 💌
      </button>
    </div>
  )
}
