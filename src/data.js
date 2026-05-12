// Runtime helpers + quote list. Program/library data lives on the server.

export const QUOTES = [
  { text: 'The body achieves what the mind believes.', author: 'Napoleon Hill' },
  { text: 'Train insane or remain the same.' },
  { text: "Every rep is a vote for the person you're becoming." },
  { text: "Strength doesn't come from what you can do. It comes from overcoming the things you thought you couldn't.", author: 'Rikki Rogers' },
  { text: "The pain you feel today is the strength you'll feel tomorrow." },
  { text: "You don't have to be extreme. Just consistent." },
  { text: 'One week of skipping becomes two. Show up anyway.' },
  { text: "Results don't care about your excuses." },
  { text: 'It never gets easier. You just get stronger.' },
  { text: 'Small steps every day beat big leaps once in a while.' },
  { text: 'Your only competition is who you were yesterday.' },
  { text: "Champions aren't made in gyms.", author: 'Muhammad Ali' },
  { text: 'Fall seven times, stand up eight.', author: 'Japanese proverb' },
  { text: 'Discipline is choosing between what you want now and what you want most.' },
  { text: "A year from now you'll wish you had started today.", author: 'Karen Lamb' }
]

export function getISOWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

export function quoteOfWeek(d = new Date()) {
  return QUOTES[getISOWeek(d) % QUOTES.length]
}

export function mondayIndex(d = new Date()) {
  return (d.getDay() + 6) % 7
}

export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function mondayOfWeek(d = new Date()) {
  const m = new Date(d)
  m.setHours(0, 0, 0, 0)
  m.setDate(m.getDate() - mondayIndex(m))
  return m
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const prettyDayDate = (d = new Date()) => {
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]
  return `${m} ${d.getDate()}`
}
