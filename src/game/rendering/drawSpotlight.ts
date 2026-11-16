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
    // Normal ambient lantern in Niewidzialna Wystawa
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center)

    grad.addColorStop(0, 'rgba(0, 0, 0, 0)')
    grad.addColorStop(0.24, 'rgba(0, 0, 0, 0)')
    grad.addColorStop(0.32, 'rgba(255, 215, 64, 0.08)')
    grad.addColorStop(0.44, 'rgba(255, 183, 77, 0.22)')
    grad.addColorStop(0.58, 'rgba(5, 4, 10, 0.88)')
    grad.addColorStop(0.75, 'rgba(3, 2, 7, 0.98)')
    grad.addColorStop(1, 'rgba(2, 2, 5, 1.0)')

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  }

  cachedSpotlightTexture = Texture.from(canvas)
  return cachedSpotlightTexture
}
