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
  recentPayments: RecentPayment[] // los más recientes primero
}

// Mismo tipo que server/src/paypal/transactions.ts (ReceivedPayment).
export interface RecentPayment {
  id: string
  amount: Money
  date: string // AAAA-MM-DD
  invoiceNumber: string | null
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

// Suma montos por moneda (por ejemplo, todo lo apartado en el mes).
export function sumTotals(amounts: Money[]): Money[] {
  const cents = new Map<string, number>()
  for (const m of amounts) cents.set(m.currency_code, (cents.get(m.currency_code) ?? 0) + Math.round(Number(m.value) * 100))
  return [...cents].map(([currency_code, c]) => ({ currency_code, value: (c / 100).toFixed(2) }))
}
