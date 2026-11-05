/**
 * Sprite thumbnails drawn only once loaded (recipe-view.md §2.8: legacy draws an image when `complete && done`, never
 * a failed one). A load starts the first time a URL is asked for; listeners hear when one finishes, so a resting
 * canvas can draw it.
 */
const images = new Map<string, { img: HTMLImageElement; ok: boolean }>()
const listeners = new Set<() => void>()

/** The loaded image for `url`, or null while it loads or after it failed. */
export function spriteImage(url: string): HTMLImageElement | null {
  const entry = images.get(url)
  if (entry) return entry.ok ? entry.img : null
  if (typeof Image === 'undefined') return null
  const img = new Image()
  const record = { img, ok: false }
  images.set(url, record)
  img.onload = () => {
    record.ok = img.naturalWidth > 0 && img.naturalHeight > 0
    for (const listener of listeners) listener()
  }
  img.src = url
  return null
}

export function spriteReady(url: string): boolean {
  return spriteImage(url) !== null
}

/** Called each time an image finishes loading; returns the unsubscribe. */
export function onSpriteLoad(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
