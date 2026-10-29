import { api } from './api'
import type { Money } from './invoices'

// Mismos tipos que server/src/savings.ts (SavingsSummary).
export interface PlanBucket {
  id: string
  name: string
  percent: number
}

export interface Allocation {
  bucketId: string
  name: string
  percent: number
  amount: Money
}

export interface PaymentReview {
  id: string
  date: string
  invoiceNumber: string | null
  amount: Money
  proposal: Allocation[]
}

export interface Savings {
  month: string // AAAA-MM
  plan: PlanBucket[]
  paid: Money[] | null // null si PayPal no devolvió los pagos del mes
  pending: PaymentReview[] // pagos que esperan respuesta
  // Lo apartado este mes. percent es null si el apartado ya no está en el plan.
  buckets: { id: string; name: string; percent: number | null; amounts: Money[] }[]
  available: Money[]
}

export type PlanInput = { id?: string; name: string; percent: number }[]

export const MAX_BUCKETS = 6

export const savingsApi = {
  get: () => api<Savings>('/savings'),
  savePlan: (buckets: PlanInput) => api<Savings>('/savings/plan', { method: 'PUT', body: JSON.stringify({ buckets }) }),
  decide: (paymentId: string, decision: 'set_aside' | 'skip') =>
    api<Savings>(`/savings/payments/${paymentId}`, { method: 'POST', body: JSON.stringify({ decision }) }),
}
