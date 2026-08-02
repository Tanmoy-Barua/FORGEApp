import type { ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
}

export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  if (!open) return null
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        <div className="sheet-title">{title}</div>
        {subtitle ? <div className="sheet-sub">{subtitle}</div> : null}
        {children}
      </div>
    </>
  )
}
