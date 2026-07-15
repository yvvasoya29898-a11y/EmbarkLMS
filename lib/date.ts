export function formatISTDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return 'TBD'
  // Handle SQL Date strings (like '2026-08-10') without timezone issues
  let d: Date
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Append time to parse as local date instead of UTC midnight
    d = new Date(`${date}T00:00:00`)
  } else {
    d = typeof date === 'string' ? new Date(date) : date
  }

  if (isNaN(d.getTime())) return 'Invalid Date'

  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    ...options
  })
}

export function formatISTTime(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''

  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options
  })
}

export function formatISTDateTime(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return 'TBD'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'Invalid Date'

  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options
  }).replace(/, /g, ' · ') // replace standard commas with visual middle dots
}
