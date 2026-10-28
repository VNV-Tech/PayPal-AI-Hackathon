// Números de la pantalla de inicio: cuánto te deben, cuánto cobraste este mes
// y cuántas facturas están vencidas. También da la lista de pagos del mes que
// usa el modo personal (savings.ts).
import { type InvoicePayment, type InvoiceSummary, type Money, getInvoicePayments, listInvoices } from './invoices.js';
import { type ReceivedPayment, listPaymentsReceived } from './transactions.js';

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
const WITH_PAYMENTS = new Set(['PAID', 'PARTIALLY_PAID']);
const MAX_PAGES = 10; // 200 facturas; de sobra para la demo
// Facturas pagadas (las más recientes) cuyos pagos se revisan una por una.
const MAX_PAID_INVOICES = 25;

// Los pagos de una factura PAID ya no cambian: se guardan para no volver a
// pedirlos cada vez que se recarga la pantalla.
const paidInvoicePayments = new Map<string, InvoicePayment[]>();

async function listAllInvoices(): Promise<InvoiceSummary[]> {
  const first = await listInvoices(1);
  const all = [...first.invoices];
  for (let page = 2; page <= Math.min(first.totalPages, MAX_PAGES); page++) {
    all.push(...(await listInvoices(page)).invoices);
  }
  return all;
}

async function paymentsOf(inv: InvoiceSummary): Promise<InvoicePayment[]> {
  const cached = paidInvoicePayments.get(inv.id);
  if (cached) return cached;
  const payments = await getInvoicePayments(inv.id);
  if (inv.status === 'PAID') paidInvoicePayments.set(inv.id, payments);
  return payments;
}

// Pagos de facturas, para cubrir las horas en que Transaction Search todavía
// no muestra un pago nuevo. Si una factura falla, se sigue con las demás.
async function invoicePaymentsSince(invoices: InvoiceSummary[], sinceDate: string): Promise<InvoicePayment[]> {
  const paid = invoices.filter((inv) => WITH_PAYMENTS.has(inv.status)).slice(0, MAX_PAID_INVOICES);
  const results = await Promise.allSettled(paid.map(paymentsOf));
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).filter((p) => p.date >= sinceDate);
}

export function sumByCurrency(amounts: Money[]): Money[] {
  const cents = new Map<string, number>();
  for (const m of amounts) {
    cents.set(m.currency_code, (cents.get(m.currency_code) ?? 0) + Math.round(Number(m.value) * 100));
  }
  return [...cents].map(([currency_code, c]) => ({ currency_code, value: (c / 100).toFixed(2) }));
}

// Facturas y pagos del mes. payments es null si Transaction Search falló.
async function loadMonth(now: Date): Promise<{ invoices: InvoiceSummary[]; payments: ReceivedPayment[] | null }> {
  // El mes se cuenta en UTC, igual que las fechas que devuelve PayPal.
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [invoices, searched] = await Promise.allSettled([listAllInvoices(), listPaymentsReceived(monthStart, now)]);
  // Sin facturas no hay pantalla: ese error sí se propaga.
  if (invoices.status === 'rejected') throw invoices.reason;
  if (searched.status === 'rejected') {
    console.error('[overview] No se pudieron leer los pagos del mes:', searched.reason);
    return { invoices: invoices.value, payments: null };
  }

  // Mismo ID en ambas fuentes: un pago que ya aparece en la búsqueda no se suma dos veces.
  const byId = new Map(searched.value.map((p) => [p.id, p]));
  for (const p of await invoicePaymentsSince(invoices.value, monthStart.toISOString().slice(0, 10))) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  // Los más recientes primero (mismo día: el número de factura más alto).
  const payments = [...byId.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.invoiceNumber ?? '').localeCompare(a.invoiceNumber ?? ''),
  );
  return { invoices: invoices.value, payments };
}

export async function getPaymentsThisMonth(now = new Date()): Promise<ReceivedPayment[] | null> {
  return (await loadMonth(now)).payments;
}

export async function getOverview(now = new Date()): Promise<Overview> {
  const { invoices, payments } = await loadMonth(now);
  const today = now.toISOString().slice(0, 10);
  const unpaid = invoices.filter((inv) => UNPAID_STATUSES.has(inv.status));
  return {
    outstanding: sumByCurrency(unpaid.flatMap((inv) => inv.dueAmount ?? inv.amount ?? [])),
    outstandingCount: unpaid.length,
    overdueCount: invoices.filter(
      (inv) => OVERDUE_STATUSES.has(inv.status) && inv.dueDate !== null && inv.dueDate < today,
    ).length,
    paidThisMonth: payments ? { totals: sumByCurrency(payments.map((p) => p.amount)), count: payments.length } : null,
  };
}
