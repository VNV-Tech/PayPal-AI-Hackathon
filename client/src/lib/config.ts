// Nombre provisional: cambiarlo aquí lo cambia en toda la interfaz.
export const APP_NAME = 'VNV Copilot'

// La mascota: el copiloto con cara (dibujo de Vanessa, un Cinnyris).
export const MASCOT = { name: 'Zaytun', image: '/zaytun.webp' }

// Moneda por defecto (desde el 8 nov, USD: el caso principal son clientes en
// el extranjero). Se usa en las facturas nuevas y para mostrar los ceros.
export const DEFAULT_CURRENCY = 'USD'

export function formatMoney(amount: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function formatDate(isoDate: string | null) {
  if (!isoDate) return '—'
  // Fecha sin hora (YYYY-MM-DD): se interpreta como local para no mostrar el día anterior.
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Nombre del mes actual, por ejemplo "October".
export function currentMonthName() {
  return new Date().toLocaleDateString('en-US', { month: 'long' })
}
