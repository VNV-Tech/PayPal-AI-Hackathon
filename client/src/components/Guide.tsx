import { useState } from 'react'
import { ChevronDown, ChevronUp, Circle, CircleCheck, Compass, X } from 'lucide-react'
import { type JourneyStep, currentStep } from '../lib/journey'
import type { TourStep } from '../lib/tour'
import { useLayout } from '../lib/mode'
import { Button, Card } from './ui'

// La guía acompaña en todo el proceso, sin IA:
// - Guide: tarjeta del Home con el camino completo.
// - GuideBubble: burbuja en las demás pantallas con el paso actual.
// Las reglas y los textos están en client/src/lib/journey.ts.

function label(firstTime: boolean) {
  return firstTime ? 'Your next step' : 'Still to do'
}

function StepHelp({ step, onShowMe }: { step: JourneyStep; onShowMe: (s: TourStep) => void }) {
  return (
    <div className="rounded-xl bg-brand-50 px-4 py-3">
      <p className="text-sm text-brand-900">{step.hint ?? step.why}</p>
      {step.hint && <p className="mt-1 text-xs text-ink-muted">Why: {step.why}</p>}
      {step.showMe && (
        <Button className="mt-3" onClick={() => onShowMe(step.showMe!)}>
          Show me
        </Button>
      )}
    </div>
  )
}

export function Guide({ title }: { title: string }) {
  const { journey: steps, showMe, guideOff, setGuideOff } = useLayout()
  const [open, setOpen] = useState(true)

  if (guideOff) {
    return (
      <p className="mb-4 text-right text-xs text-ink-muted">
        <button type="button" onClick={() => setGuideOff(false)} className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">
          <Compass aria-hidden className="size-3.5" />
          Turn the guide back on
        </button>
      </p>
    )
  }
  if (!steps) return null

  const current = currentStep(steps)
  const doneCount = steps.filter((s) => s.done).length
  const expanded = open && current !== null

  return (
    <Card className="mb-6 p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
          <Compass aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold tracking-wider text-brand-600 uppercase">
            {current ? label(current.firstTime) : 'All caught up 🎉'}
          </span>
          <span className="block font-semibold text-ink">{current ? current.step.title : title}</span>
        </span>
        <span className="text-xs font-semibold text-ink-muted tabular-nums">
          {doneCount} of {steps.length}
        </span>
        {current &&
          (expanded ? <ChevronUp aria-hidden className="size-4 text-ink-muted" /> : <ChevronDown aria-hidden className="size-4 text-ink-muted" />)}
      </button>

      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {steps.map((s) => (
          <span key={s.id} className={`h-1.5 flex-1 rounded-full ${s.done ? 'bg-brand-600' : 'bg-line'}`} />
        ))}
      </div>

      {expanded && current && (
        <>
          <div className="mt-4">
            <StepHelp step={current.step} onShowMe={showMe} />
          </div>
          <ol className="mt-4 space-y-2">
            {steps.map((s, i) => (
              <li key={s.id} className="flex items-start gap-3 text-sm">
                {s.done ? (
                  <CircleCheck aria-label="Done" className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <Circle aria-label="To do" className={`mt-0.5 size-4 shrink-0 ${s === current.step ? 'text-brand-600' : 'text-line'}`} />
                )}
                <span className={s === current.step ? 'font-semibold text-ink' : 'text-ink-muted'}>
                  {i + 1}. {s.title}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="mt-4 text-right">
        <button type="button" onClick={() => setGuideOff(true)} className="text-xs font-semibold text-ink-muted hover:text-ink">
          I’ve got it, turn off the guide
        </button>
      </div>
    </Card>
  )
}

// Burbuja en la esquina de las demás pantallas: el paso actual, siempre a la
// mano, sin tener que volver al Home. Se puede encoger.
export function GuideBubble({
  steps,
  onShowMe,
  onTurnOff,
}: {
  steps: JourneyStep[]
  onShowMe: (s: TourStep) => void
  onTurnOff: () => void
}) {
  const [open, setOpen] = useState(true)
  const current = currentStep(steps)
  if (!current) return null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-20 flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-brand-600 shadow-lg ring-1 ring-line sm:bottom-6 sm:left-6"
      >
        <Compass aria-hidden className="size-4" />
        {label(current.firstTime)}
      </button>
    )
  }

  return (
    <aside
      aria-label="Guide"
      className="fixed right-4 bottom-24 left-4 z-20 rounded-2xl bg-surface p-4 shadow-xl ring-1 ring-line sm:right-auto sm:bottom-6 sm:left-6 sm:w-80"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
          <Compass aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wider text-brand-600 uppercase">{label(current.firstTime)}</p>
          <p className="font-semibold text-ink">{current.step.title}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Minimize guide" className="text-ink-muted hover:text-ink">
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div className="mt-3">
        <StepHelp step={current.step} onShowMe={onShowMe} />
      </div>
      <button type="button" onClick={onTurnOff} className="mt-3 text-xs font-semibold text-ink-muted hover:text-ink">
        I’ve got it, turn off the guide
      </button>
    </aside>
  )
}
