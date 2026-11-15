import type { BiomeId, Difficulty, DifficultyConfig, FlightPathPreset, SecretLetter } from './types'

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Łatwy',
    emoji: '🌸',
    description: 'Bardzo łagodna przygoda: brak obrażeń od ścian, rzadsze przeszkody i lekki wiaterek.',
    museumStart: 38_000,
    totalDuration: 76_000,
    hazardIntervalMultiplier: 1.25,
    eventWindMultiplier: 0.75,
    eventDurationMultiplier: 0.8,
    sideDamage: false,
  },
  medium: {
    label: 'Średni',
    emoji: '⚡',
    description: 'Klasyczna przygoda: brak obrażeń od ścian, zrównoważony wiatr i tempo.',
    museumStart: 44_000,
    totalDuration: 86_000,
    hazardIntervalMultiplier: 1.0,
    eventWindMultiplier: 1.0,
    eventDurationMultiplier: 1.0,
    sideDamage: false,
  },
  hard: {
    label: 'Trudny',
    emoji: '🔥',
    description: 'Wyzwanie: raniące ściany boczne, silniejszy wiatr i więcej przeszkód.',
    museumStart: 48_000,
    totalDuration: 94_000,
    hazardIntervalMultiplier: 0.82,
    eventWindMultiplier: 1.25,
    eventDurationMultiplier: 1.2,
    sideDamage: true,
  },
}

export const getBiomesForDifficulty = (diff: Difficulty) => {
  const cfg = DIFFICULTY_CONFIGS[diff]
  return [
    { id: 'spring' as BiomeId, label: '🌸 Wiosenny wiatr', until: Math.round(cfg.museumStart * 0.48), event: 'Wiosenny podmuch' },
    { id: 'winter' as BiomeId, label: '❄️ Zimowy mróz', until: cfg.museumStart, event: 'Śnieżyca' },
    { id: 'museum' as BiomeId, label: '🏛️ Muzeum Tajemnic', until: cfg.totalDuration, event: 'Złoty blask' },
  ] as const
}

export const biomeAt = (elapsed: number, diff: Difficulty) => {
  const biomes = getBiomesForDifficulty(diff)
  return biomes.find((biome) => elapsed < biome.until) ?? biomes[biomes.length - 1]
}

export const SECRET_LETTERS: SecretLetter[] = [
  // JESTEŚ (word 0, slots 0..5)
  { id: 0, char: 'J', wordIndex: 0, charIndex: 0 },
  { id: 1, char: 'E', wordIndex: 0, charIndex: 1 },
  { id: 2, char: 'S', wordIndex: 0, charIndex: 2 },
  { id: 3, char: 'T', wordIndex: 0, charIndex: 3 },
  { id: 4, char: 'E', wordIndex: 0, charIndex: 4 },
  { id: 5, char: 'Ś', wordIndex: 0, charIndex: 5 },
  // SŁODKA (word 1, slots 6..11)
  { id: 6, char: 'S', wordIndex: 1, charIndex: 0 },
  { id: 7, char: 'Ł', wordIndex: 1, charIndex: 1 },
  { id: 8, char: 'O', wordIndex: 1, charIndex: 2 },
  { id: 9, char: 'D', wordIndex: 1, charIndex: 3 },
  { id: 10, char: 'K', wordIndex: 1, charIndex: 4 },
  { id: 11, char: 'A', wordIndex: 1, charIndex: 5 },
]

// Scrambled sequence across the 3 stages:
// Stage 1 (Spring): K, E, D, S
// Stage 2 (Winter): A, Ł, T, Ś
// Stage 3 (Museum): J, O, S, E
export const SPAWN_LETTER_ORDER: number[] = [
  10, // K
  1,  // E
  9,  // D
  6,  // S
  11, // A
  7,  // Ł
  3,  // T
  5,  // Ś
  0,  // J
  8,  // O
  2,  // S
  4,  // E
]

// Random trajectory presets for each of the 12 flying letters
export const FLIGHT_PATHS: FlightPathPreset[] = [
  { startX: -140, startY: -90, midX: -60, midY: -160, rot: -35 },
  { startX: -90, startY: -130, midX: -20, midY: -190, rot: 25 },
  { startX: -150, startY: -40, midX: -80, midY: -120, rot: -45 },
  { startX: -10, startY: -150, midX: 40, midY: -210, rot: 30 },
  { startX: 80, startY: -140, midX: 120, midY: -180, rot: -20 },
  { startX: 140, startY: -90, midX: 160, midY: -140, rot: 40 },
  { startX: -130, startY: 30, midX: -110, midY: -70, rot: -30 },
  { startX: -80, startY: -110, midX: -40, midY: -150, rot: 20 },
  { startX: 30, startY: -160, midX: -20, midY: -200, rot: -25 },
  { startX: 120, startY: -40, midX: 90, midY: -110, rot: 35 },
  { startX: 90, startY: -110, midX: 50, midY: -170, rot: -15 },
  { startX: 150, startY: 20, midX: 110, midY: -60, rot: 45 },
]

// Scramble/shuffle helper so letters hover in scrambled random order
export function scrambleLetters(letters: SecretLetter[]): SecretLetter[] {
  if (letters.length <= 1) return [...letters]
  const arr = [...letters]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  // Ensure it's not accidentally in sorted id order
  const isSorted = arr.every((item, idx) => idx === 0 || item.id >= arr[idx - 1].id)
  if (isSorted && arr.length > 1) {
    [arr[0], arr[1]] = [arr[1], arr[0]]
  }
  return arr
}
