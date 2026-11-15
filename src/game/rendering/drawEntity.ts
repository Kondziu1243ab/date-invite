import type { BiomeId, Entity } from '../types'

export function drawEntity(entity: Entity, biome: BiomeId, unit: number): void {
  const { graphics, sprite, text } = entity
  graphics.clear()
  sprite.visible = false

  if (entity.kind === 'letter') {
    entity.radius = 16 * unit
    const r = entity.radius

    if (biome === 'invisible_exhibition') {
      // Mystical Bioluminescent Phosphorescent Rune glowing in the dark
      graphics.circle(0, 0, r * 1.5).fill({ color: 0x00e676, alpha: 0.35 })
      graphics.circle(0, 0, r * 1.15).fill({ color: 0x1de9b6, alpha: 0.22 })
      graphics
        .poly(
          [
            0,
            -r * 1.1,
            r * 0.95,
            -r * 0.5,
            r * 0.95,
            r * 0.5,
            0,
            r * 1.1,
            -r * 0.95,
            r * 0.5,
            -r * 0.95,
            -r * 0.5,
          ],
          true
        )
        .fill(0x004d40)
        .stroke({ width: 2.4 * unit, color: 0x69f0ae, join: 'round' })
      graphics.circle(0, 0, r * 0.55).fill({ color: 0x00e676, alpha: 0.65 })
    } else if (biome === 'museum') {
      graphics.circle(0, 0, r * 1.4).fill({ color: 0xffd54f, alpha: 0.35 })
      graphics
        .poly(
          [
            0,
            -r * 1.1,
            r * 0.95,
            -r * 0.5,
            r * 0.95,
            r * 0.5,
            0,
            r * 1.1,
            -r * 0.95,
            r * 0.5,
            -r * 0.95,
            -r * 0.5,
          ],
          true
        )
        .fill(0xb78103)
        .stroke({ width: 2.4 * unit, color: 0xfff59d, join: 'round' })
      graphics.circle(0, 0, r * 0.55).fill({ color: 0xffd700, alpha: 0.65 })
    } else if (biome === 'winter') {
      graphics.circle(0, 0, r * 1.35).fill({ color: 0x4fc3f7, alpha: 0.28 })
      graphics
        .poly(
          [
            0,
            -r,
            r * 0.88,
            -r * 0.5,
            r * 0.88,
            r * 0.5,
            0,
            r,
            -r * 0.88,
            r * 0.5,
            -r * 0.88,
            -r * 0.5,
          ],
          true
        )
        .fill(0x0277bd)
        .stroke({ width: 2.2 * unit, color: 0x81d4fa, join: 'round' })
      graphics.circle(0, 0, r * 0.45).fill({ color: 0x29b6f6, alpha: 0.5 })
    } else {
      graphics.circle(0, 0, r * 1.35).fill({ color: 0xf06292, alpha: 0.28 })
      graphics
        .poly(
          [
            0,
            -r,
            r * 0.88,
            -r * 0.5,
            r * 0.88,
            r * 0.5,
            0,
            r,
            -r * 0.88,
            r * 0.5,
            -r * 0.88,
            -r * 0.5,
          ],
          true
        )
        .fill(0xad1457)
        .stroke({ width: 2.2 * unit, color: 0xf48fb1, join: 'round' })
      graphics.circle(0, 0, r * 0.45).fill({ color: 0xec407a, alpha: 0.5 })
    }

    if (entity.letterData) {
      text.text = entity.letterData.char
      text.style.fontSize = Math.round(17 * unit)
      text.visible = true
    } else {
      text.visible = false
    }
    return
  }

  text.visible = false

  if (entity.kind === 'heart') {
    entity.radius = 15 * unit
    const r = entity.radius
    graphics
      .circle(-r * 0.45, -r * 0.2, r * 0.55)
      .fill(0xef476f)
      .circle(r * 0.45, -r * 0.2, r * 0.55)
      .fill(0xef476f)
      .poly([-r, 0, r, 0, 0, r * 1.2], true)
      .fill(0xef476f)
    graphics.circle(-r * 0.35, -r * 0.38, r * 0.16).fill({ color: 0xffffff, alpha: 0.72 })
    return
  }

  if (
    biome === 'invisible_exhibition' ||
    entity.hazardType === 'black_sunglasses' ||
    entity.hazardType === 'white_cane'
  ) {
    // Czarne Okulary Przeciwsłoneczne / Niewidomego (Dark Stylish Sunglasses)
    entity.radius = 21 * unit
    const r = entity.radius

    // 1. Temples / arms (zauszniki okularów wystające do tyłu)
    // Left temple arm
    graphics
      .poly(
        [
          -r * 0.94,
          -r * 0.22,
          -r * 1.28,
          -r * 0.72,
          -r * 1.18,
          -r * 0.82,
          -r * 0.86,
          -r * 0.34,
        ],
        true
      )
      .fill(0x18181b)
      .stroke({ width: 1.0 * unit, color: 0x27272a })

    // Right temple arm
    graphics
      .poly(
        [
          r * 0.94,
          -r * 0.22,
          r * 1.28,
          -r * 0.72,
          r * 1.18,
          -r * 0.82,
          r * 0.86,
          -r * 0.34,
        ],
        true
      )
      .fill(0x18181b)
      .stroke({ width: 1.0 * unit, color: 0x27272a })

    // Gold / metallic hinge rivets on temple joints
    graphics.circle(-r * 0.92, -r * 0.24, 1.4 * unit).fill(0xd4af37)
    graphics.circle(r * 0.92, -r * 0.24, 1.4 * unit).fill(0xd4af37)

    // 2. Thick stylish acetate frames (oprawki)
    // Left frame outer border
    graphics
      .roundRect(-r * 0.98, -r * 0.44, r * 0.88, r * 0.84, 5 * unit)
      .fill(0x111827)
      .stroke({ width: 2.2 * unit, color: 0x030712 })

    // Right frame outer border
    graphics
      .roundRect(r * 0.1, -r * 0.44, r * 0.88, r * 0.84, 5 * unit)
      .fill(0x111827)
      .stroke({ width: 2.2 * unit, color: 0x030712 })

    // 3. Nose bridge connecting lenses (mostek okularów)
    graphics
      .roundRect(-r * 0.14, -r * 0.3, r * 0.28, 3.4 * unit, 1.6 * unit)
      .fill(0x030712)
      .stroke({ width: 1.2 * unit, color: 0x1f2937 })

    // Keyhole / nose pad contour
    graphics
      .moveTo(-r * 0.12, -r * 0.1)
      .bezierCurveTo(0, -r * 0.22, 0, -r * 0.22, r * 0.12, -r * 0.1)
      .stroke({ width: 1.5 * unit, color: 0x111827 })

    // 4. Dark tinted lenses (ciemne szkła)
    graphics
      .roundRect(-r * 0.92, -r * 0.38, r * 0.76, r * 0.72, 4 * unit)
      .fill(0x09090b)
    graphics
      .roundRect(r * 0.16, -r * 0.38, r * 0.76, r * 0.72, 4 * unit)
      .fill(0x09090b)

    // 5. Glossy glass glare / reflections (charakterystyczny odblask na ciemnych szkłach)
    // Left lens reflection diagonal bands
    graphics
      .poly(
        [
          -r * 0.84,
          -r * 0.34,
          -r * 0.68,
          -r * 0.34,
          -r * 0.86,
          r * 0.18,
          -r * 0.92,
          r * 0.12,
        ],
        true
      )
      .fill({ color: 0x38bdf8, alpha: 0.38 })

    graphics
      .poly(
        [
          -r * 0.62,
          -r * 0.34,
          -r * 0.52,
          -r * 0.34,
          -r * 0.66,
          r * 0.3,
          -r * 0.74,
          r * 0.3,
        ],
        true
      )
      .fill({ color: 0xffffff, alpha: 0.65 })

    // Right lens reflection diagonal bands
    graphics
      .poly(
        [
          r * 0.24,
          -r * 0.34,
          r * 0.4,
          -r * 0.34,
          r * 0.22,
          r * 0.18,
          r * 0.16,
          r * 0.12,
        ],
        true
      )
      .fill({ color: 0x38bdf8, alpha: 0.38 })

    graphics
      .poly(
        [
          r * 0.46,
          -r * 0.34,
          r * 0.56,
          -r * 0.34,
          r * 0.42,
          r * 0.3,
          r * 0.34,
          r * 0.3,
        ],
        true
      )
      .fill({ color: 0xffffff, alpha: 0.65 })

    // Sleek top frame gloss line
    graphics
      .moveTo(-r * 0.92, -r * 0.42)
      .lineTo(r * 0.92, -r * 0.42)
      .stroke({ width: 1.2 * unit, color: 0xffffff, alpha: 0.4 })

    return
  }

  if (biome === 'museum') {
    const hazard = entity.hazardType || 'vase'

    if (hazard === 'vase') {
      entity.radius = 20 * unit
      const r = entity.radius
      // Ancient Egyptian Clay & Gold Amphora Vase
      graphics
        .ellipse(0, 0, r * 0.75, r * 0.95)
        .fill(0xc0392b)
        .stroke({ width: 1.6 * unit, color: 0xffd54f })
      graphics.rect(-r * 0.7, -r * 0.2, r * 1.4, r * 0.4).fill(0xd4af37)
      graphics
        .poly(
          [
            -r * 0.42,
            -r * 0.85,
            r * 0.42,
            -r * 0.85,
            r * 0.28,
            -r * 0.55,
            -r * 0.28,
            -r * 0.55,
          ],
          true
        )
        .fill(0x870000)
        .stroke({ width: 1.2 * unit, color: 0xffd54f })
      graphics.ellipse(0, -r * 0.85, r * 0.42, r * 0.14).fill(0xffd54f)
      graphics.circle(-r * 0.75, -r * 0.2, r * 0.2).stroke({ width: 2.2 * unit, color: 0xd4af37 })
      graphics.circle(r * 0.75, -r * 0.2, r * 0.2).stroke({ width: 2.2 * unit, color: 0xd4af37 })
      return
    }

    if (hazard === 'brush' || hazard === 'golden_orb') {
      entity.radius = 20 * unit
      const r = entity.radius

      // ARTIST / RESTORATION PAINTBRUSH (Pędzelek malarski / konserwatorski)
      // 1. Sleek wooden handle (tapered shaft)
      graphics
        .poly(
          [
            -r * 0.14, -r * 1.35,
            r * 0.14, -r * 1.35,
            r * 0.18, -r * 0.18,
            -r * 0.18, -r * 0.18,
          ],
          true
        )
        .fill(0x5d4037)
        .stroke({ width: 1.0 * unit, color: 0x3e2723 })

      // Handle highlight stripe (giving 3D cylindrical wooden look)
      graphics
        .poly(
          [
            -r * 0.05, -r * 1.3,
            r * 0.04, -r * 1.3,
            r * 0.06, -r * 0.2,
            -r * 0.03, -r * 0.2,
          ],
          true
        )
        .fill(0x8d6e63)

      // Handle top rounded tip (czerwona lakierowana końcówka rączki)
      graphics.circle(0, -r * 1.35, r * 0.16).fill(0xd32f2f)

      // 2. Shiny silver / chrome metal ferrule (skuwka pędzla)
      graphics
        .rect(-r * 0.24, -r * 0.18, r * 0.48, r * 0.42)
        .fill(0xcfd8dc)
        .stroke({ width: 1.2 * unit, color: 0x78909c })
      // Ferrule crimp lines (metalowe rowki skuwki)
      graphics.moveTo(-r * 0.24, -r * 0.05).lineTo(r * 0.24, -r * 0.05).stroke({ width: 1.0 * unit, color: 0x546e7a })
      graphics.moveTo(-r * 0.24, r * 0.1).lineTo(r * 0.24, r * 0.1).stroke({ width: 1.0 * unit, color: 0x546e7a })
      // Metallic reflection shine
      graphics.rect(-r * 0.08, -r * 0.18, r * 0.08, r * 0.42).fill({ color: 0xffffff, alpha: 0.6 })

      // 3. Bristles (ciemne naturalne włosie pędzelka)
      graphics
        .poly(
          [
            -r * 0.23, r * 0.24,
            r * 0.23, r * 0.24,
            r * 0.35, r * 0.85,
            0, r * 1.2,
            -r * 0.35, r * 0.85,
          ],
          true
        )
        .fill(0x2d1f18)
        .stroke({ width: 1.0 * unit, color: 0x1a120e })

      // 4. Colorful wet paint on the brush tip (jaskrawa lazurowa farba na czubku)
      graphics
        .poly(
          [
            -r * 0.28, r * 0.72,
            r * 0.28, r * 0.72,
            0, r * 1.2,
          ],
          true
        )
        .fill(0x00bcd4)
        .stroke({ width: 0.8 * unit, color: 0x00838f })

      // Wet paint gloss highlight
      graphics.circle(-r * 0.08, r * 0.82, 1.4 * unit).fill({ color: 0xffffff, alpha: 0.85 })

      // 5. Fresh paint drip falling from the brush tip!
      graphics.circle(0, r * 1.38, 2.2 * unit).fill(0x00bcd4)
      return
    }

    // hieroglyph_slab
    entity.radius = 19 * unit
    const r = entity.radius
    graphics
      .rect(-r * 0.75, -r * 0.85, r * 1.5, r * 1.7)
      .fill(0x5d4037)
      .stroke({ width: 2.0 * unit, color: 0xd4af37 })
    graphics.circle(0, -r * 0.38, r * 0.26).stroke({ width: 1.6 * unit, color: 0xffd54f })
    graphics.moveTo(0, -r * 0.1).lineTo(0, r * 0.48).stroke({ width: 2.0 * unit, color: 0xffd54f })
    graphics.moveTo(-r * 0.38, r * 0.15).lineTo(r * 0.38, r * 0.15).stroke({ width: 2.0 * unit, color: 0xffd54f })
    return
  }

  if (biome === 'winter') {
    entity.radius = 19 * unit
    const r = entity.radius
    graphics
      .poly([-r, -r * 0.65, r, -r * 0.65, r * 0.55, r, -r * 0.7, r], true)
      .fill(0xc7e8f3)
      .poly([-r * 0.45, -r * 0.55, r * 0.45, -r * 0.55, 0, r * 0.55], true)
      .fill(0xeffcff)
    graphics
      .poly([-r, -r * 0.65, r, -r * 0.65, r * 0.55, r, -r * 0.7, r], true)
      .stroke({ width: 1.5, color: 0x6d95b8 })
    return
  }

  // Spring twig with cherry blossoms
  entity.radius = 16 * unit
  const r = entity.radius
  graphics
    .moveTo(-r * 0.75, -r * 0.55)
    .lineTo(-r * 0.2, -r * 0.1)
    .lineTo(r * 0.75, r * 0.65)
    .stroke({ width: 3.6 * unit, color: 0x5d4037, cap: 'round', join: 'round' })
  graphics
    .moveTo(-r * 0.15, -r * 0.15)
    .lineTo(r * 0.35, -r * 0.45)
    .stroke({ width: 2.6 * unit, color: 0x6d4c41, cap: 'round' })
  graphics
    .ellipse(r * 0.38, -r * 0.48, 4.2 * unit, 2.2 * unit)
    .fill(0x7cb342)
    .stroke({ width: 0.8, color: 0x558b2f })
  graphics
    .moveTo(-r * 0.05, 0)
    .lineTo(r * 0.35, r * 0.35)
    .stroke({ width: 1.4 * unit, color: 0x8d6e63, cap: 'round' })
}
