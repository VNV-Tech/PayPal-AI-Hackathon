import { useOutletContext } from 'react-router-dom'
import type { TourStep } from './tour'

// La app tiene dos modos que no se mezclan:
// - business: cobrar a clientes (facturas).
// - personal: organizar lo que te pagan (apartados).
// Cada modo tiene su color de acento (ver [data-mode] en index.css) y su menú.
export type Mode = 'business' | 'personal'

export const MODES: Record<Mode, { label: string; nav: { to: string; label: string }[] }> = {
  business: {
    label: 'Business',
    nav: [
      { to: '/', label: 'Home' },
      { to: '/invoices', label: 'Invoices' },
      { to: '/copilot', label: 'Copilot' },
    ],
  },
  personal: {
    label: 'Personal',
    nav: [
      { to: '/', label: 'Home' },
      { to: '/savings', label: 'Savings' },
      { to: '/copilot', label: 'Copilot' },
    ],
  },
}

const MODE_KEY = 'vnv-mode'

// Se recuerda el último modo. Si el navegador no deja guardar, empieza en business.
export function loadMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'personal' ? 'personal' : 'business'
  } catch {
    return 'business'
  }
}

export function saveMode(mode: Mode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // Se ignora: ver loadMode.
  }
}

interface LayoutContext {
  mode: Mode
  // Lleva a una pantalla e ilumina un botón (lo usa la guía).
  showMe: (step: TourStep) => void
}

// Layout comparte el modo con las pantallas a través del <Outlet>.
export function useMode(): Mode {
  return useOutletContext<LayoutContext>().mode
}

export function useShowMe(): LayoutContext['showMe'] {
  return useOutletContext<LayoutContext>().showMe
}
