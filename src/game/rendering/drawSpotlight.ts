import { Texture } from 'pixi.js'

let cachedSpotlightTexture: Texture | null = null

export function getSpotlightTexture(): Texture {
  if (cachedSpotlightTexture) return cachedSpotlightTexture

  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (ctx) {
    const center = size / 2
    // Radial gradient:
    // 0 -> r1: completely transparent window
    // r1 -> r2: golden amber firefly/lantern halo
    // r2 -> r3: shadowy falloff
    // r3 -> size/2: pitch dark exhibit room
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center)

    grad.addColorStop(0, 'rgba(0, 0, 0, 0)')
    grad.addColorStop(0.24, 'rgba(0, 0, 0, 0)')
    grad.addColorStop(0.32, 'rgba(255, 215, 64, 0.08)')
    grad.addColorStop(0.44, 'rgba(255, 183, 77, 0.22)')
    grad.addColorStop(0.58, 'rgba(13, 10, 20, 0.85)')
    grad.addColorStop(0.75, 'rgba(6, 5, 12, 0.96)')
    grad.addColorStop(1, 'rgba(5, 4, 10, 0.97)')

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  }

  cachedSpotlightTexture = Texture.from(canvas)
  return cachedSpotlightTexture
}
