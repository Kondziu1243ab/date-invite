import { useState } from 'react'
import { playRightAnswer, playWrongAnswer } from './soundEffects'

type FaceMood = 'neutral' | 'sad' | 'happy'

type FaceQuestionProps = {
  onAccept: () => void
}

export default function FaceQuestion({ onAccept }: FaceQuestionProps) {
  const [mood, setMood] = useState<FaceMood>('neutral')
  const [noClicks, setNoClicks] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleYes = () => {
    setMood('happy')
    try {
      playRightAnswer()
    } catch {
      // Audio error handling
    }

    // Użytkownik ma czas, by spokojnie zobaczyć uśmiechniętą buźkę i napis "Super! Zaczynamy!"
    setTimeout(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        onAccept()
      }, 650)
    }, 1300)
  }

  const handleNo = () => {
    setMood('sad')
    setNoClicks((prev) => prev + 1)
    try {
      playWrongAnswer()
    } catch {
      // Audio error handling
    }
  }

  const getSadHeading = () => {
    if (noClicks <= 1) return 'Why not?'
    if (noClicks === 2) return 'Nadal nie?'
    return 'Na pewno?'
  }

  const getSadSubtitle = () => {
    if (noClicks <= 1) return 'Zajmie dosłownie chwilę.'
    return 'Krótka gra i od razu przechodzimy dalej.'
  }

  return (
    <div className={`face-question-container ${isTransitioning ? 'face-exiting' : ''}`}>
      {/* Animowana buźka */}
      <div className={`face-wrapper mood-${mood} ${mood === 'sad' ? 'face-shake' : ''}`}>
        <svg
          viewBox="0 0 120 120"
          className="face-svg"
          aria-hidden="true"
        >
          <defs>
            {/* Neutral / Happy Gradient */}
            <radialGradient id="faceGradWarm" cx="38%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#FFF9C4" />
              <stop offset="45%" stopColor="#FFD54F" />
              <stop offset="85%" stopColor="#FFA000" />
              <stop offset="100%" stopColor="#FF8F00" />
            </radialGradient>

            {/* Sad Soft Melancholic Gradient */}
            <radialGradient id="faceGradSad" cx="38%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#FFF9C4" />
              <stop offset="50%" stopColor="#FFE082" />
              <stop offset="85%" stopColor="#CFD8DC" />
              <stop offset="100%" stopColor="#90A4AE" />
            </radialGradient>

            {/* Cheek blush */}
            <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF8A80" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FF8A80" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Kształt buźki */}
          <circle
            cx="60"
            cy="60"
            r="52"
            fill={mood === 'sad' ? 'url(#faceGradSad)' : 'url(#faceGradWarm)'}
            stroke={mood === 'sad' ? '#78909C' : '#FF8F00'}
            strokeWidth="3.5"
            className="face-circle"
          />

          {/* Rumieńce */}
          <ellipse
            cx="28"
            cy="67"
            rx="9"
            ry="6"
            fill="url(#blushGrad)"
            opacity={mood === 'happy' ? 1 : mood === 'sad' ? 0.35 : 0.65}
            className="face-cheek"
          />
          <ellipse
            cx="92"
            cy="67"
            rx="9"
            ry="6"
            fill="url(#blushGrad)"
            opacity={mood === 'happy' ? 1 : mood === 'sad' ? 0.35 : 0.65}
            className="face-cheek"
          />

          {/* Brwi */}
          {mood === 'sad' ? (
            <g className="eyebrows-sad">
              <path d="M 33 42 Q 41 33 49 39" fill="none" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" />
              <path d="M 87 42 Q 79 33 71 39" fill="none" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : mood === 'happy' ? (
            <g className="eyebrows-happy">
              <path d="M 34 35 Q 42 28 50 35" fill="none" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" />
              <path d="M 86 35 Q 78 28 70 35" fill="none" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : (
            <g className="eyebrows-neutral">
              <path d="M 35 38 L 49 38" fill="none" stroke="#5D4037" strokeWidth="2.8" strokeLinecap="round" />
              <path d="M 85 38 L 71 38" fill="none" stroke="#5D4037" strokeWidth="2.8" strokeLinecap="round" />
            </g>
          )}

          {/* Oczy */}
          {mood === 'happy' ? (
            <g className="eyes-happy">
              <path d="M 34 49 Q 43 38 52 49" fill="none" stroke="#3E2723" strokeWidth="4" strokeLinecap="round" />
              <path d="M 68 49 Q 77 38 86 49" fill="none" stroke="#3E2723" strokeWidth="4" strokeLinecap="round" />
            </g>
          ) : mood === 'sad' ? (
            <g className="eyes-sad">
              <circle cx="43" cy="49" r="7.5" fill="#263238" />
              <circle cx="41" cy="46" r="3" fill="#FFFFFF" />
              <circle cx="45" cy="51" r="1.5" fill="#FFFFFF" />

              <circle cx="77" cy="49" r="7.5" fill="#263238" />
              <circle cx="75" cy="46" r="3" fill="#FFFFFF" />
              <circle cx="79" cy="51" r="1.5" fill="#FFFFFF" />

              {/* Animowana łezka */}
              <path
                d="M 38 58 C 36 62, 33 66, 33 68 C 33 71, 35.5 73, 38 73 C 40.5 73, 43 71, 43 68 C 43 66, 40 62, 38 58 Z"
                fill="#4FC3F7"
                opacity="0.9"
                className="anim-teardrop"
              />
            </g>
          ) : (
            <g className="eyes-neutral">
              <ellipse cx="43" cy="48" rx="6.5" ry="7" fill="#263238" className="anim-blink" />
              <circle cx="41.5" cy="45.5" r="2.5" fill="#FFFFFF" />
              <ellipse cx="77" cy="48" rx="6.5" ry="7" fill="#263238" className="anim-blink" />
              <circle cx="75.5" cy="45.5" r="2.5" fill="#FFFFFF" />
            </g>
          )}

          {/* Usta:
              Neutral = poziomy uśmiech (linia prosta pozioma M 40 70 L 80 70)
              Sad = smutny łuk w dół
              Happy = radosny szeroki uśmiech */}
          {mood === 'neutral' && (
            <path
              d="M 40 70 L 80 70"
              fill="none"
              stroke="#4E342E"
              strokeWidth="4"
              strokeLinecap="round"
              className="mouth-neutral"
            />
          )}

          {mood === 'sad' && (
            <path
              d="M 40 76 Q 60 60 80 76"
              fill="none"
              stroke="#37474F"
              strokeWidth="4.2"
              strokeLinecap="round"
              className="mouth-sad"
            />
          )}

          {mood === 'happy' && (
            <g className="mouth-happy-group">
              <path
                d="M 37 66 Q 60 92 83 66 Q 60 76 37 66 Z"
                fill="#C62828"
                stroke="#5D4037"
                strokeWidth="3.5"
                strokeLinejoin="round"
                className="mouth-happy"
              />
              <path
                d="M 50 78 Q 60 88 70 78 Q 60 82 50 78 Z"
                fill="#FF8A80"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Teksty */}
      <div className="face-text-block">
        {mood === 'neutral' && (
          <h2 className="face-heading">Czy chciałbyś zagrać w grę?</h2>
        )}

        {mood === 'sad' && (
          <div className="face-msg-sad">
            <h2 className="face-heading text-sad">{getSadHeading()}</h2>
            <p className="face-subheading">{getSadSubtitle()}</p>
          </div>
        )}

        {mood === 'happy' && (
          <div className="face-msg-happy">
            <h2 className="face-heading text-happy">Super! Zaczynamy!</h2>
          </div>
        )}
      </div>

      {/* Przyciski */}
      <div className="button-row face-button-row">
        <button
          type="button"
          className={`btn btn-tak ${mood === 'sad' ? 'btn-tak-pulse' : ''}`}
          onClick={handleYes}
          disabled={mood === 'happy' || isTransitioning}
        >
          {mood === 'sad' ? 'Może jednak' : 'Tak'}
        </button>
        <button
          type="button"
          className="btn btn-nie"
          onClick={handleNo}
          disabled={mood === 'happy' || isTransitioning}
        >
          Nie
        </button>
      </div>
    </div>
  )
}
