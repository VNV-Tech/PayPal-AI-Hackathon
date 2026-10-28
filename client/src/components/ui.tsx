import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

// Componentes base reutilizables. Vanessa: aquí se ajusta el estilo global
// de botones, tarjetas y etiquetas.

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-800',
  secondary: 'border border-brand-600 text-brand-600 hover:bg-brand-50',
  ghost: 'text-ink-muted hover:bg-canvas hover:text-ink',
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${buttonBase} ${buttonStyles[variant]} ${className}`} {...props} />
}

// Enlace con apariencia de botón (evita anidar <button> dentro de <a>).
export function ButtonLink({ variant = 'primary', className = '', ...props }: LinkProps & { variant?: ButtonVariant }) {
  return <Link className={`${buttonBase} ${buttonStyles[variant]} ${className}`} {...props} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-6 shadow-sm ${className}`}>{children}</section>
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-canvas text-ink-muted',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-brand-100 text-brand-800',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneStyles[tone]}`}>{children}</span>
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions}
    </header>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Ventana modal sobre <dialog> nativo: atrapa el foco y se cierra con Esc.
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="modal-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      {open && (
        <div className="p-6">
          <h2 id="modal-title" className="text-lg font-bold tracking-tight">
            {title}
          </h2>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  )
}
