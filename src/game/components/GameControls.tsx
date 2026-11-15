export type GameControlsProps = {
  onSteer: (direction: -1 | 1) => void
}

export function GameControls({ onSteer }: GameControlsProps) {
  return (
    <div className="mobile-game-controls" aria-label="Sterowanie dotykowe">
      <button
        type="button"
        className="game-control game-control-left"
        aria-label="Steruj w lewo"
        onPointerDown={(event) => {
          event.preventDefault()
          onSteer(-1)
        }}
      >
        ←
      </button>
      <button
        type="button"
        className="game-control game-control-right"
        aria-label="Steruj w prawo"
        onPointerDown={(event) => {
          event.preventDefault()
          onSteer(1)
        }}
      >
        →
      </button>
    </div>
  )
}
