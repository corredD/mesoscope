/**
 * Sprite thumbnails drawn only once loaded (recipe-view.md §2.8: legacy draws an image when `complete && done`, never
 * a failed one). A load starts the first time a URL is asked for; `useSpriteVersion` re-renders when one finishes.
 */
import { useSyncExternalStore } from 'react'

const status = new Map<string, 'loading' | 'ok' | 'error'>()
const listeners = new Set<() => void>()
let version = 0

export function spriteReady(url: string): boolean {
  const s = status.get(url)
  if (s === undefined && typeof Image !== 'undefined') {
    status.set(url, 'loading')
    const img = new Image()
    img.onload = () => {
      status.set(url, 'ok')
      version++
      for (const listener of listeners) listener()
    }
    img.onerror = () => status.set(url, 'error')
    img.src = url
  }
  return s === 'ok'
}

export function useSpriteVersion(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => version,
  )
}
