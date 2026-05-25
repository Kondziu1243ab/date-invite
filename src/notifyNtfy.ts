import { inviteName } from './config'

function formatDatePl(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

async function sendNtfy(title: string, body: string): Promise<void> {
  const topic = import.meta.env.VITE_NTFY_TOPIC
  if (!topic) return

  try {
    await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers: { Title: title },
      body,
    })
  } catch {
    // UI działa nawet gdy powiadomienie się nie wyśle
  }
}

export async function notifyScheduled(
  isoDate: string,
  placeLabel: string,
): Promise<void> {
  const when = formatDatePl(isoDate)
  await sendNtfy(
    `Randka umówiona – ${inviteName}!`,
    `${inviteName}: TAK! 💕\n📅 ${when}\n📍 ${placeLabel}`,
  )
}
