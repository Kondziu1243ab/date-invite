import type { GenieMood } from '../../types'

export type GenieActorProps = {
  mood: GenieMood
  speechText?: string | null
}

export function GenieActor({ mood, speechText }: GenieActorProps) {
  return (
    <div className={`genie-stage mood-${mood}`}>
      <div className="genie-viewport">
        {/* Magic floating cloud & Genie Body SVG */}
        <svg
          viewBox="0 0 240 220"
          className="genie-main-svg"
          aria-hidden="true"
        >
          <defs>
            {/* Cloud Gradients */}
            <radialGradient id="cloudGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#d1c4e9" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#7e57c2" stopOpacity="0.5" />
            </radialGradient>
            <radialGradient id="cloudDarkGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ff8a80" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#d32f2f" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4a148c" stopOpacity="0.6" />
            </radialGradient>

            {/* Genie Skin Gradient */}
            <linearGradient id="genieSkin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4fc3f7" />
              <stop offset="50%" stopColor="#0288d1" />
              <stop offset="100%" stopColor="#01579b" />
            </linearGradient>

            {/* Gold Trim Gradient */}
            <linearGradient id="genieGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff59d" />
              <stop offset="45%" stopColor="#ffd54f" />
              <stop offset="85%" stopColor="#ffb300" />
              <stop offset="100%" stopColor="#ff8f00" />
            </linearGradient>

            {/* Ruby Gem Gradient */}
            <radialGradient id="rubyGlow" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ff5252" />
              <stop offset="70%" stopColor="#d50000" />
              <stop offset="100%" stopColor="#5f0000" />
            </radialGradient>
          </defs>

          {/* 1. Magic Swirling Cloud Base */}
          <g className="genie-cloud-group">
            <ellipse
              cx="120"
              cy="185"
              rx="68"
              ry="22"
              fill={mood === 'wrong' ? 'url(#cloudDarkGrad)' : 'url(#cloudGrad)'}
              filter="drop-shadow(0 0 14px rgba(126, 87, 194, 0.6))"
            />
            {/* Cloud Puffs */}
            <circle cx="85" cy="180" r="26" fill={mood === 'wrong' ? 'url(#cloudDarkGrad)' : 'url(#cloudGrad)'} />
            <circle cx="155" cy="180" r="26" fill={mood === 'wrong' ? 'url(#cloudDarkGrad)' : 'url(#cloudGrad)'} />
            <circle cx="110" cy="172" r="30" fill={mood === 'wrong' ? 'url(#cloudDarkGrad)' : 'url(#cloudGrad)'} />
            <circle cx="135" cy="172" r="28" fill={mood === 'wrong' ? 'url(#cloudDarkGrad)' : 'url(#cloudGrad)'} />
            <circle cx="62" cy="188" r="18" fill={mood === 'wrong' ? 'url(#cloudDarkGrad)' : 'url(#cloudGrad)'} />
            <circle cx="178" cy="188" r="18" fill={mood === 'wrong' ? 'url(#cloudDarkGrad)' : 'url(#cloudGrad)'} />
          </g>

          {/* 2. Genie Smoke Tail tapering from body into cloud */}
          <path
            d="M 98 135 Q 90 160 115 174 Q 130 182 142 165 Q 146 148 142 135 Z"
            fill="url(#genieSkin)"
            className="genie-tail"
          />

          {/* 3. Genie Torso & Vest */}
          <g className="genie-torso-group">
            {/* Main torso */}
            <path
              d="M 82 92 Q 120 102 158 92 L 145 138 Q 120 146 95 138 Z"
              fill="url(#genieSkin)"
              stroke="#01579b"
              strokeWidth="2"
            />
            {/* Muscular contour lines */}
            <path d="M 120 98 L 120 128" stroke="#0277bd" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
            <path d="M 102 112 Q 120 118 138 112" stroke="#0277bd" strokeWidth="2" fill="none" opacity="0.5" />

            {/* Golden Genie Vest */}
            <path
              d="M 82 92 L 100 135 L 94 137 L 76 95 Z"
              fill="url(#genieGold)"
              stroke="#d4af37"
              strokeWidth="1.5"
            />
            <path
              d="M 158 92 L 140 135 L 146 137 L 164 95 Z"
              fill="url(#genieGold)"
              stroke="#d4af37"
              strokeWidth="1.5"
            />
            {/* Golden Belt / Sash */}
            <path
              d="M 93 135 Q 120 144 147 135 L 145 142 Q 120 151 95 142 Z"
              fill="url(#genieGold)"
              stroke="#b78103"
              strokeWidth="1.5"
            />
            <circle cx="120" cy="141" r="5" fill="url(#rubyGlow)" stroke="#ffd54f" strokeWidth="1" />
          </g>

          {/* 4. Genie Head & Facial Expressions */}
          <g className="genie-head-group">
            {/* Ears with Golden Earrings */}
            <circle cx="86" cy="62" r="7" fill="url(#genieSkin)" />
            <circle cx="154" cy="62" r="7" fill="url(#genieSkin)" />
            <circle cx="84" cy="67" r="4.5" fill="none" stroke="url(#genieGold)" strokeWidth="2.5" />
            <circle cx="156" cy="67" r="4.5" fill="none" stroke="url(#genieGold)" strokeWidth="2.5" />

            {/* Face Oval */}
            <ellipse cx="120" cy="62" rx="30" ry="28" fill="url(#genieSkin)" stroke="#01579b" strokeWidth="2" />

            {/* Eyes & Eyebrows depending on mood */}
            {mood === 'wrong' ? (
              // Angry / Frustrated Face
              <g className="face-angry">
                <path d="M 102 50 L 115 57" stroke="#012b4d" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 138 50 L 125 57" stroke="#012b4d" strokeWidth="3.5" strokeLinecap="round" />
                {/* Glowing red slanted eyes */}
                <ellipse cx="109" cy="59" rx="5" ry="3.5" fill="#ffebee" stroke="#d50000" strokeWidth="1.5" />
                <circle cx="109" cy="59" r="2.5" fill="#d50000" />
                <ellipse cx="131" cy="59" rx="5" ry="3.5" fill="#ffebee" stroke="#d50000" strokeWidth="1.5" />
                <circle cx="131" cy="59" r="2.5" fill="#d50000" />
                {/* Teeth gritted frown */}
                <path d="M 108 76 Q 120 70 132 76" stroke="#012b4d" strokeWidth="2.8" strokeLinecap="round" fill="none" />
              </g>
            ) : mood === 'warning' || mood === 'playful' ? (
              // Playful / Winking / Mischievous Face
              <g className="face-playful">
                {/* Raised arched eyebrow */}
                <path d="M 101 50 Q 110 44 117 50" stroke="#012b4d" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 124 53 Q 131 51 138 54" stroke="#012b4d" strokeWidth="3" strokeLinecap="round" fill="none" />
                {/* Left eye open, right eye winking */}
                <ellipse cx="109" cy="58" rx="5.5" ry="4" fill="#ffffff" />
                <circle cx="110" cy="58" r="2.8" fill="#0d47a1" />
                <circle cx="111" cy="56.5" r="1" fill="#ffffff" />
                {/* Winking eye */}
                <path d="M 126 59 Q 131 54 136 59" stroke="#012b4d" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                {/* Cheeky smirk */}
                <path d="M 111 74 Q 124 81 133 73" stroke="#012b4d" strokeWidth="2.8" strokeLinecap="round" fill="none" />
              </g>
            ) : (
              // Friendly / Confident / Default Face
              <g className="face-default">
                <path d="M 102 50 Q 110 46 117 50" stroke="#012b4d" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 123 50 Q 130 46 138 50" stroke="#012b4d" strokeWidth="3" strokeLinecap="round" fill="none" />
                {/* Friendly glowing white eyes with blue pupils */}
                <ellipse cx="109" cy="58" rx="5.5" ry="4" fill="#ffffff" />
                <circle cx="110" cy="58" r="2.8" fill="#0d47a1" />
                <circle cx="111.5" cy="56.5" r="1.1" fill="#ffffff" />
                <ellipse cx="131" cy="58" rx="5.5" ry="4" fill="#ffffff" />
                <circle cx="130" cy="58" r="2.8" fill="#0d47a1" />
                <circle cx="131.5" cy="56.5" r="1.1" fill="#ffffff" />
                {/* Friendly confident smile */}
                <path d="M 111 73 Q 120 80 129 73" stroke="#012b4d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
              </g>
            )}

            {/* Nose */}
            <path d="M 120 59 L 118 66 L 122 66" stroke="#0277bd" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Genie Curled Goatee */}
            <path
              d="M 116 77 Q 120 88 126 86 Q 128 83 124 80 Z"
              fill="#012b4d"
            />

            {/* Oriental Turban */}
            <path
              d="M 88 50 Q 120 20 152 50 Q 155 35 140 24 Q 120 14 100 24 Q 85 35 88 50 Z"
              fill="#5e35b1"
              stroke="#4527a0"
              strokeWidth="2"
            />
            {/* Turban folds */}
            <path d="M 90 44 Q 120 28 150 44" stroke="url(#genieGold)" strokeWidth="3.5" fill="none" />
            <path d="M 94 36 Q 120 22 146 36" stroke="#7e57c2" strokeWidth="2" fill="none" />
            {/* Turban Ruby Brooch with golden setting */}
            <circle cx="120" cy="27" r="7" fill="url(#rubyGlow)" stroke="url(#genieGold)" strokeWidth="2.2" />
            <circle cx="118.5" cy="25" r="2" fill="#ffffff" opacity="0.7" />
            {/* Golden Feather */}
            <path
              d="M 120 20 Q 128 6 136 2 Q 130 12 124 19 Z"
              fill="url(#genieGold)"
              stroke="#b78103"
              strokeWidth="1"
            />
          </g>

          {/* Shoulders / Upper Arms */}
          <path
            d="M 83 95 Q 60 102 52 118"
            stroke="url(#genieSkin)"
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 157 95 Q 180 102 188 118"
            stroke="url(#genieSkin)"
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* ------------------------------------------------------------- */}
        {/* TWO DETACHED FLOATING HANDS ANIMATED INDEPENDENTLY */}
        {/* ------------------------------------------------------------- */}

        {/* Left Floating Hand */}
        <div className={`genie-hand genie-hand-left hand-mood-${mood}`}>
          <svg viewBox="0 0 60 60" className="hand-svg" aria-hidden="true">
            {/* Golden Wristband */}
            <rect x="18" y="38" width="24" height="10" rx="4" fill="url(#genieGold)" stroke="#b78103" strokeWidth="1.5" />
            {/* Magic Palm with fingers */}
            <path
              d="M 22 38 Q 16 28 20 18 Q 23 16 26 21 L 28 14 Q 31 12 33 17 L 35 15 Q 38 13 40 18 L 41 20 Q 45 20 44 26 L 38 38 Z"
              fill="url(#genieSkin)"
              stroke="#01579b"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Palm magical aura sparkle */}
            <circle cx="30" cy="28" r="3.5" fill="#ffffff" opacity="0.75" />
          </svg>
        </div>

        {/* Right Floating Hand (switches to wagging finger on warning/playful!) */}
        <div className={`genie-hand genie-hand-right hand-mood-${mood}`}>
          {mood === 'warning' || mood === 'playful' ? (
            // Wagging Index Finger
            <svg viewBox="0 0 60 60" className="hand-svg" aria-hidden="true">
              <rect x="18" y="38" width="24" height="10" rx="4" fill="url(#genieGold)" stroke="#b78103" strokeWidth="1.5" />
              {/* Pointing Index Finger with other fingers curled */}
              <path
                d="M 24 38 L 24 12 Q 28 8 31 12 L 31 24 Q 38 23 37 30 Q 40 31 39 36 L 38 38 Z"
                fill="url(#genieSkin)"
                stroke="#01579b"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="28" cy="12" r="3" fill="#ffe082" opacity="0.8" />
            </svg>
          ) : mood === 'triumph' ? (
            // Holding / Summoning Golden Key
            <svg viewBox="0 0 60 60" className="hand-svg" aria-hidden="true">
              <rect x="18" y="38" width="24" height="10" rx="4" fill="url(#genieGold)" stroke="#b78103" strokeWidth="1.5" />
              <path
                d="M 20 38 Q 17 28 22 20 Q 25 18 28 23 L 30 18 Q 33 16 35 21 L 40 22 Q 44 24 42 30 L 38 38 Z"
                fill="url(#genieSkin)"
                stroke="#01579b"
                strokeWidth="1.8"
              />
              {/* Golden Key spark */}
              <circle cx="30" cy="22" r="5" fill="#ffd700" filter="drop-shadow(0 0 6px #ffea00)" />
            </svg>
          ) : (
            // Default Open Mystical Hand
            <svg viewBox="0 0 60 60" className="hand-svg" aria-hidden="true">
              <rect x="18" y="38" width="24" height="10" rx="4" fill="url(#genieGold)" stroke="#b78103" strokeWidth="1.5" />
              <path
                d="M 38 38 Q 44 28 40 18 Q 37 16 34 21 L 32 14 Q 29 12 27 17 L 25 15 Q 22 13 20 18 L 19 20 Q 15 20 16 26 L 22 38 Z"
                fill="url(#genieSkin)"
                stroke="#01579b"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="30" cy="28" r="3.5" fill="#ffffff" opacity="0.75" />
            </svg>
          )}
        </div>

        {/* Dynamic Speech Bubble coming directly from Genie's head */}
        {speechText && (
          <div className={`genie-speech-bubble bubble-${mood}`}>
            <div className="bubble-tail" />
            <p className="bubble-text">{speechText}</p>
          </div>
        )}
      </div>
    </div>
  )
}
