import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js'

export const CARD_IMAGE_PATH = ((import.meta.env?.BASE_URL || '/') + 'dama.jpg').replace(/\/+/g, '/')

export function createDiamondCardGraphic(unit = 1): {
  container: Container
  graphics: Graphics
  sprite: Sprite
  glow: Graphics
} {
  const container = new Container()

  const glow = new Graphics()
  const cardBase = new Graphics()
  const sprite = new Sprite()
  const frame = new Graphics()

  sprite.anchor.set(0.5)
  sprite.visible = false

  // Attach cardBase to frame so updateDiamondCardGraphic can update both
  ;(frame as unknown as { __cardBase?: Graphics }).__cardBase = cardBase

  // Order: glow aura behind -> solid card base -> card image sprite -> golden frame & ornaments on top
  container.addChild(glow, cardBase, sprite, frame)

  const applyTexture = (tex: Texture) => {
    if (tex && sprite) {
      sprite.texture = tex
      sprite.visible = true
    }
  }

  try {
    const cached = Assets.get(CARD_IMAGE_PATH)
    if (cached) {
      applyTexture(cached)
    } else {
      Assets.load<Texture>(CARD_IMAGE_PATH)
        .then((tex) => {
          applyTexture(tex)
        })
        .catch(() => {
          try {
            const fallbackTex = Texture.from(CARD_IMAGE_PATH)
            if (fallbackTex) applyTexture(fallbackTex)
          } catch {
            // Keep cardBase vector Queen visible
          }
        })
    }
  } catch {
    try {
      const fallbackTex = Texture.from(CARD_IMAGE_PATH)
      if (fallbackTex) applyTexture(fallbackTex)
    } catch {
      // Keep cardBase vector Queen visible
    }
  }

  updateDiamondCardGraphic(frame, glow, sprite, unit)

  return { container, graphics: frame, sprite, glow }
}

export function updateDiamondCardGraphic(
  graphics: Graphics,
  glow: Graphics,
  sprite: Sprite,
  unit = 1
): void {
  const w = 46 * unit
  const h = 64 * unit
  const r = 6 * unit

  // 1. Position & size sprite neatly within card borders
  sprite.width = Math.max(1, w - 4 * unit)
  sprite.height = Math.max(1, h - 4 * unit)
  sprite.position.set(0, 0)
  if (sprite.texture && sprite.texture !== Texture.EMPTY) {
    sprite.visible = true
  }

  // 2. Solid card base (NEVER hollow, even before sprite texture loads)
  const cardBase = (graphics as unknown as { __cardBase?: Graphics }).__cardBase
  if (cardBase) {
    cardBase.clear()
    // Solid clean white background
    cardBase.roundRect(-w / 2, -h / 2, w, h, r).fill(0xffffff)

    // Inner card border
    cardBase
      .roundRect(-w / 2 + 2 * unit, -h / 2 + 2 * unit, w - 4 * unit, h - 4 * unit, r - 1.5 * unit)
      .stroke({ width: 0.9 * unit, color: 0xf3e5f5 })

    // Queen of Diamonds corner indices ("♦")
    const dOffX = w / 2 - 5.5 * unit
    const dOffY = h / 2 - 8 * unit
    // Top-left diamond
    cardBase
      .poly(
        [
          -dOffX, -dOffY - 3.5 * unit,
          -dOffX + 2.5 * unit, -dOffY,
          -dOffX, -dOffY + 3.5 * unit,
          -dOffX - 2.5 * unit, -dOffY,
        ],
        true
      )
      .fill(0xd32f2f)

    // Bottom-right diamond
    cardBase
      .poly(
        [
          dOffX, dOffY - 3.5 * unit,
          dOffX + 2.5 * unit, dOffY,
          dOffX, dOffY + 3.5 * unit,
          dOffX - 2.5 * unit, dOffY,
        ],
        true
      )
      .fill(0xd32f2f)

    // Center ornate diamond emblem (backup illustration in case texture is delayed)
    cardBase
      .poly(
        [
          0, -11 * unit,
          8 * unit, 0,
          0, 11 * unit,
          -8 * unit, 0,
        ],
        true
      )
      .fill(0xe53935)
      .stroke({ width: 1.2 * unit, color: 0xd4af37 })

    // Royal crown above diamond
    cardBase
      .poly(
        [
          -5 * unit, -12 * unit,
          5 * unit, -12 * unit,
          7 * unit, -18 * unit,
          2.5 * unit, -15 * unit,
          0, -20 * unit,
          -2.5 * unit, -15 * unit,
          -7 * unit, -18 * unit,
        ],
        true
      )
      .fill(0xd4af37)
  }

  // 3. Sparkling golden-ruby aura glow
  glow.clear()
  glow.circle(0, 0, 38 * unit).fill({ color: 0xffd700, alpha: 0.42 })
  glow.circle(0, 0, 26 * unit).fill({ color: 0xff1744, alpha: 0.28 })

  // 4. Outer golden & ruby frame on top of sprite
  graphics.clear()

  // Outer glowing ruby border
  graphics
    .roundRect(-w / 2 - 1.5 * unit, -h / 2 - 1.5 * unit, w + 3 * unit, h + 3 * unit, r + 1.5 * unit)
    .stroke({ width: 1.5 * unit, color: 0xff1744, alpha: 0.75 })

  // Golden inner bezel border
  graphics
    .roundRect(-w / 2, -h / 2, w, h, r)
    .stroke({ width: 2.2 * unit, color: 0xd4af37 })

  // Golden corner accents
  const cOff = 5 * unit
  graphics.circle(-w / 2 + cOff, -h / 2 + cOff, 1.8 * unit).fill(0xffd54f)
  graphics.circle(w / 2 - cOff, -h / 2 + cOff, 1.8 * unit).fill(0xffd54f)
  graphics.circle(-w / 2 + cOff, h / 2 - cOff, 1.8 * unit).fill(0xffd54f)
  graphics.circle(w / 2 - cOff, h / 2 - cOff, 1.8 * unit).fill(0xffd54f)
}
