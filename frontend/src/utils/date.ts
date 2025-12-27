/**
 * Format a date string to YYYY/MM/DD HH:mm format (JST)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}`
}

/**
 * Format a date string to relative time (e.g., "3分前", "1時間前")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return 'たった今'
  } else if (diffMin < 60) {
    return `${diffMin}分前`
  } else if (diffHour < 24) {
    return `${diffHour}時間前`
  } else if (diffDay < 7) {
    return `${diffDay}日前`
  } else {
    return formatDate(dateString)
  }
}

/**
 * Format a date string to date only (YYYY/MM/DD)
 */
export function formatDateOnly(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}
