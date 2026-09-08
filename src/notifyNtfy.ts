

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

