// Números de la pantalla de inicio: cuánto te deben, cuánto cobraste este mes
// y cuántas facturas están vencidas.
import { type InvoiceSummary, type Money, listInvoices } from './invoices.js';
import { getPaymentsReceived } from './transactions.js';

export interface Overview {
  outstanding: Money[]; // por moneda
  outstandingCount: number;
  overdueCount: number;
  // null si la búsqueda de pagos falló; el resto de la pantalla se muestra igual.
  paidThisMonth: { totals: Money[]; count: number } | null;
}

// Mismos criterios que displayStatus en client/src/lib/invoices.ts.
const UNPAID_STATUSES = new Set(['SENT', 'UNPAID', 'PARTIALLY_PAID']);
const OVERDUE_STATUSES = new Set(['SENT', 'UNPAID']);
const MAX_PAGES = 10; // 200 facturas; de sobra para la demo

async function listAllInvoices(): Promise<InvoiceSummary[]> {
  const first = await listInvoices(1);
  const all = [...first.invoices];
  for (let page = 2; page <= Math.min(first.totalPages, MAX_PAGES); page++) {
    all.push(...(await listInvoices(page)).invoices);
  }
  return all;
}

function sumByCurrency(amounts: Money[]): Money[] {
  const cents = new Map<string, number>();
  for (const m of amounts) {
    cents.set(m.currency_code, (cents.get(m.currency_code) ?? 0) + Math.round(Number(m.value) * 100));
  }
  return [...cents].map(([currency_code, c]) => ({ currency_code, value: (c / 100).toFixed(2) }));
}

export async function getOverview(now = new Date()): Promise<Overview> {
  // El mes se cuenta en UTC, igual que las fechas que devuelve PayPal.
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const today = now.toISOString().slice(0, 10);

  const [invoices, payments] = await Promise.allSettled([listAllInvoices(), getPaymentsReceived(monthStart, now)]);
  // Sin facturas no hay pantalla: ese error sí se propaga.
  if (invoices.status === 'rejected') throw invoices.reason;
  if (payments.status === 'rejected') {
    console.error('[overview] No se pudieron leer los pagos del mes:', payments.reason);
  }

  const unpaid = invoices.value.filter((inv) => UNPAID_STATUSES.has(inv.status));
  return {
    outstanding: sumByCurrency(unpaid.flatMap((inv) => inv.dueAmount ?? inv.amount ?? [])),
    outstandingCount: unpaid.length,
    overdueCount: invoices.value.filter(
      (inv) => OVERDUE_STATUSES.has(inv.status) && inv.dueDate !== null && inv.dueDate < today,
    ).length,
    paidThisMonth: payments.status === 'fulfilled' ? payments.value : null,
  };
}
