import { useState } from 'react'

export type WeddingVenue = 'glamour' | 'rustic' | 'garden'
export type WeddingCrown = 'crown' | 'wreath' | 'tiara'
export type WeddingMusic = 'waltz' | 'rock' | 'jazz'
export type WeddingDrink = 'champagne' | 'aperol' | 'garage'

export type WeddingPlan = {
  venue: WeddingVenue
  crown: WeddingCrown
  music: WeddingMusic
  drink: WeddingDrink
}

export const VENUE_DETAILS: Record<WeddingVenue, { label: string; emoji: string; desc: string }> = {
  glamour: {
    label: 'Pałac Glamour',
    emoji: '🏰',
    desc: 'Złote żyrandole, szampański blask i marmurowy parkiet.',
  },
  rustic: {
    label: 'Rustykalna Stodoła',
    emoji: '🌿',
    desc: 'Ciepłe drewno, nastrojowe lampki edisona i eukaliptus.',
  },
  garden: {
    label: 'Królewski Ogród',
    emoji: '🌸',
    desc: 'Różane girlandy, romantyczny róż i blask świec.',
  },
}

export const CROWN_DETAILS: Record<WeddingCrown, { label: string; emoji: string; desc: string }> = {
  crown: {
    label: 'Złota Korona',
    emoji: '👑',
    desc: 'Królewskie złoto z rubinem i szafirami.',
  },
  wreath: {
    label: 'Wianek Różany',
    emoji: '🌸',
    desc: 'Świeże pąki róż i gałązki mirtu.',
  },
  tiara: {
    label: 'Kryształowy Diadem',
    emoji: '✨',
    desc: 'Lśniące diamenty i platynowy blask.',
  },
}

export const MUSIC_DETAILS: Record<WeddingMusic, { label: string; emoji: string; desc: string }> = {
  waltz: {
    label: 'Walc Wiedeński',
    emoji: '🎻',
    desc: 'Klasyczny, dostojny i romantyczny.',
  },
  rock: {
    label: 'Rock & Roll!',
    emoji: '🪩',
    desc: 'Radosna, szalona zabawa na parkiecie.',
  },
  jazz: {
    label: 'Zmysłowy Jazz',
    emoji: '🎷',
    desc: 'Płynne, nastrojowe dźwięki saksofonu.',
  },
}

export const DRINK_DETAILS: Record<WeddingDrink, { label: string; emoji: string; desc: string }> = {
  champagne: {
    label: 'Szampan & Truskawki',
    emoji: '🥂',
    desc: 'Bąbelki ze świeżymi truskawkami.',
  },
  aperol: {
    label: 'Aperol Spritz',
    emoji: '🍹',
    desc: 'Orzeźwiający pomarańczowy klasyk.',
  },
  garage: {
    label: 'Garage Weselny',
    emoji: '🍺',
    desc: 'Niezawodne ulubione piwko na toast!',
  },
}

type WeddingPlannerModalProps = {
  plan: WeddingPlan
  onChange: (plan: WeddingPlan) => void
  onConfirm: () => void
  isReady: boolean
}

export default function WeddingPlannerModal({
  plan,
  onChange,
  onConfirm,
  isReady,
}: WeddingPlannerModalProps) {
  const [activeTab, setActiveTab] = useState<'venue' | 'crown' | 'music' | 'drink'>('venue')

  return (
    <div className="game-overlay wedding-planner-overlay">
      <div className="game-modal-card wedding-planner-card" onClick={(e) => e.stopPropagation()}>
        <div className="planner-header">
          <span className="checkpoint-badge">Strefa Planowania 📋💒</span>
          <h3 className="modal-heading planner-title">Zaplanujmy Nasze Wesele!</h3>
          <p className="modal-text planner-intro">
            Zanim ruszymy na parkiet, wybierz wystrój sali i weselne detale:
          </p>
        </div>

        {/* Categories Tab Navigation */}
        <div className="planner-tabs" role="tablist">
          <button
            type="button"
            className={`planner-tab-btn ${activeTab === 'venue' ? 'active' : ''}`}
            onClick={() => setActiveTab('venue')}
          >
            🏰 Sala
          </button>
          <button
            type="button"
            className={`planner-tab-btn ${activeTab === 'crown' ? 'active' : ''}`}
            onClick={() => setActiveTab('crown')}
          >
            👑 Welon
          </button>
          <button
            type="button"
            className={`planner-tab-btn ${activeTab === 'music' ? 'active' : ''}`}
            onClick={() => setActiveTab('music')}
          >
            🎵 Taniec
          </button>
          <button
            type="button"
            className={`planner-tab-btn ${activeTab === 'drink' ? 'active' : ''}`}
            onClick={() => setActiveTab('drink')}
          >
            🥂 Toast
          </button>
        </div>

        {/* Tab Content */}
        <div className="planner-content">
          {activeTab === 'venue' && (
            <div className="planner-options-grid">
              {(Object.keys(VENUE_DETAILS) as WeddingVenue[]).map((key) => {
                const item = VENUE_DETAILS[key]
                const selected = plan.venue === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={`planner-option-tile ${selected ? 'selected' : ''}`}
                    onClick={() => onChange({ ...plan, venue: key })}
                  >
                    <span className="planner-tile-emoji">{item.emoji}</span>
                    <strong className="planner-tile-title">{item.label}</strong>
                    <span className="planner-tile-desc">{item.desc}</span>
                  </button>
                )
              })}
            </div>
          )}

          {activeTab === 'crown' && (
            <div className="planner-options-grid">
              {(Object.keys(CROWN_DETAILS) as WeddingCrown[]).map((key) => {
                const item = CROWN_DETAILS[key]
                const selected = plan.crown === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={`planner-option-tile ${selected ? 'selected' : ''}`}
                    onClick={() => onChange({ ...plan, crown: key })}
                  >
                    <span className="planner-tile-emoji">{item.emoji}</span>
                    <strong className="planner-tile-title">{item.label}</strong>
                    <span className="planner-tile-desc">{item.desc}</span>
                  </button>
                )
              })}
            </div>
          )}

          {activeTab === 'music' && (
            <div className="planner-options-grid">
              {(Object.keys(MUSIC_DETAILS) as WeddingMusic[]).map((key) => {
                const item = MUSIC_DETAILS[key]
                const selected = plan.music === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={`planner-option-tile ${selected ? 'selected' : ''}`}
                    onClick={() => onChange({ ...plan, music: key })}
                  >
                    <span className="planner-tile-emoji">{item.emoji}</span>
                    <strong className="planner-tile-title">{item.label}</strong>
                    <span className="planner-tile-desc">{item.desc}</span>
                  </button>
                )
              })}
            </div>
          )}

          {activeTab === 'drink' && (
            <div className="planner-options-grid">
              {(Object.keys(DRINK_DETAILS) as WeddingDrink[]).map((key) => {
                const item = DRINK_DETAILS[key]
                const selected = plan.drink === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={`planner-option-tile ${selected ? 'selected' : ''}`}
                    onClick={() => onChange({ ...plan, drink: key })}
                  >
                    <span className="planner-tile-emoji">{item.emoji}</span>
                    <strong className="planner-tile-title">{item.label}</strong>
                    <span className="planner-tile-desc">{item.desc}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Plan Summary Badges */}
        <div className="planner-summary-pills">
          <span className="planner-pill">{VENUE_DETAILS[plan.venue].emoji} {VENUE_DETAILS[plan.venue].label}</span>
          <span className="planner-pill">{CROWN_DETAILS[plan.crown].emoji} {CROWN_DETAILS[plan.crown].label}</span>
          <span className="planner-pill">{MUSIC_DETAILS[plan.music].emoji} {MUSIC_DETAILS[plan.music].label}</span>
          <span className="planner-pill">{DRINK_DETAILS[plan.drink].emoji} {DRINK_DETAILS[plan.drink].label}</span>
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          className="game-primary-btn planner-confirm-btn"
          disabled={!isReady}
          onClick={onConfirm}
        >
          Zatwierdź plan i wchodzimy na salę! 💒✨
        </button>
      </div>
    </div>
  )
}
