import type { Metrics } from '../types'

export const createMetrics = (width: number, height: number): Metrics => ({
  width,
  height,
  xScale: Math.max(width / 340, 0.72),
  yScale: Math.max(height / 520, 0.72),
  unit: Math.max(Math.min(width / 340, height / 520), 0.72),
})
