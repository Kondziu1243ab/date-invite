

import { inviteName } from './config'

async function sendNtfy(title: string, body: string, tags?: string[], priority?: string): Promise<void> {
  const topic = import.meta.env.VITE_NTFY_TOPIC?.trim()
  if (!topic) {
    if (import.meta.env.DEV) {
      console.warn('[ntfy] Brak VITE_NTFY_TOPIC — ustaw w .env i zrestartuj dev server.')
    }
    return
  }

  // Tytuł w URL zamiast nagłówka Title — lepsze CORS i polskie znaki w przeglądarce
  const url = new URL(`https://ntfy.sh/${encodeURIComponent(topic)}`)
  url.searchParams.set('title', title)
  if (tags && tags.length > 0) {
    url.searchParams.set('tags', tags.join(','))
  }
  if (priority) {
    url.searchParams.set('priority', priority)
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      body,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      if (import.meta.env.DEV) {
        console.warn('[ntfy] Serwer odrzucił wiadomość:', res.status, detail)
      }
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[ntfy] Nie udało się wysłać:', err)
    }
  }
}

export type GameStats = {
  lettersCollected: number
  totalLetters: number
  difficulty: string
  skippedStages?: string[]
  manuallyCollectedCount?: number
  hitsTaken?: number
  deathsCount?: number
  guardianAttempts?: number[]
  totalPlayTimeSeconds?: number
  hasDiamondCard?: boolean
  diamondCardUsedQuestions?: number[]
}

export async function notifyInviteAccepted(): Promise<void> {
  await sendNtfy(
    `Randka zaakceptowana! 💕`,
    `${inviteName} kliknęła "Tak 💕" i właśnie wyrusza w podróż ze Skarabeuszem! 🪲`,
    ['tada', 'sparkling_heart'],
    'high'
  )
}

export async function notifyStageSkipped(stageName: string, nextStageName?: string): Promise<void> {
  const nextInfo = nextStageName ? ` (przejście do: ${nextStageName})` : ''
  await sendNtfy(
    `Pominięto etap: ${stageName} ⏭️`,
    `${inviteName} użyła przycisku skip dla etapu: ${stageName}${nextInfo}.`,
    ['fast_forward'],
    'default'
  )
}

export async function notifyMuseumReached(): Promise<void> {
  await sendNtfy(
    `Dotarła do Muzeum! 🏛️`,
    `${inviteName} pokonała wiosnę oraz zimę i stanęła przed wrotami Muzeum Tajemnic!`,
    ['classical_building', 'key'],
    'default'
  )
}

export async function notifyGuardianQuestion1(answer: string, isCorrect: boolean): Promise<void> {
  const resultText = isCorrect ? 'Prawidłowo! (Bramkarz 🧤)' : `Błędna odpowiedź: ${answer} (straciła serduszko)`
  await sendNtfy(
    `Dżin - Pytanie 1 (Piłka nożna): ${isCorrect ? 'Sukces! ⚽' : 'Błąd! ❌'}`,
    `${inviteName} odpowiedziała na pytanie o pozycję twórcy w piłce: ${resultText}.`,
    [isCorrect ? 'soccer' : 'x'],
    'default'
  )
}

export async function notifyGuardianQuestion2(action: 'first_warning' | 'na_moim' | 'wrong' | 'correct', chosenAnswer: string): Promise<void> {
  let title = 'Dżin - Pytanie 2 (Obsesja)'
  let desc = ''
  let tags = ['question']

  if (action === 'first_warning') {
    title = 'Dżin - Ostrzeżenie na pytaniu 2! 😏'
    desc = `${inviteName} nie wybrała "Na moim" jako pierwszej opcji (kliknęła "${chosenAnswer}"), więc Dżin ostrzegł: "Czy jesteś pewna, że to poprawna odpowiedź? Ja myślę inaczej..."`
    tags = ['thinking_face', 'wink']
  } else if (action === 'na_moim') {
    title = 'Dżin - Wybrano "Na moim"! 👸💕'
    desc = `${inviteName} kliknęła "Na moim"! Dżin odpowiedział: "Hej hej, lubię Cię, ale to jeszcze nie obsesja! 😉"`
    tags = ['princess', 'sparkling_heart']
  } else if (action === 'correct') {
    title = 'Dżin - Pytanie 2 Zaliczone! 🏋️‍♂️'
    desc = `${inviteName} poprawnie odpowiedziała: "Siłka"! Przechodzi do pytania finałowego.`
    tags = ['muscle', 'white_check_mark']
  } else {
    title = 'Dżin - Błąd na pytaniu 2! ❌'
    desc = `${inviteName} wybrała błędną opcję "${chosenAnswer}" i straciła serduszko.`
    tags = ['x', 'broken_heart']
  }

  await sendNtfy(title, desc, tags, 'default')
}

export async function notifyDiamondCardCollected(): Promise<void> {
  await sendNtfy(
    `Zdobyto Szczęśliwą Kartę Karo! ♦️`,
    `${inviteName} złapała w korytarzach Muzeum uciekającą Damę Karo! Karta pomoże jej u Dżina.`,
    ['diamonds', 'sparkles'],
    'default'
  )
}

export async function notifyDiamondCardUsed(questionNumber: number): Promise<void> {
  await sendNtfy(
    `Użyto Damy Karo u Dżina! ♦️ (Pytanie ${questionNumber})`,
    `${inviteName} aktywowała moc Szczęśliwej Damy Karo na pytaniu ${questionNumber}, eliminując błędne odpowiedzi!`,
    ['diamonds', 'magic_wand'],
    'default'
  )
}

export async function notifyGuardianDefeat(): Promise<void> {
  await sendNtfy(
    `Dżin - Porażka i powrót do Muzeum! 💨`,
    `${inviteName} straciła wszystkie serduszka u Dżina i została cofnięta do etapu Muzeum.`,
    ['skull', 'dash'],
    'default'
  )
}

export async function notifyGuardianRiddleAnswered(score: number, attemptsCount: number, allAttempts: number[]): Promise<void> {
  const historyText = attemptsCount > 1
    ? `\nWcześniejsze próby: ${allAttempts.slice(0, -1).join(', ')}`
    : '\nTrafiła w 10 za pierwszym razem! 🔥'
  await sendNtfy(
    `Strażnik Sarkofagu: ocena ${score}/10! 👑`,
    `${inviteName} odpowiedziała na pytanie jak hot jest twórca gry: ${score}/10!${historyText}`,
    ['crown', 'fire'],
    'default'
  )
}

export async function notifyGameCompleted(result: GameStats): Promise<void> {
  const skipsText = result.skippedStages && result.skippedStages.length > 0
    ? result.skippedStages.join(', ')
    : 'Brak (przeszła wszystkie poziomy samodzielnie! 🏆)'

  const manualCountText = result.manuallyCollectedCount !== undefined
    ? `${result.manuallyCollectedCount}/${result.totalLetters} złapanych samodzielnie w locie`
    : `${result.lettersCollected}/${result.totalLetters}`

  const timeText = result.totalPlayTimeSeconds !== undefined
    ? `${Math.floor(result.totalPlayTimeSeconds / 60)} min ${result.totalPlayTimeSeconds % 60} s`
    : 'brak danych'

  const guardianText = result.guardianAttempts && result.guardianAttempts.length > 0
    ? `10/10 (prób: ${result.guardianAttempts.length}${result.guardianAttempts.length > 1 ? `, historia: ${result.guardianAttempts.join(' -> ')}` : ''})`
    : '10/10'

  const body = [
    `Podsumowanie gry ${inviteName}:`,
    `• Poziom trudności: ${result.difficulty}`,
    `• Zebrane litery: ${result.lettersCollected}/${result.totalLetters} (${manualCountText})`,
    `• Pominięte etapy (skipy): ${skipsText}`,
    `• Zderzenia z przeszkodami: ${result.hitsTaken ?? 0}`,
    `• Utraty wszystkich żyć (Game Over): ${result.deathsCount ?? 0}`,
    `• Szczęśliwa Karta Karo: ${result.hasDiamondCard ? `Zdobyta w Muzeum ♦️ (użyta w pytaniach: ${result.diamondCardUsedQuestions?.join(', ') || 'brak'})` : 'Nie zdobyta'}`,
    `• Ocena u Strażnika Sarkofagu: ${guardianText}`,
    `• Czas spędzony w grze: ${timeText}`,
    `Hasło odkryte: JESTEŚ SŁODKA ✨`,
    `Do zobaczenia na randce! 💕`,
  ].join('\n')

  await sendNtfy(
    `Gra ukończona! Hasło: JESTEŚ SŁODKA 💕`,
    body,
    ['tada', 'sparkles', 'heart'],
    'high'
  )
}

export async function notifyScheduled(): Promise<void> {
  await sendNtfy(
    `Proposal accepted! 💍💕`,
    `${inviteName} said YES! 👰‍♀️🤵 Will you marry me? -> YES! 💕`,
  )
}

export async function notifyPicnicScheduled(date: string, items: string[]): Promise<void> {
  const itemsText = items.length > 0 ? items.join(', ') : 'brak (ale i tak będzie super!)'
  await sendNtfy(
    `Randka na piknik potwierdzona! 🧺💕`,
    `${inviteName} wybrała datę: ${date}!\nZebrane na piknik: ${itemsText}\nDo zobaczenia :p`,
  )
}

export async function notifyInstagramSubmitted(instagram: string, items: string[] = []): Promise<void> {
  const itemsText = items.length > 0 ? `\nZebrane na piknik: ${items.join(', ')}` : ''
  await sendNtfy(
    `Instagram podany! 📸💕`,
    `${inviteName} podała profil: ${instagram}!${itemsText}\nDo zobaczenia :p`,
  )
}



