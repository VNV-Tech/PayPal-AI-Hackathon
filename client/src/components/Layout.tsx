import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, CircleHelp, FileText, House, type LucideIcon, PiggyBank, Sparkles, UserRound } from 'lucide-react'
import { APP_NAME } from '../lib/config'
import { MODES, type Mode, loadMode, saveMode } from '../lib/mode'
import { isTourDone } from '../lib/tour'
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
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const nav = MODES[mode].nav

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
        <Outlet context={{ mode }} />
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

      {tourOpen && <Tour onClose={() => setTourOpen(false)} onModeChange={setMode} />}
    </div>
  )
}
