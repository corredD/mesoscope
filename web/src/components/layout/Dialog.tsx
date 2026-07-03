import { useEffect, type ReactNode } from 'react'
import './Dialog.css'

interface DialogProps {
  title: string
  onClose: () => void
  children?: ReactNode
}

/** Generic modal shell — reused by the Phase 4 column mapping/merging dialogs. */
export function Dialog({ title, onClose, children }: DialogProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="dialog-title">
          <span>{title}</span>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  )
}
