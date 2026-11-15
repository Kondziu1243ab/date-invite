import type { Graphics } from 'pixi.js'

// Royal Golden Scarab with fluttering gossamer wings & Egyptian jewelry (Active throughout the entire game)
export function drawScarab(view: Graphics, size: number, flapPhase = 0): void {
  view.clear()
  const s = size * 0.72
  const wingAngle = Math.sin(flapPhase) * 0.44

  // --- Wings (Semi-translucent golden gossamer with vein struts) ---
  // Left Wing
  const lwTipX = -s * 1.42
  const lwTipY = -s * 0.32 + wingAngle * s * 0.95
  const lwJointX = -s * 0.42
  const lwJointY = -s * 0.22 + wingAngle * s * 0.3
  view
    .poly(
      [
        0,
        -s * 0.1,
        lwJointX,
        lwJointY,
        lwTipX,
        lwTipY,
        -s * 1.12,
        lwTipY + s * 0.4,
        -s * 0.52,
        s * 0.15,
        0,
        0.1,
      ],
      true
    )
    .fill({ color: 0xffecb3, alpha: 0.68 })
    .stroke({ width: 1.5, color: 0xffd54f, alpha: 0.95 })

  view.moveTo(0, -s * 0.1).lineTo(lwTipX, lwTipY).stroke({ width: 1.3, color: 0xffca28, alpha: 0.85 })
  view.moveTo(lwJointX, lwJointY).lineTo(-s * 1.12, lwTipY + s * 0.4).stroke({ width: 1.0, color: 0xffca28, alpha: 0.7 })

  // Right Wing
  const rwTipX = s * 1.42
  const rwTipY = -s * 0.32 + wingAngle * s * 0.95
  const rwJointX = s * 0.42
  const rwJointY = -s * 0.22 + wingAngle * s * 0.3
  view
    .poly(
      [
        0,
        -s * 0.1,
        rwJointX,
        rwJointY,
        rwTipX,
        rwTipY,
        s * 1.12,
        rwTipY + s * 0.4,
        s * 0.52,
        s * 0.15,
        0,
        0.1,
      ],
      true
    )
    .fill({ color: 0xffecb3, alpha: 0.68 })
    .stroke({ width: 1.5, color: 0xffd54f, alpha: 0.95 })

  view.moveTo(0, -s * 0.1).lineTo(rwTipX, rwTipY).stroke({ width: 1.3, color: 0xffca28, alpha: 0.85 })
  view.moveTo(rwJointX, rwJointY).lineTo(s * 1.12, rwTipY + s * 0.4).stroke({ width: 1.0, color: 0xffca28, alpha: 0.7 })

  // --- Golden Egyptian Legs (6 articulated limbs) ---
  // Front legs
  view
    .moveTo(-s * 0.22, -s * 0.3)
    .lineTo(-s * 0.62, -s * 0.52)
    .lineTo(-s * 0.48, -s * 0.78)
    .stroke({ width: 2.2, color: 0xb78103, cap: 'round', join: 'round' })
  view
    .moveTo(s * 0.22, -s * 0.3)
    .lineTo(s * 0.62, -s * 0.52)
    .lineTo(s * 0.48, -s * 0.78)
    .stroke({ width: 2.2, color: 0xb78103, cap: 'round', join: 'round' })
  // Middle legs
  view
    .moveTo(-s * 0.3, -s * 0.05)
    .lineTo(-s * 0.78, -s * 0.08)
    .lineTo(-s * 0.92, s * 0.16)
    .stroke({ width: 2.0, color: 0xb78103, cap: 'round', join: 'round' })
  view
    .moveTo(s * 0.3, -s * 0.05)
    .lineTo(s * 0.78, -s * 0.08)
    .lineTo(s * 0.92, s * 0.16)
    .stroke({ width: 2.0, color: 0xb78103, cap: 'round', join: 'round' })
  // Back legs
  view
    .moveTo(-s * 0.26, s * 0.24)
    .lineTo(-s * 0.68, s * 0.44)
    .lineTo(-s * 0.54, s * 0.74)
    .stroke({ width: 2.0, color: 0xb78103, cap: 'round', join: 'round' })
  view
    .moveTo(s * 0.26, s * 0.24)
    .lineTo(s * 0.68, s * 0.44)
    .lineTo(s * 0.54, s * 0.74)
    .stroke({ width: 2.0, color: 0xb78103, cap: 'round', join: 'round' })

  // --- Abdomen & Elytra (Shimmering Golden Shell) ---
  view
    .ellipse(0, s * 0.12, s * 0.46, s * 0.58)
    .fill(0xd4af37)
    .stroke({ width: 2.0, color: 0xfff9c4 })
  view.ellipse(0, s * 0.12, s * 0.41, s * 0.53).fill(0xffd700)

  // Elytra center division line
  view.moveTo(0, -s * 0.16).lineTo(0, s * 0.68).stroke({ width: 1.8, color: 0x8c6d05, cap: 'round' })

  // Carved wing-case hieroglyphic highlights
  view.ellipse(-s * 0.18, s * 0.14, s * 0.13, s * 0.26).fill({ color: 0xfff176, alpha: 0.6 })
  view.ellipse(s * 0.18, s * 0.14, s * 0.13, s * 0.26).fill({ color: 0xfff176, alpha: 0.6 })

  // --- Thorax (Chest plate) ---
  view
    .poly(
      [
        -s * 0.36,
        -s * 0.18,
        s * 0.36,
        -s * 0.18,
        s * 0.26,
        -s * 0.42,
        -s * 0.26,
        -s * 0.42,
      ],
      true
    )
    .fill(0xf57f17)
    .stroke({ width: 1.6, color: 0xfff59d })

  // Turquoise / Lapis lazuli jewel centerpiece
  view
    .ellipse(0, -s * 0.3, s * 0.11, s * 0.08)
    .fill(0x00bcd4)
    .circle(0, -s * 0.3, s * 0.035)
    .fill(0xffffff)

  // --- Head & Crown (Solar disc) ---
  view
    .poly(
      [
        -s * 0.2,
        -s * 0.42,
        s * 0.2,
        -s * 0.42,
        s * 0.24,
        -s * 0.56,
        s * 0.1,
        -s * 0.63,
        0,
        -s * 0.56,
        -s * 0.1,
        -s * 0.63,
        -s * 0.24,
        -s * 0.56,
      ],
      true
    )
    .fill(0xd4af37)
    .stroke({ width: 1.4, color: 0xfff9c4 })

  // Glowing ruby eyes
  view
    .circle(-s * 0.12, -s * 0.48, s * 0.04)
    .fill(0xd50000)
    .circle(-s * 0.11, -s * 0.49, s * 0.016)
    .fill(0xffffff)
  view
    .circle(s * 0.12, -s * 0.48, s * 0.04)
    .fill(0xd50000)
    .circle(s * 0.13, -s * 0.49, s * 0.016)
    .fill(0xffffff)

  // Solar disc crowning head
  view.circle(0, -s * 0.72, s * 0.11).fill(0xff6f00).stroke({ width: 1.2, color: 0xffd54f })
  view.circle(0, -s * 0.72, s * 0.05).fill(0xffeb3b)
}
