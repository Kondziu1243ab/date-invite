import type { Graphics } from 'pixi.js'
import type { BiomeId, Metrics } from '../types'

export function drawBackdrop(view: Graphics, metrics: Metrics, biome: BiomeId): void {
  view.clear()
  if (biome === 'museum') {
    // Majestic Egyptian Museum Gallery Backdrop (full height edge-to-edge)
    view.rect(0, 0, metrics.width, metrics.height).fill(0x2a1e12)
    view.rect(0, metrics.height * 0.52, metrics.width, metrics.height * 0.48).fill(0x1e150c)

    // Warm museum gallery ambient spotlight
    const lightX = metrics.width * 0.5
    const lightR = metrics.width * 0.6
    view.circle(lightX, metrics.height * 0.22, lightR).fill({ color: 0xffd54f, alpha: 0.08 })

    // Sandstone masonry wall horizontal bands from top down
    for (let y = 32 * metrics.unit; y < metrics.height - 24 * metrics.unit; y += 38 * metrics.unit) {
      view.moveTo(0, y).lineTo(metrics.width, y).stroke({ width: 1.2, color: 0x4e3820, alpha: 0.35 })
    }

    // Side Egyptian Columns with gold lotus highlights
    const pillarW = 20 * metrics.unit

    // Left pillar
    view
      .rect(0, 0, pillarW, metrics.height)
      .fill(0x3e2c1a)
      .stroke({ width: 1.5, color: 0x6d4c2d })
    view.rect(pillarW * 0.8, 0, pillarW * 0.2, metrics.height).fill({ color: 0xffd54f, alpha: 0.1 })

    // Right pillar
    view
      .rect(metrics.width - pillarW, 0, pillarW, metrics.height)
      .fill(0x3e2c1a)
      .stroke({ width: 1.5, color: 0x6d4c2d })
    view.rect(metrics.width - pillarW, 0, pillarW * 0.2, metrics.height).fill({ color: 0xffd54f, alpha: 0.1 })

    // Gold hieroglyphic decorative band across upper gallery
    const friezeY = metrics.height * 0.26
    const friezeH = 8 * metrics.unit
    view.rect(0, friezeY, metrics.width, friezeH).fill({ color: 0xd4af37, alpha: 0.22 })
    view.moveTo(0, friezeY).lineTo(metrics.width, friezeY).stroke({ width: 1.2, color: 0xffd54f, alpha: 0.5 })
    view.moveTo(0, friezeY + friezeH).lineTo(metrics.width, friezeY + friezeH).stroke({ width: 1.2, color: 0xffd54f, alpha: 0.5 })

    // Clean polished golden floor trim at the very bottom
    const baseH = 24 * metrics.unit
    view.rect(0, metrics.height - baseH, metrics.width, baseH).fill(0x181008)
    view
      .moveTo(0, metrics.height - baseH)
      .lineTo(metrics.width, metrics.height - baseH)
      .stroke({ width: 2, color: 0xd4af37, alpha: 0.65 })

    return
  }

  if (biome === 'invisible_exhibition') {
    // Mysterious Sensory Dark Hall (Niewidzialna Wystawa)
    // Deep midnight room base
    view.rect(0, 0, metrics.width, metrics.height * 0.65).fill(0x08070e)
    view.rect(0, metrics.height * 0.65, metrics.width, metrics.height * 0.35).fill(0x050409)

    // Acoustic dark velvet wall panels (subtle vertical slats)
    for (let x = 24 * metrics.unit; x < metrics.width; x += 38 * metrics.unit) {
      view
        .moveTo(x, 0)
        .lineTo(x, metrics.height * 0.78)
        .stroke({ width: 1.2, color: 0x181524, alpha: 0.45 })
    }

    // Sensory tactile guidance floor (Żółta ścieżka dotykowa dla niewidomych)
    const floorY = metrics.height * 0.82
    view.rect(0, floorY, metrics.width, metrics.height - floorY).fill(0x0a0910)
    view.moveTo(0, floorY).lineTo(metrics.width, floorY).stroke({ width: 2, color: 0x221d30 })

    // Yellow tactile sensory paving strips along floor
    const stripY = metrics.height * 0.88
    view.rect(0, stripY, metrics.width, 6 * metrics.unit).fill({ color: 0xffc107, alpha: 0.25 })
    // Raised tactile guidance dots/bumps
    for (let bx = 16 * metrics.unit; bx < metrics.width; bx += 22 * metrics.unit) {
      view.circle(bx, stripY + 3 * metrics.unit, 1.8 * metrics.unit).fill({ color: 0xffd54f, alpha: 0.35 })
    }

    // Subtle dark room pillars at edges
    const pillarW = 16 * metrics.unit
    view.rect(0, 0, pillarW, metrics.height).fill({ color: 0x0f0d1a, alpha: 0.6 })
    view.rect(metrics.width - pillarW, 0, pillarW, metrics.height).fill({ color: 0x0f0d1a, alpha: 0.6 })
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
