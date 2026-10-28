import { type CSSProperties, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Mode } from '../lib/mode'
import { TOUR_STEPS, markTourDone } from '../lib/tour'
import { Button } from './ui'

// Tutorial de bienvenida: oscurece la pantalla, ilumina una parte y muestra
// un mensaje del copiloto. Los textos están en client/src/lib/tour.ts.
// Se monta solo mientras está abierto, así siempre empieza en el paso 1.

const PAD = 8 // margen alrededor de lo iluminado
const GAP = 12 // separación entre lo iluminado y el mensaje
const CARD_WIDTH = 360
const CARD_HEIGHT_ESTIMATE = 260 // para decidir si el mensaje cabe abajo

export function Tour({ onClose, onModeChange }: { onClose: () => void; onModeChange: (mode: Mode) => void }) {
  const [index, setIndex] = useState(0)
  // Posición de lo iluminado, junto con el paso al que pertenece.
  const [found, setFound] = useState<{ stepId: string; rect: DOMRect } | null>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const step = TOUR_STEPS[index]
  const isFirst = index === 0
  const isLast = index === TOUR_STEPS.length - 1
  const rect = found?.stepId === step.id ? found.rect : null

  // Cada paso puede cambiar de modo y llevar a otra pantalla.
  useEffect(() => {
    if (step.mode) onModeChange(step.mode)
  }, [step, onModeChange])

  useEffect(() => {
    if (step.route && pathname !== step.route) navigate(step.route)
  }, [step, pathname, navigate])

  // Busca la parte que se ilumina. Puede tardar unos cuadros en aparecer
  // después de cambiar de pantalla.
  useEffect(() => {
    if (!step.target) return
    let el: Element | null = null
    let frame = 0
    let tries = 0
    const measure = () => {
      if (el) setFound({ stepId: step.id, rect: el.getBoundingClientRect() })
    }
    const find = () => {
      el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        el.scrollIntoView({ block: 'center' })
        measure()
      } else if (++tries < 120) {
        frame = requestAnimationFrame(find)
      }
    }
    frame = requestAnimationFrame(find)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, pathname])

  function finish() {
    markTourDone()
    onClose()
  }

  const next = () => (isLast ? finish() : setIndex((i) => i + 1))
  const back = () => setIndex((i) => Math.max(0, i - 1))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {rect ? (
        // La sombra gigante oscurece todo menos el recuadro.
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl ring-4 ring-brand-500 motion-safe:transition-all"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgb(0 20 53 / 0.55)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-ink/55" />
      )}

      <section
        className="fixed w-[min(360px,calc(100vw-2rem))] rounded-2xl bg-surface p-5 shadow-xl max-sm:right-4 max-sm:bottom-4 max-sm:left-4 max-sm:w-auto"
        style={cardPosition(rect)}
      >
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-10 rounded-full" />
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Step {index + 1} of {TOUR_STEPS.length}
          </p>
        </div>
        <h2 id="tour-title" className="mt-3 text-lg font-bold text-ink">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1 text-sm leading-relaxed text-ink-muted">
          {step.body}
        </p>

        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {TOUR_STEPS.map((s, i) => (
            <span key={s.id} className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-brand-600' : 'bg-line'}`} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {isLast ? (
            <span />
          ) : (
            <Button variant="ghost" onClick={finish} className="px-3">
              Skip tour
            </Button>
          )}
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="secondary" onClick={back}>
                Back
              </Button>
            )}
            {/* key + autoFocus: el botón recibe el foco en cada paso (teclado y lectores de pantalla). */}
            <Button key={index} autoFocus onClick={next}>
              {isFirst ? 'Show me' : isLast ? 'Start' : 'Next'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

// Abajo de lo iluminado si cabe; si no, arriba. Sin nada iluminado, al centro.
// En celular el mensaje siempre va abajo (clases max-sm:).
function cardPosition(rect: DOMRect | null): CSSProperties {
  if (typeof window !== 'undefined' && window.innerWidth < 640) return {}
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  const left = Math.min(Math.max(16, rect.left - PAD), window.innerWidth - CARD_WIDTH - 16)
  const below = rect.bottom + PAD + GAP
  if (below + CARD_HEIGHT_ESTIMATE <= window.innerHeight) return { top: below, left }
  return { bottom: window.innerHeight - rect.top + PAD + GAP, left }
}
