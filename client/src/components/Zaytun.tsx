import { X } from 'lucide-react'
import { MASCOT } from '../lib/config'

// Zaytun, la mascota (un Cinnyris, dibujo de Vanessa). Es el mismo copiloto:
// en la pestaña Copilot platica contigo y en las demás pantallas te acompaña
// flotando en la esquina, y avisa con un globito cuando tiene algo para ti.

export function ZaytunAvatar({ className = 'size-8' }: { className?: string }) {
  return <img src={MASCOT.image} alt="" className={`${className} shrink-0 rounded-full object-cover`} />
}

export interface CopilotNotice {
  id?: string // sin id: todavía lo está pensando
  invoiceNumber?: string
}

export function ZaytunBuddy({
  notice,
  onOpen,
  onDismiss,
  className = '',
}: {
  notice: CopilotNotice | null
  onOpen: () => void
  onDismiss: () => void
  className?: string
}) {
  const thinking = notice !== null && !notice.id
  return (
    <div className={`fixed right-4 bottom-24 z-20 flex items-end gap-3 sm:right-6 sm:bottom-6 ${className}`}>
      {/* Globito de notificación, como si Zaytun te hablara. */}
      {notice && (
        <div
          role="status"
          className="relative mb-2 w-[min(18rem,calc(100vw-7rem))] rounded-2xl bg-surface p-3 pr-8 text-sm shadow-xl ring-1 ring-line"
        >
          <p className="font-semibold text-ink">
            {thinking ? `${MASCOT.name} is on it` : `${MASCOT.name} has a suggestion`}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {notice.invoiceNumber ? `Invoice #${notice.invoiceNumber} was just paid.` : 'Something new happened.'}{' '}
            {thinking ? 'Preparing next steps…' : 'Tap me to take a look.'}
          </p>
          {thinking ? (
            <span aria-hidden className="mt-2 flex gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="size-1.5 animate-bounce rounded-full bg-brand-600"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className="mt-2 rounded-full bg-brand-solid px-3 py-1 text-xs font-semibold text-on-brand hover:bg-brand-solid-hover"
            >
              Review
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute top-2 right-2 rounded-full p-1 text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <X aria-hidden className="size-3.5" />
          </button>
          {/* Piquito del globo hacia Zaytun. */}
          <span aria-hidden className="absolute -right-1.5 bottom-4 size-3 rotate-45 bg-surface" />
        </div>
      )}

      <button
        type="button"
        data-tour="zaytun"
        onClick={onOpen}
        aria-label={notice?.id ? `${MASCOT.name} has a suggestion` : `Talk to ${MASCOT.name}, your copilot`}
        title={`${MASCOT.name}, your copilot`}
        className="relative shrink-0 rounded-full shadow-xl ring-4 ring-brand-solid transition-transform hover:scale-105"
      >
        <ZaytunAvatar className={`size-14 ${thinking ? 'animate-pulse' : ''}`} />
        {/* Puntito de notificación. */}
        {notice?.id && (
          <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-danger ring-2 ring-surface">
            <span className="absolute inset-0 animate-ping rounded-full bg-danger" />
          </span>
        )}
      </button>
    </div>
  )
}
