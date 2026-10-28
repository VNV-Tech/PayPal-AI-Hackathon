import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, CircleHelp, FileText, House, type LucideIcon, PiggyBank, Sparkles, UserRound, X } from 'lucide-react'
import { APP_NAME } from '../lib/config'
import { useLiveEvents } from '../lib/events'
import { isGuideOff, saveGuideOff, useJourney } from '../lib/journey'
import { MODES, type Mode, loadMode, saveMode } from '../lib/mode'
import { type TourStep, isTourDone, markTourDone } from '../lib/tour'
import { GuideBubble } from './Guide'
import { Tour } from './Tour'

const NAV_ICONS: Record<string, LucideIcon> = {
  '/': House,
  '/invoices': FileText,
  '/savings': PiggyBank,
  '/copilot': Sparkles,
}

const MODE_ICONS: Record<Mode, LucideIcon> = { business: BriefcaseBusiness, personal: UserRound }

export function Layout() {
  const [mode, setMode] = useState<Mode>(loadMode)
  // El tutorial se abre solo la primera vez; después, con el botón Tour.
  const [tourOpen, setTourOpen] = useState(() => !isTourDone())
  // Paso que ilumina el botón "Show me" de la guía.
  const [spotlight, setSpotlight] = useState<TourStep | null>(null)
  // Guía: acompaña en todas las pantallas hasta que el usuario la apaga.
  const journey = useJourney(mode)
  const [guideOff, setGuideOffState] = useState(isGuideOff)
  const setGuideOff = (off: boolean) => {
    setGuideOffState(off)
    saveGuideOff(off)
  }
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const nav = MODES[mode].nav
  // Aviso cuando el copiloto prepara algo por su cuenta (por ejemplo, al llegar un pago).
  const [suggestion, setSuggestion] = useState<{ id: string; invoiceNumber?: string } | null>(null)

  useLiveEvents((event) => {
    if (event.type === 'copilot.suggestion' && event.suggestionId) {
      setSuggestion({ id: event.suggestionId, invoiceNumber: event.invoiceNumber })
    }
  })

  function openSuggestion(id: string) {
    setSuggestion(null)
    navigate(`/copilot?suggestion=${id}`)
  }

  function changeMode(next: Mode) {
    setMode(next)
    saveMode(next)
    // Si la pantalla actual no existe en el otro modo, se vuelve al inicio.
    if (!MODES[next].nav.some((item) => item.to === pathname)) navigate('/')
  }

  return (
    <div data-mode={mode} className="min-h-screen pb-20 sm:pb-0">
      <header className="sticky top-0 z-10 bg-navy-900 text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
            <img src="/favicon.svg" alt="" className="size-8 rounded-lg ring-1 ring-white/20" />
            <span className="max-md:sr-only">{APP_NAME}</span>
          </NavLink>

          <div data-tour="mode-switch" role="group" aria-label="Mode" className="flex rounded-full bg-white/10 p-1">
            {(Object.keys(MODES) as Mode[]).map((m) => {
              const Icon = MODE_ICONS[m]
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => changeMode(m)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    mode === m ? 'bg-brand-600 text-white shadow-sm' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Icon aria-hidden className="size-4" />
                  {MODES[m].label}
                </button>
              )
            })}
          </div>

          <nav aria-label="Main" className="flex gap-1 max-sm:hidden">
            {nav.map((item) => {
              const Icon = NAV_ICONS[item.to]
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive ? 'bg-white text-navy-900' : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon aria-hidden className="size-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              aria-label="Tour"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
            >
              <CircleHelp aria-hidden className="size-4" />
              <span className="max-sm:hidden">Tour</span>
            </button>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase max-sm:hidden">
              Sandbox
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet context={{ mode, showMe: setSpotlight, journey, guideOff, setGuideOff }} />
      </main>

      {/* En celular el menú va abajo, como en las apps. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {nav.map((item) => {
          const Icon = NAV_ICONS[item.to]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold ${
                  isActive ? 'text-brand-600' : 'text-ink-muted'
                }`
              }
            >
              <Icon aria-hidden className="size-5" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* En Home la guía es una tarjeta; en el chat estorbaría la caja de texto. */}
      {journey && !guideOff && !tourOpen && !spotlight && !suggestion && pathname !== '/' && pathname !== '/copilot' && (
        <GuideBubble steps={journey} onShowMe={setSpotlight} onTurnOff={() => setGuideOff(true)} />
      )}

      {suggestion && (
        <div
          role="status"
          className="fixed right-4 bottom-24 left-4 z-20 flex items-center gap-3 rounded-2xl bg-navy-900 p-4 text-white shadow-xl sm:bottom-6 sm:left-auto sm:w-96"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Your copilot has a suggestion</p>
            <p className="text-xs text-white/70">
              {suggestion.invoiceNumber ? `Invoice #${suggestion.invoiceNumber} was just paid.` : 'Something new happened.'} Take a
              look?
            </p>
          </div>
          <button
            type="button"
            onClick={() => openSuggestion(suggestion.id)}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-brand-50"
          >
            Review
          </button>
          <button type="button" onClick={() => setSuggestion(null)} aria-label="Dismiss" className="text-white/60 hover:text-white">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}

      {tourOpen && (
        <Tour
          onClose={() => {
            markTourDone()
            setTourOpen(false)
          }}
          onModeChange={setMode}
        />
      )}
      {spotlight && <Tour steps={[spotlight]} onClose={() => setSpotlight(null)} onModeChange={setMode} />}
    </div>
  )
}
