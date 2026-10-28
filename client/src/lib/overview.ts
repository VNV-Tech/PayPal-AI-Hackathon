import { api } from './api'
import { formatMoney } from './config'
import type { Money } from './invoices'

// Mismos tipos que server/src/paypal/overview.ts (Overview).
export interface Overview {
  outstanding: Money[]
  outstandingCount: number
  overdueCount: number
  // null si PayPal no devolvió los pagos del mes.
  paidThisMonth: { totals: Money[]; count: number } | null
}

export const overviewApi = {
  get: () => api<Overview>('/overview'),
}

// Un total por moneda, por ejemplo "MX$1,300.00 + $50.00". Sin montos: $0.
export function formatTotals(totals: Money[]): string {
  if (totals.length === 0) return formatMoney(0)
  return totals.map((m) => formatMoney(Number(m.value), m.currency_code)).join(' + ')
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
