import { inviteName } from './config'

function formatDatePl(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) {
    return isoDate || 'Wesele'
  }
  try {
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}

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

export async function notifyScheduled(
  isoDate: string,
  placeLabel: string,
  instagram?: string,
): Promise<void> {
  const when = formatDatePl(isoDate)
  const instaText = instagram ? `\n📸 Insta: @${instagram.trim().replace(/^@/, '')}` : ''
  await sendNtfy(
    `Wesele z ${inviteName}! 💒💕`,
    `${inviteName}: TAK! Idzie ze mną na wesele! 👰‍♀️🤵\n📅 ${when}\n📍 ${placeLabel}${instaText}`,
  )
}
