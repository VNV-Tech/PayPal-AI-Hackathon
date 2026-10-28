// Números de la pantalla de inicio: cuánto te deben, cuánto cobraste este mes
// y cuántas facturas están vencidas.
import { type InvoicePayment, type InvoiceSummary, type Money, getInvoicePayments, listInvoices } from './invoices.js';
import { listPaymentsReceived } from './transactions.js';

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

  const [invoices, searched] = await Promise.allSettled([listAllInvoices(), listPaymentsReceived(monthStart, now)]);
  // Sin facturas no hay pantalla: ese error sí se propaga.
  if (invoices.status === 'rejected') throw invoices.reason;
  if (searched.status === 'rejected') {
    console.error('[overview] No se pudieron leer los pagos del mes:', searched.reason);
  }

  let paidThisMonth: Overview['paidThisMonth'] = null;
  if (searched.status === 'fulfilled') {
    // Mismo ID en ambas fuentes: un pago que ya aparece en la búsqueda no se suma dos veces.
    const byId = new Map(searched.value.map((p) => [p.id, p.amount]));
    for (const p of await invoicePaymentsSince(invoices.value, monthStart.toISOString().slice(0, 10))) {
      if (!byId.has(p.id)) byId.set(p.id, p.amount);
    }
    paidThisMonth = { totals: sumByCurrency([...byId.values()]), count: byId.size };
  }

  const unpaid = invoices.value.filter((inv) => UNPAID_STATUSES.has(inv.status));
  return {
    outstanding: sumByCurrency(unpaid.flatMap((inv) => inv.dueAmount ?? inv.amount ?? [])),
    outstandingCount: unpaid.length,
    overdueCount: invoices.value.filter(
      (inv) => OVERDUE_STATUSES.has(inv.status) && inv.dueDate !== null && inv.dueDate < today,
    ).length,
    paidThisMonth,
  };
}
