import type { Graphics } from 'pixi.js'

/**
 * Draws the menacing glowing eyes of a bat lurking in the darkness.
 */
export function drawBatEyes(
  view: Graphics,
  unit: number,
  isBlinking: boolean,
  isAggro: boolean
): void {
  view.clear()

  const eyeDistance = 8.5 * unit
  const eyeRadiusX = 3.6 * unit
  const eyeRadiusY = isBlinking ? 0.3 * unit : (isAggro ? 4.2 : 3.2) * unit

  const eyeColor = isAggro ? 0xff1744 : 0xff9100
  const glowColor = isAggro ? 0xd50000 : 0xff6d00

  // Outer ambient glow ring in darkness
  view.circle(-eyeDistance, 0, 7.5 * unit).fill({ color: glowColor, alpha: isAggro ? 0.45 : 0.25 })
  view.circle(eyeDistance, 0, 7.5 * unit).fill({ color: glowColor, alpha: isAggro ? 0.45 : 0.25 })

  // Left Eye
  view.ellipse(-eyeDistance, 0, eyeRadiusX, eyeRadiusY).fill(eyeColor)
  // Right Eye
  view.ellipse(eyeDistance, 0, eyeRadiusX, eyeRadiusY).fill(eyeColor)

  if (!isBlinking) {
    // Vertical slit predator pupils
    const pupilW = isAggro ? 1.0 * unit : 1.4 * unit
    const pupilH = eyeRadiusY * 0.85
    view.ellipse(-eyeDistance, 0, pupilW, pupilH).fill(0x0a0505)
    view.ellipse(eyeDistance, 0, pupilW, pupilH).fill(0x0a0505)

    // Tiny glint of light in eyes
    view.circle(-eyeDistance - 1.2 * unit, -1.2 * unit, 0.9 * unit).fill({ color: 0xffffff, alpha: 0.85 })
    view.circle(eyeDistance - 1.2 * unit, -1.2 * unit, 0.9 * unit).fill({ color: 0xffffff, alpha: 0.85 })
  }
}

/**
 * Draws the full attacking bat with flapping leathery wings, fangs, and ears.
 */
export function drawBatFull(
  view: Graphics,
  unit: number,
  flapPhase: number,
  isBiting: boolean
): void {
  view.clear()

  const s = 19 * unit
  const wingFlap = Math.sin(flapPhase) * 0.55

  // 1. Wings (Leathery, scalloped webbing with articulated finger bones)
  // Left Wing
  const lTipX = -s * 1.55
  const lTipY = -s * 0.4 + wingFlap * s * 0.85
  const lJointX = -s * 0.85
  const lJointY = -s * 0.5 + wingFlap * s * 0.4
  view
    .poly(
      [
        0, -s * 0.1,
        lJointX, lJointY,
        lTipX, lTipY,
        -s * 1.3, lTipY + s * 0.45,
        -s * 0.9, lTipY + s * 0.35,
        -s * 0.5, lTipY + s * 0.55,
        0, s * 0.2,
      ],
      true
    )
    .fill(0x1e1b24)
    .stroke({ width: 1.4 * unit, color: 0x3d3548 })

  // Left wing bone struts
  view.moveTo(0, -s * 0.1).lineTo(lTipX, lTipY).stroke({ width: 1.2 * unit, color: 0x4a4058 })
  view.moveTo(lJointX, lJointY).lineTo(-s * 0.9, lTipY + s * 0.35).stroke({ width: 1.0 * unit, color: 0x4a4058 })

  // Right Wing
  const rTipX = s * 1.55
  const rTipY = -s * 0.4 + wingFlap * s * 0.85
  const rJointX = s * 0.85
  const rJointY = -s * 0.5 + wingFlap * s * 0.4
  view
    .poly(
      [
        0, -s * 0.1,
        rJointX, rJointY,
        rTipX, rTipY,
        s * 1.3, rTipY + s * 0.45,
        s * 0.9, rTipY + s * 0.35,
        s * 0.5, rTipY + s * 0.55,
        0, s * 0.2,
      ],
      true
    )
    .fill(0x1e1b24)
    .stroke({ width: 1.4 * unit, color: 0x3d3548 })

  // Right wing bone struts
  view.moveTo(0, -s * 0.1).lineTo(rTipX, rTipY).stroke({ width: 1.2 * unit, color: 0x4a4058 })
  view.moveTo(rJointX, rJointY).lineTo(s * 0.9, rTipY + s * 0.35).stroke({ width: 1.0 * unit, color: 0x4a4058 })

  // 2. Body & Head
  // Torso
  view
    .ellipse(0, s * 0.1, s * 0.38, s * 0.48)
    .fill(0x272330)
    .stroke({ width: 1.3 * unit, color: 0x3d374a })

  // Chest fur fluff
  view.ellipse(0, s * 0.05, s * 0.22, s * 0.28).fill(0x353040)

  // Head
  view
    .circle(0, -s * 0.32, s * 0.32)
    .fill(0x231f2b)
    .stroke({ width: 1.2 * unit, color: 0x3d374a })

  // Ears (Pointed bat ears with pink inner membrane)
  // Left ear
  view.poly([-s * 0.26, -s * 0.42, -s * 0.42, -s * 0.82, -s * 0.1, -s * 0.58], true).fill(0x231f2b)
  view.poly([-s * 0.24, -s * 0.45, -s * 0.36, -s * 0.74, -s * 0.14, -s * 0.56], true).fill(0xad1457)
  // Right ear
  view.poly([s * 0.26, -s * 0.42, s * 0.42, -s * 0.82, s * 0.1, -s * 0.58], true).fill(0x231f2b)
  view.poly([s * 0.24, -s * 0.45, s * 0.36, -s * 0.74, s * 0.14, -s * 0.56], true).fill(0xad1457)

  // 3. Glowing Eyes
  view.circle(-s * 0.13, -s * 0.35, s * 0.09).fill(0xff1744)
  view.circle(s * 0.13, -s * 0.35, s * 0.09).fill(0xff1744)
  view.circle(-s * 0.13, -s * 0.35, s * 0.035).fill(0xffffff)
  view.circle(s * 0.13, -s * 0.35, s * 0.035).fill(0xffffff)

  // 4. Snout & Mouth with Fangs
  if (isBiting) {
    // Open gaping vampire mouth with sharp fangs
    view
      .ellipse(0, -s * 0.18, s * 0.22, s * 0.16)
      .fill(0x880e4f)
      .stroke({ width: 1.0 * unit, color: 0xc2185b })

    // Sharp top fangs
    view.poly([-s * 0.12, -s * 0.24, -s * 0.08, -s * 0.1, -s * 0.04, -s * 0.24], true).fill(0xffffff)
    view.poly([s * 0.04, -s * 0.24, s * 0.08, -s * 0.1, s * 0.12, -s * 0.24], true).fill(0xffffff)

    // Small bottom teeth
    view.poly([-s * 0.06, -s * 0.12, -s * 0.03, -s * 0.18, 0, -s * 0.12], true).fill(0xffffff)
    view.poly([0, -s * 0.12, s * 0.03, -s * 0.18, s * 0.06, -s * 0.12], true).fill(0xffffff)
  } else {
    // Closed nose & fangs peeking
    view.ellipse(0, -s * 0.24, s * 0.1, s * 0.06).fill(0x120f17)
    // Tiny fangs poking out
    view.poly([-s * 0.08, -s * 0.2, -s * 0.06, -s * 0.12, -s * 0.04, -s * 0.2], true).fill(0xffffff)
    view.poly([s * 0.04, -s * 0.2, s * 0.06, -s * 0.12, s * 0.08, -s * 0.2], true).fill(0xffffff)
  }
}
