// Web Audio API procedural sound engine for cemetery ambience & effects
// No external MP3 downloads required - zero latency, reliable, never 404s.

let audioCtx: AudioContext | null = null
let isMuted = false
let cemeteryGain: GainNode | null = null
let droneOsc1: OscillatorNode | null = null
let droneOsc2: OscillatorNode | null = null
let droneOsc3: OscillatorNode | null = null
let windSource: AudioBufferSourceNode | null = null
let windGain: GainNode | null = null
let chimeTimer: number | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
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
  if (cemeteryGain && audioCtx) {
    cemeteryGain.gain.setValueAtTime(isMuted ? 0 : 0.28, audioCtx.currentTime)
  }
}

export function toggleSoundMuted(): boolean {
  setSoundMuted(!isMuted)
  return isMuted
}

// Spooky ambient cemetery music with low drone, ethereal chord pads & whisper of wind
export function startCemeteryMusic(): void {
  if (droneOsc1) return // Already playing
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Master cemetery gain
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.001, now)
    master.gain.exponentialRampToValueAtTime(isMuted ? 0.0001 : 0.28, now + 2.5)
    master.connect(ctx.destination)
    cemeteryGain = master

    // Low organ drone (D2 = 73.42Hz)
    const osc1 = ctx.createOscillator()
    osc1.type = 'sawtooth'
    osc1.frequency.setValueAtTime(73.42, now)
    const filter1 = ctx.createBiquadFilter()
    filter1.type = 'lowpass'
    filter1.frequency.setValueAtTime(140, now)
    osc1.connect(filter1)
    filter1.connect(master)
    osc1.start()
    droneOsc1 = osc1

    // Ethereal fifth / minor pad (A2 = 110Hz + slight slow detune)
    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(110.0, now)
    const lfo = ctx.createOscillator()
    lfo.frequency.setValueAtTime(0.25, now)
    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(1.8, now)
    lfo.connect(lfoGain)
    lfoGain.connect(osc2.detune)
    lfo.start()
    osc2.connect(master)
    osc2.start()
    droneOsc2 = osc2

    // High eerie harmonic (F3 = 174.61Hz)
    const osc3 = ctx.createOscillator()
    osc3.type = 'triangle'
    osc3.frequency.setValueAtTime(174.61, now)
    const filter3 = ctx.createBiquadFilter()
    filter3.type = 'bandpass'
    filter3.frequency.setValueAtTime(350, now)
    filter3.Q.setValueAtTime(2.0, now)
    osc3.connect(filter3)
    filter3.connect(master)
    osc3.start()
    droneOsc3 = osc3

    // Wind noise buffer
    const bufferSize = ctx.sampleRate * 3
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const output = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1
    }

    const whiteNoise = ctx.createBufferSource()
    whiteNoise.buffer = noiseBuffer
    whiteNoise.loop = true

    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.setValueAtTime(420, now)
    windFilter.Q.setValueAtTime(3.5, now)

    const wGain = ctx.createGain()
    wGain.gain.setValueAtTime(0.06, now)

    whiteNoise.connect(windFilter)
    windFilter.connect(wGain)
    wGain.connect(master)
    whiteNoise.start()

    windSource = whiteNoise
    windGain = wGain

    // Periodic distant spooky church bell chime (every 8-12 seconds)
    const playDistantBell = () => {
      if (!cemeteryGain || isMuted) return
      playBellToll()
      chimeTimer = window.setTimeout(playDistantBell, 8000 + Math.random() * 5000)
    }
    chimeTimer = window.setTimeout(playDistantBell, 4000)
  } catch (err) {
    console.warn('AudioContext initialization failed or blocked:', err)
  }
}

export function stopCemeteryMusic(): void {
  if (chimeTimer) {
    window.clearTimeout(chimeTimer)
    chimeTimer = null
  }
  if (!audioCtx || !cemeteryGain) return
  try {
    const now = audioCtx.currentTime
    cemeteryGain.gain.setValueAtTime(cemeteryGain.gain.value, now)
    cemeteryGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)
    setTimeout(() => {
      droneOsc1?.stop()
      droneOsc2?.stop()
      droneOsc3?.stop()
      windSource?.stop()
      droneOsc1?.disconnect()
      droneOsc2?.disconnect()
      droneOsc3?.disconnect()
      windSource?.disconnect()
      windGain?.disconnect()
      cemeteryGain?.disconnect()
      droneOsc1 = null
      droneOsc2 = null
      droneOsc3 = null
      windSource = null
      windGain = null
      cemeteryGain = null
    }, 1300)
  } catch {
    // Ignore cleanup errors
  }
}

function playBellToll(): void {
  if (isMuted) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    // Deep bell fundamental (D3 = 146.83Hz)
    osc.frequency.setValueAtTime(146.83, now)
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(now + 4.0)
  } catch {
    // Ignore
  }
}

// Scythe swing & slash sound: dramatic airy swoosh with metallic ring
export function playScytheSlash(): void {
  if (isMuted) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // White noise swoosh
    const bufferSize = Math.floor(ctx.sampleRate * 0.45)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(120, now)
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.15)
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.45)
    filter.Q.setValueAtTime(1.8, now)

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.001, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.4, now + 0.12)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(ctx.destination)
    noise.start()
    noise.stop(now + 0.5)

    // Sharp metallic ring on the blade
    const metal = ctx.createOscillator()
    const metalGain = ctx.createGain()
    metal.type = 'triangle'
    metal.frequency.setValueAtTime(1580, now + 0.1)
    metal.frequency.exponentialRampToValueAtTime(880, now + 0.6)
    metalGain.gain.setValueAtTime(0.001, now)
    metalGain.gain.setValueAtTime(0.22, now + 0.12)
    metalGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7)

    metal.connect(metalGain)
    metalGain.connect(ctx.destination)
    metal.start(now + 0.1)
    metal.stop(now + 0.75)
  } catch {
    // Ignore
  }
}

// Sparkle / crystal chime when a letter is collected or flies into its slot
export function playLetterChime(index = 0): void {
  if (isMuted) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    // Scale frequencies (pentatonic / warm romantic scale)
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

// Gentle flapping sound when steering bat
export function playBatFlap(): void {
  if (isMuted) return
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.1)
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(now + 0.11)
  } catch {
    // Ignore
  }
}
