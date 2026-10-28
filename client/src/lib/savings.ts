import { api } from './api'
import type { Money } from './invoices'

// Mismos tipos que server/src/savings.ts (SavingsSummary).
export interface SavingsBucket {
  id: string
  name: string
  percent: number
  amounts: Money[]
}

export interface Savings {
  month: string // AAAA-MM
  paid: Money[] | null // null si PayPal no devolvió los pagos del mes
  buckets: SavingsBucket[]
  available: Money[]
}

export type PlanInput = { id?: string; name: string; percent: number }[]

export const MAX_BUCKETS = 6

export const savingsApi = {
  get: () => api<Savings>('/savings'),
  savePlan: (buckets: PlanInput) => api<Savings>('/savings/plan', { method: 'PUT', body: JSON.stringify({ buckets }) }),
}
