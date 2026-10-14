

import { inviteName } from './config'
import type { WeddingPlan } from './WeddingPlannerModal'
import { VENUE_DETAILS, CROWN_DETAILS, MUSIC_DETAILS, DRINK_DETAILS } from './WeddingPlannerModal'

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

export async function notifyWeddingDateSelected(date: string): Promise<void> {
  await sendNtfy(
    `Data wesela zaklepana! 💍💒`,
    `${inviteName} wybrała datę wesela: ${date}! 💕👰‍♀️🤵`,
  )
}

export async function notifyInstagramSubmitted(
  instagram: string,
  weddingDate?: string,
  items: string[] = [],
  weddingPlan?: WeddingPlan,
): Promise<void> {
  const dateText = weddingDate ? `\nData wesela: ${weddingDate}` : ''
  const planText = weddingPlan
    ? `\nPlan wesela:\n- Sala: ${VENUE_DETAILS[weddingPlan.venue].emoji} ${VENUE_DETAILS[weddingPlan.venue].label}\n- Welon: ${CROWN_DETAILS[weddingPlan.crown].emoji} ${CROWN_DETAILS[weddingPlan.crown].label}\n- Pierwszy taniec: ${MUSIC_DETAILS[weddingPlan.music].emoji} ${MUSIC_DETAILS[weddingPlan.music].label}\n- Toast: ${DRINK_DETAILS[weddingPlan.drink].emoji} ${DRINK_DETAILS[weddingPlan.drink].label}`
    : ''
  const itemsText = items.length > 0 ? `\nZebrane na sali weselnej: ${items.join(', ')}` : ''
  await sendNtfy(
    `Instagram podany na wesele! 📸💒`,
    `${inviteName} podała profil: ${instagram}!${dateText}${planText}${itemsText}\nDo zobaczenia na weselu i na insta! 💕`,
  )
}


