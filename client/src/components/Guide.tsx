import { useState } from 'react'
import { CircleCheck, Circle, Compass, ChevronDown, ChevronUp } from 'lucide-react'
import type { JourneyStep } from '../lib/journey'
import { useShowMe } from '../lib/mode'
import { Button, Card } from './ui'

// Guía "Your next step" del Home: el camino del modo, con el paso actual
// explicado y un botón que lleva a la pantalla e ilumina qué presionar.
// Las reglas y los textos están en client/src/lib/journey.ts.
export function Guide({ title, steps }: { title: string; steps: JourneyStep[] }) {
  const showMe = useShowMe()
  // Primero lo que nunca se ha hecho; con el camino completo, lo que quede pendiente.
  const firstTime = steps.find((s) => !s.done)
  const current = firstTime ?? steps.find((s) => s.todo)
  const doneCount = steps.filter((s) => s.done).length
  // Con todo hecho, la guía se encoge para no estorbar.
  const [open, setOpen] = useState(Boolean(current))

  return (
    <Card className="mb-6 p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
          <Compass aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold tracking-wider text-brand-600 uppercase">
            {firstTime ? 'Your next step' : current ? 'Next up' : 'You did the whole flow 🎉'}
          </span>
          <span className="block font-semibold text-ink">{current ? current.title : title}</span>
        </span>
        <span className="text-xs font-semibold text-ink-muted tabular-nums">
          {doneCount} of {steps.length}
        </span>
        {open ? <ChevronUp aria-hidden className="size-4 text-ink-muted" /> : <ChevronDown aria-hidden className="size-4 text-ink-muted" />}
      </button>

      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {steps.map((s) => (
          <span key={s.id} className={`h-1.5 flex-1 rounded-full ${s.done ? 'bg-brand-600' : 'bg-line'}`} />
        ))}
      </div>

      {open && (
        <>
          {current && (
            <div className="mt-4 rounded-xl bg-brand-50 px-4 py-3">
              <p className="text-sm text-brand-900">{current.hint ?? current.why}</p>
              {current.hint && <p className="mt-1 text-xs text-ink-muted">Why: {current.why}</p>}
              {current.showMe && (
                <Button className="mt-3" onClick={() => showMe(current.showMe!)}>
                  Show me
                </Button>
              )}
            </div>
          )}

          <ol className="mt-4 space-y-2">
            {steps.map((s, i) => (
              <li key={s.id} className="flex items-start gap-3 text-sm">
                {s.done ? (
                  <CircleCheck aria-label="Done" className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <Circle aria-label="To do" className={`mt-0.5 size-4 shrink-0 ${s === current ? 'text-brand-600' : 'text-line'}`} />
                )}
                <span className={s.done ? 'text-ink-muted' : s === current ? 'font-semibold text-ink' : 'text-ink-muted'}>
                  {i + 1}. {s.title}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Card>
  )
}
