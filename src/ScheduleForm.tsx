import { useState, useEffect, useRef } from 'react'

const INITIAL_PLACES = [
  { value: 'park', label: 'Spacer w parku 🌳' },
  { value: 'drink', label: 'Drink z palemką gdzieś nad oceanem 🍹' },
  { value: 'suprise', label: 'Zaskocz mnie 🤫' },
  { value: 'kawiarnia', label: 'Gym, cardio, soczek 🔥' },
  { value: 'home', label: 'Netflix and chill 🍿' },
]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type ScheduleFormProps = {
  onNext: (date: string, placeLabel: string) => void
  onMessageChange: (msg: { text: string; type: 'warning' | 'joke' } | null) => void
}

export default function ScheduleForm({ onNext, onMessageChange }: ScheduleFormProps) {
  const [date, setDate] = useState('')
  const [place, setPlace] = useState('')
  const [error, setError] = useState('')

  // Custom options state to handle addition/removal dynamically
  const [options, setOptions] = useState(INITIAL_PLACES)
  const [isOpen, setIsOpen] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [firstChoiceMade, setFirstChoiceMade] = useState(false)

  const [animatingOutValue, setAnimatingOutValue] = useState<string | null>(null)
  const [animatingInValue, setAnimatingInValue] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  function handleSelectOption(val: string) {
    if (animatingOutValue || animatingInValue) return

    // Scenario 2: Check first choice
    if (!firstChoiceMade) {
      setFirstChoiceMade(true)
      if (val !== 'drink') {
        setIsBlocked(true)
        onMessageChange({
          text: 'Hej, a nie chciałaś drinka nad oceanem?',
          type: 'warning',
        })
        setPlace(val)
        setError('')
        setIsOpen(false)
        return
      }
    }

    // Scenario 1: Select "Drink z palemką" (either first choice or to unblock)
    if (val === 'drink') {
      if (isBlocked) {
        setIsBlocked(false)
      }

      setPlace('drink')
      setError('')

      // 1. Immediately show the joke message in the header
      onMessageChange({
        text: 'Żartowałem z tą opcją, spytaj po wypłacie ;D',
        type: 'joke',
      })
      setIsOpen(true) // keep dropdown open so user sees the animation

      // 2. Wait 1 second (1000ms) before starting the fade-out/slide-right animation
      setTimeout(() => {
        setAnimatingOutValue('drink')

        // 3. Wait another 1600ms (duration of the fade-out animation) to remove/add options and trigger slide-in
        setTimeout(() => {
          // Remove the option
          setOptions((prev) => prev.filter((o) => o.value !== 'drink'))

          // Insert new "Just drink" option at same position
          const newOpt = { value: 'just_drink', label: 'Just drink 🍹' }
          setOptions((prev) => {
            const nextOptions = [...prev]
            nextOptions.splice(1, 0, newOpt)
            return nextOptions
          })

          setAnimatingOutValue(null)
          setAnimatingInValue('just_drink')
          setPlace('just_drink')

          // 4. Wait another 1600ms (duration of slide-in animation) to clear animation state and close dropdown
          setTimeout(() => {
            setAnimatingInValue(null)
            setIsOpen(false)
          }, 1600)
        }, 1600)
      }, 1000)
    } else {
      // Normal choice selection
      setPlace(val)
      setError('')
      setIsOpen(false)
    }
  }

  function handleSubmit() {
    if (isBlocked) {
      setError('Wybierz odpowiednie miejsce, aby przejść dalej.')
      return
    }
    if (!date || !place) {
      setError('Wybierz datę i miejsce randki.')
      return
    }

    const label = options.find((p) => p.value === place)?.label ?? place
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
        <div className="custom-select-container" ref={dropdownRef}>
          <button
            type="button"
            className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
            onClick={() => {
              if (!animatingOutValue && !animatingInValue) {
                setIsOpen(!isOpen)
              }
            }}
          >
            <span>
              {place === 'drink' ? '\u00A0' : (options.find((o) => o.value === place)?.label ?? 'Wybierz miejsce…')}
            </span>
            <span className={`custom-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
          </button>

          {isOpen && (
            <div className="custom-select-options">
              {options.map((opt) => {
                const isAnimatingOut = opt.value === animatingOutValue
                const isAnimatingIn = opt.value === animatingInValue
                const isSelected = opt.value === place

                return (
                  <div
                    key={opt.value}
                    className={`custom-select-option ${isSelected ? 'selected' : ''} ${
                      isAnimatingOut ? 'option-animating-out' : ''
                    } ${isAnimatingIn ? 'option-animating-in' : ''}`}
                    onClick={() => handleSelectOption(opt.value)}
                  >
                    {opt.label}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button
        type="button"
        className="btn btn-umow"
        onClick={handleSubmit}
        disabled={isBlocked}
        style={{
          opacity: isBlocked ? 0.6 : 1,
          cursor: isBlocked ? 'not-allowed' : 'pointer'
        }}
      >
        Umówieni 💌
      </button>
    </div>
  )
}


