import { api } from './api'

// Mismos tipos que server/src/paypal/invoices.ts (InvoiceSummary).
export interface Money {
  currency_code: string
  value: string
}

export interface Invoice {
  id: string
  number: string | null
  status: string
  customer: { name: string | null; email: string | null; company: string | null }
  amount: Money | null
  dueAmount: Money | null
  invoiceDate: string | null
  dueDate: string | null
  createdAt: string | null
  payerViewUrl: string
}

export interface InvoicePage {
  invoices: Invoice[]
  totalItems: number
  totalPages: number
}

export const PAYMENT_TERMS = [
  ['DUE_ON_RECEIPT', 'Due on receipt'],
  ['NET_10', 'Net 10 days'],
  ['NET_15', 'Net 15 days'],
  ['NET_30', 'Net 30 days'],
  ['NET_45', 'Net 45 days'],
  ['NET_60', 'Net 60 days'],
] as const

export const CURRENCIES = ['MXN', 'USD'] as const

export interface NewInvoice {
  customer: { name: string; email: string; company?: string }
  items: { name: string; quantity: number; unitAmount: number }[]
  currency: (typeof CURRENCIES)[number]
  terms: (typeof PAYMENT_TERMS)[number][0]
  note?: string
}

export type InvoiceAction = 'send' | 'remind' | 'cancel' | 'delete'

export const invoicesApi = {
  list: (page = 1) => api<InvoicePage>(`/invoices?page=${page}`),
  create: (input: NewInvoice) => api<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(input) }),
  run: (id: string, action: InvoiceAction) =>
    action === 'delete'
      ? api<null>(`/invoices/${id}`, { method: 'DELETE' })
      : api<Invoice>(`/invoices/${id}/${action}`, { method: 'POST' }),
}

// Estado que ve el usuario. "Overdue" no existe en PayPal: es una factura
// enviada cuya fecha de vencimiento ya pasó.
export function displayStatus(inv: Invoice): { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' } {
  const today = new Date().toISOString().slice(0, 10)
  switch (inv.status) {
    case 'DRAFT':
      return { label: 'Draft', tone: 'neutral' }
    case 'SENT':
    case 'UNPAID':
      return inv.dueDate && inv.dueDate < today ? { label: 'Overdue', tone: 'danger' } : { label: 'Sent', tone: 'info' }
    case 'SCHEDULED':
      return { label: 'Scheduled', tone: 'info' }
    case 'PAYMENT_PENDING':
      return { label: 'Payment pending', tone: 'warning' }
    case 'PARTIALLY_PAID':
      return { label: 'Partially paid', tone: 'warning' }
    case 'PAID':
    case 'MARKED_AS_PAID':
      return { label: 'Paid', tone: 'success' }
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'neutral' }
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
    case 'MARKED_AS_REFUNDED':
      return { label: 'Refunded', tone: 'warning' }
    default:
      return { label: inv.status, tone: 'neutral' }
  }
}

// Acciones que PayPal permite en cada estado.
export function availableActions(status: string): InvoiceAction[] {
  switch (status) {
    case 'DRAFT':
      return ['send', 'delete']
    case 'SENT':
    case 'UNPAID':
    case 'PARTIALLY_PAID':
      return ['remind', 'cancel']
    case 'CANCELLED':
      return ['delete']
    default:
      return []
  }
}
