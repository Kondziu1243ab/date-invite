import type { EventBanner } from '../types'

export type GameEventBannerProps = {
  eventBanner: EventBanner
}

export function GameEventBanner({ eventBanner }: GameEventBannerProps) {
  return (
    <div className="game-event-banner">
      <div className={`event-banner-card type-${eventBanner.type}`}>
        <span className="event-banner-title">{eventBanner.title}</span>
        <span className="event-banner-sub">{eventBanner.subtitle}</span>
        <div className="event-banner-timer">
          <div className="event-banner-timer-fill" />
        </div>
      </div>
    </div>
  )
}
