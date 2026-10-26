// Upbeat Swing Jazz & Sound Effects for Date Invite Game
// Features brass, trumpets, saxophones and lively swing rhythm across all stages

let audioCtx: AudioContext | null = null
let isMuted = false
let jazzAudio: HTMLAudioElement | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new AudioContextClass()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

export function getSoundMuted(): boolean {
  return isMuted
}

export function setSoundMuted(muted: boolean): void {
  isMuted = muted
  if (jazzAudio) {
    jazzAudio.muted = muted
    jazzAudio.volume = muted ? 0 : 0.35
  }
}

export function toggleSoundMuted(): boolean {
  setSoundMuted(!isMuted)
  return isMuted
}

// -------------------------------------------------------------
// Upbeat Swing Jazz Music (Brass, Trumpets, Saxophone)
// Plays continuously across all stages of the game
// -------------------------------------------------------------
export function startMuseumJazzMusic(): void {
  try {
    if (!jazzAudio) {
      jazzAudio = new Audio('./jazz.mp3')
      jazzAudio.loop = true
      jazzAudio.volume = isMuted ? 0 : 0.35
      jazzAudio.muted = isMuted
    }
    if (jazzAudio.paused) {
      const playPromise = jazzAudio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy: will resume on first user interaction
        })
      }
    }
  } catch (err) {
    console.warn('Could not initialize jazz audio:', err)
  }
}

export function stopMuseumJazzMusic(): void {
  if (jazzAudio && !jazzAudio.paused) {
    jazzAudio.pause()
  }
}

export const startJazzMusic = startMuseumJazzMusic
export const stopJazzMusic = stopMuseumJazzMusic
export const startCemeteryMusic = startMuseumJazzMusic
export const stopCemeteryMusic = stopMuseumJazzMusic

// -------------------------------------------------------------
// Sound Effects for Scarab, Museum Doors & Sarcophagus
// -------------------------------------------------------------

// Scarab wing flutter sound (crisp, golden, gentle insect flap)
export function playScarabFlap(): void {
  if (isMuted) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(260, now)
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08)

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.09)
  } catch {
    // Ignore
  }
}
export const playBatFlap = playScarabFlap

// Heavy ancient museum stone door opening rumble
export function playDoorStoneOpen(): void {
  if (isMuted) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const bufferSize = Math.floor(ctx.sampleRate * 0.9)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(180, now)
    filter.frequency.linearRampToValueAtTime(320, now + 0.4)
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.9)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.22, now + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 0.95)
  } catch {
    // Ignore
  }
}

// Wrong answer buzzer ("To zła odpowiedź!" - playful humorous boop)
export function playWrongAnswer(): void {
  if (isMuted) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.setValueAtTime(130, now + 0.12)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.3)
  } catch {
    // Ignore
  }
}

// Right answer chime ("10/10! Prawidłowa odpowiedź!" - golden jazz major9 fanfara)
export function playRightAnswer(): void {
  if (isMuted) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [261.63, 329.63, 392.0, 493.88, 523.25, 659.25] // C, E, G, B, C, E

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.06)

      gain.gain.setValueAtTime(0.001, now + idx * 0.06)
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.06 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.75)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.06)
      osc.stop(now + idx * 0.06 + 0.8)
    })
  } catch {
    // Ignore
  }
}

// Sarcophagus 3D opening sound (gentle ancient stone sliding rumble, no jarring chimes)
export function playSarcophagusOpen(): void {
  playDoorStoneOpen()
}

// Sparkle / crystal chime when a letter is collected or flies into its slot
export function playLetterChime(index = 0): void {
  if (isMuted) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51, 1396.91, 1567.98]
    const freq = notes[index % notes.length]

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(now + 0.7)
  } catch {
    // Ignore
  }
}

// Scythe slash preserved for backwards compatibility
export function playScytheSlash(): void {
  playDoorStoneOpen()
}
