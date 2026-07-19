/**
 * Figma shows a live countdown ("1d:10Hr") beside each pending test, in red.
 * AITA's API gives a due date string, so the countdown is derived from it here.
 *
 * Returns null when there is no due date — callers should render nothing rather than a
 * placeholder, so an assignment without a deadline never looks like an urgent one.
 */
export type Countdown = { label: string; overdue: boolean; urgent: boolean }

/**
 * Renders a due value for display. The API may hand back a date-only string ("2026-07-20")
 * or a full ISO timestamp; both render as `DD/MM/YYYY · HH:mm`, dropping the time when the
 * source carried none. Anything unparseable is passed through untouched rather than shown
 * as "Invalid Date".
 */
export function formatDue(due: string): string {
  const d = new Date(due)
  if (Number.isNaN(d.getTime())) return due
  const p = (n: number) => String(n).padStart(2, '0')
  const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
  // A date-only input has no time component to show.
  if (!/[T ]\d{2}:/.test(due)) return date
  return `${date} · ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function countdownTo(due: string | null | undefined, now: Date = new Date()): Countdown | null {
  if (!due) return null
  const target = new Date(due)
  if (Number.isNaN(target.getTime())) return null

  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return { label: 'Quá hạn', overdue: true, urgent: true }

  const totalHours = Math.floor(ms / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  // Under 48h is the window worth shouting about; past that a date reads better than a countdown.
  const urgent = totalHours < 48
  if (days > 0) return { label: `${days}d:${hours}Hr`, overdue: false, urgent }
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  return { label: `${totalHours}h:${String(mins).padStart(2, '0')}m`, overdue: false, urgent }
}
