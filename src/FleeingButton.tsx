import { useCallback, useEffect, useRef, useState } from 'react'

const MARGIN = 16

function randomPosition(width: number, height: number) {
  const maxLeft = window.innerWidth - width - MARGIN
  const maxTop = window.innerHeight - height - MARGIN
  const safeMaxLeft = Math.max(MARGIN, maxLeft)
  const safeMaxTop = Math.max(MARGIN, maxTop)

  return {
    left: MARGIN + Math.random() * (safeMaxLeft - MARGIN),
    top: MARGIN + Math.random() * (safeMaxTop - MARGIN),
  }
}

function clampPosition(
  left: number,
  top: number,
  width: number,
  height: number,
) {
  const maxLeft = window.innerWidth - width - MARGIN
  const maxTop = window.innerHeight - height - MARGIN
  return {
    left: Math.min(Math.max(MARGIN, left), Math.max(MARGIN, maxLeft)),
    top: Math.min(Math.max(MARGIN, top), Math.max(MARGIN, maxTop)),
  }
}

type FleeingButtonProps = {
  text?: string
  onFlee?: () => void
}

export default function FleeingButton({ text = 'Zastanowię się 😉', onFlee }: FleeingButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [hasFled, setHasFled] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  )

  const flee = useCallback(() => {
    const el = btnRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const next = randomPosition(rect.width, rect.height)
    setHasFled(true)
    setPosition(next)
    if (onFlee) {
      onFlee()
    }
  }, [onFlee])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    flee()
  }

  useEffect(() => {
    if (!hasFled || position === null) return

    const handleResize = () => {
      const el = btnRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPosition((prev) =>
        prev ? clampPosition(prev.left, prev.top, rect.width, rect.height) : prev,
      )
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [hasFled, position])

  const style =
    hasFled && position
      ? { left: position.left, top: position.top }
      : undefined

  const className = ['btn', 'btn-think', hasFled ? 'fleeing-btn' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={btnRef}
      type="button"
      className={className}
      style={style}
      onClick={handleClick}
      aria-label={text}
    >
      {text}
    </button>
  )
}

