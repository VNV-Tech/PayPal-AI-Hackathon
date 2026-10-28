import { NavLink, Outlet } from 'react-router-dom'
import { APP_NAME } from '../lib/config'

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/copilot', label: 'Copilot' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/savings', label: 'Savings' },
]

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-brand-800 text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <img src="/favicon.svg" alt="" className="size-8 rounded-lg ring-1 ring-white/20" />
            {APP_NAME}
          </NavLink>
          <nav aria-label="Main" className="flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-white text-brand-800' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            Sandbox
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
