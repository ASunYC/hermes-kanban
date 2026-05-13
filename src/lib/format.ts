export function formatAge(seconds?: number | null): string {
  if (seconds === undefined || seconds === null) return 'fresh'
  if (seconds < 60) return `${Math.max(1, Math.floor(seconds))}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export function formatDateTime(epoch?: number | null): string {
  if (!epoch) return 'not set'
  return new Date(epoch * 1000).toLocaleString()
}

export function compactId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 7)}...${id.slice(-4)}`
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').toUpperCase()
}
