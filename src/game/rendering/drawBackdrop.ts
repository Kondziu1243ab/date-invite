import type { Graphics } from 'pixi.js'
import type { BiomeId, Metrics } from '../types'

export function drawBackdrop(view: Graphics, metrics: Metrics, biome: BiomeId): void {
  view.clear()
  if (biome === 'museum') {
    // Majestic Egyptian Museum Gallery Backdrop
    view.rect(0, 0, metrics.width, metrics.height * 0.58).fill(0x2a1e12)
    view.rect(0, metrics.height * 0.58, metrics.width, metrics.height * 0.42).fill(0x181008)

    // Warm museum spotlight
    const lightX = metrics.width * 0.5
    const lightR = metrics.width * 0.55
    view.circle(lightX, metrics.height * 0.2, lightR).fill({ color: 0xffd54f, alpha: 0.07 })

    // Sandstone masonry wall bands
    for (let y = 32; y < metrics.height * 0.68; y += 36) {
      view.moveTo(0, y).lineTo(metrics.width, y).stroke({ width: 1, color: 0x4e3820, alpha: 0.35 })
    }

    // Side Egyptian Columns with gold lotus capitals
    const pillarW = 20 * metrics.unit
    // Left pillar
    view
      .rect(0, 0, pillarW, metrics.height)
      .fill(0x3e2c1a)
      .stroke({ width: 1.5, color: 0x6d4c2d })
    view.rect(pillarW * 0.8, 0, pillarW * 0.2, metrics.height).fill({ color: 0xffd54f, alpha: 0.09 })
    // Right pillar
    view
      .rect(metrics.width - pillarW, 0, pillarW, metrics.height)
      .fill(0x3e2c1a)
      .stroke({ width: 1.5, color: 0x6d4c2d })
    view.rect(metrics.width - pillarW, 0, pillarW * 0.2, metrics.height).fill({ color: 0xffd54f, alpha: 0.09 })

    // Gold hieroglyphic trim strip
    view.rect(0, metrics.height * 0.26, metrics.width, 8 * metrics.unit).fill({ color: 0xd4af37, alpha: 0.2 })

    // Floor edge
    view.rect(0, metrics.height * 0.85, metrics.width, metrics.height * 0.15).fill(0x110a04)
    view
      .moveTo(0, metrics.height * 0.85)
      .lineTo(metrics.width, metrics.height * 0.85)
      .stroke({ width: 2, color: 0xd4af37, alpha: 0.55 })
    return
  }

  const palette =
    biome === 'spring'
      ? [0xf7fff1, 0xe5f7d5, 0x9fd596]
      : [0xf4fafd, 0xe3f2fd, 0x9ec5e5] // Winter crisp blue

  view
    .rect(0, 0, metrics.width, metrics.height * 0.48)
    .fill(palette[0])
    .rect(0, metrics.height * 0.48, metrics.width, metrics.height * 0.52)
    .fill(palette[1])
    .rect(0, metrics.height * 0.82, metrics.width, metrics.height * 0.18)
    .fill({ color: palette[2], alpha: 0.22 })
}
