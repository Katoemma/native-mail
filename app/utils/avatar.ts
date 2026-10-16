/** Initials from a display name or email — always returns 1–2 characters. */
export function senderInitials(name?: string | null, email?: string | null): string {
  const n = name?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  const e = email?.trim()
  if (e) return e.slice(0, 2).toUpperCase()
  return '?'
}

/** Soft, deterministic avatar colors from an email address. */
export function avatarStyle(seed: string): { backgroundColor: string; color: string } {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return {
    backgroundColor: `oklch(0.92 0.05 ${hue})`,
    color: `oklch(0.42 0.12 ${hue})`,
  }
}
