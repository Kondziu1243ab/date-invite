

import { inviteName } from './config'

async function sendNtfy(title: string, body: string): Promise<void> {
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

export type GameNotificationData = {
  lettersCollected: number
  totalLetters: number
  difficulty: string
  wasSkipped?: boolean
  guardianClicks?: number[]
}

export async function notifyGameCompleted(result: GameNotificationData): Promise<void> {
  const statusStr = result.wasSkipped
    ? 'Pomięto grę (kliknięto SKIP)'
    : 'Ukończono grę w całości'

  const guardianStr =
    result.guardianClicks && result.guardianClicks.length > 0
      ? result.guardianClicks.join(' -> ')
      : 'brak kliknięć u strażnika'

  const title = `Gra: ${result.wasSkipped ? 'Pominięta (Skip)' : 'Ukończona'} (${inviteName})`
  const body = [
    `Użytkownik: ${inviteName}`,
    `Status przejścia: ${statusStr}`,
    `Kliknięcia u strażnika skrzyni (po kolei): ${guardianStr}`,
    `Poziom trudności: ${result.difficulty}`,
    `Zebrane litery: ${result.lettersCollected}/${result.totalLetters}`,
    `Spotkanie: To widzimy się 7 listopada!`,
  ].join('\n')

  await sendNtfy(title, body)
}



