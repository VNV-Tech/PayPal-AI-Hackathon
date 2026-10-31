// Modo personal: apartados de ahorro virtuales. Cada vez que llega un pago,
// la app pregunta si apartar un porcentaje para cada apartado (por ejemplo,
// impuestos). Solo cuenta lo que el usuario acepta. No se mueve dinero en
// PayPal: es una cuenta para saber cuánto de lo cobrado no es para gastar.
//
// El plan y las decisiones se guardan en server/data/savings.json. En Render
// el disco se borra al redesplegar; aceptable para la demo hasta que haya base
// de datos.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Money } from './paypal/invoices.js';
import { getPaymentsThisMonth, sumByCurrency } from './paypal/overview.js';
import type { ReceivedPayment } from './paypal/transactions.js';
import { jsonStore } from './store.js';

const MAX_DECISIONS = 1000; // se olvidan las más viejas

export const savingsPlanSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(64).optional(),
      name: z.string().trim().min(1).max(40),
      percent: z.number().min(0).max(100),
    }),
  )
  .max(6)
  .refine((buckets) => buckets.reduce((sum, b) => sum + b.percent, 0) <= 100, {
    message: 'The percentages add up to more than 100%',
  });

export interface SavingsBucket {
  id: string;
  name: string;
  percent: number;
}

interface Allocation {
  bucketId: string;
  name: string; // se guarda por si el apartado se borra después
  percent: number;
  amount: Money;
}

interface Decision {
  status: 'accepted' | 'declined';
  decidedAt: string;
  allocations: Allocation[]; // vacío si se rechazó
}

interface SavingsData {
  plan: SavingsBucket[];
  decisions: Record<string, Decision>; // por ID de pago
}

// Valores de ejemplo para la demo. Los porcentajes reales dependen del régimen
// fiscal de cada persona: pendiente de revisar con alguien de finanzas.
const DEFAULT_PLAN: SavingsBucket[] = [
  { id: 'taxes', name: 'Taxes', percent: 20 },
  { id: 'emergency', name: 'Emergency fund', percent: 10 },
];

export class PaymentNotFoundError extends Error {}

const store = jsonStore<SavingsData>('savings.json', (raw) => {
  // No existe todavía (o está dañado): se empieza con los valores de ejemplo.
  if (!raw) return { plan: DEFAULT_PLAN, decisions: {} };
  // La primera versión guardaba solo el plan (un arreglo).
  return Array.isArray(raw) ? { plan: raw, decisions: {} } : (raw as SavingsData);
});
const load = store.load;
const persist = store.save;

// Cambiar el plan solo afecta a los pagos que se respondan después; lo ya
// apartado se queda como estaba.
export async function savePlan(input: z.input<typeof savingsPlanSchema>): Promise<SavingsBucket[]> {
  const current = await load();
  // Sin id (por ejemplo, desde el chat) se reusa el del apartado con el mismo
  // nombre, para que lo ya apartado siga sumando en el mismo lugar.
  const sameName = (name: string) => current.plan.find((b) => b.name.toLowerCase() === name.toLowerCase())?.id;
  const plan = savingsPlanSchema.parse(input).map((b) => ({ ...b, id: b.id ?? sameName(b.name) ?? randomUUID() }));
  await persist({ ...current, plan });
  return plan;
}

const toCents = (m: Money) => Math.round(Number(m.value) * 100);
const fromCents = (currency_code: string, cents: number): Money => ({ currency_code, value: (cents / 100).toFixed(2) });

// Lo que se propone apartar de un pago con el plan actual.
function proposeAllocations(plan: SavingsBucket[], amount: Money): Allocation[] {
  return plan.map((b) => ({
    bucketId: b.id,
    name: b.name,
    percent: b.percent,
    amount: fromCents(amount.currency_code, Math.round((toCents(amount) * b.percent) / 100)),
  }));
}

export interface PaymentReview {
  id: string;
  date: string;
  invoiceNumber: string | null;
  amount: Money;
  proposal: Allocation[];
}

export interface SavingsSummary {
  month: string; // AAAA-MM (UTC, igual que "Paid this month")
  plan: SavingsBucket[];
  // null si PayPal no devolvió los pagos del mes.
  paid: Money[] | null;
  // Pagos del mes que todavía no tienen respuesta.
  pending: PaymentReview[];
  // Lo apartado este mes (solo pagos aceptados), por apartado.
  buckets: { id: string; name: string; percent: number | null; amounts: Money[] }[];
  available: Money[]; // lo cobrado menos lo apartado
}

function summarize(month: string, d: SavingsData, payments: ReceivedPayment[] | null): SavingsSummary {
  const list = payments ?? [];
  const accepted = list.flatMap((p) => {
    const decision = d.decisions[p.id];
    return decision?.status === 'accepted' ? decision.allocations : [];
  });

  // Primero los apartados del plan actual; luego los que se borraron pero
  // todavía tienen dinero apartado este mes.
  const buckets = new Map<string, SavingsSummary['buckets'][number]>(
    d.plan.map((b) => [b.id, { id: b.id, name: b.name, percent: b.percent, amounts: [] }]),
  );
  for (const a of accepted) {
    const bucket = buckets.get(a.bucketId) ?? { id: a.bucketId, name: a.name, percent: null, amounts: [] };
    bucket.amounts.push(a.amount);
    buckets.set(a.bucketId, bucket);
  }

  const paid = sumByCurrency(list.map((p) => p.amount));
  const setAside = sumByCurrency(accepted.map((a) => a.amount));
  return {
    month,
    plan: d.plan,
    paid: payments ? paid : null,
    pending: list
      .filter((p) => !d.decisions[p.id])
      .map((p) => ({ ...p, proposal: proposeAllocations(d.plan, p.amount) })),
    buckets: [...buckets.values()].map((b) => ({ ...b, amounts: sumByCurrency(b.amounts) })),
    available: paid.map((m) => {
      const aside = setAside.find((s) => s.currency_code === m.currency_code);
      return fromCents(m.currency_code, toCents(m) - (aside ? toCents(aside) : 0));
    }),
  };
}

export async function getSavings(now = new Date()): Promise<SavingsSummary> {
  const [d, payments] = await Promise.all([load(), getPaymentsThisMonth(now)]);
  return summarize(now.toISOString().slice(0, 7), d, payments);
}

// Lo que el usuario respondió de cada pago (por ID), para el historial del copiloto.
export async function paymentDecisions(): Promise<Record<string, Decision>> {
  return (await load()).decisions;
}

// Busca un pago del mes que todavía no tenga respuesta.
export async function findPendingPayment(paymentId: string): Promise<PaymentReview> {
  const summary = await getSavings();
  const payment = summary.pending.find((p) => p.id === paymentId);
  if (!payment) throw new PaymentNotFoundError('That payment is not waiting for a decision.');
  return payment;
}

// Acepta (aparta según el plan actual) o rechaza un pago. Si ya tenía
// respuesta, no hace nada: un doble clic no aparta dos veces.
export async function decidePayment(paymentId: string, accept: boolean): Promise<SavingsSummary> {
  const d = await load();
  if (!d.decisions[paymentId]) {
    const payment = await findPendingPayment(paymentId);
    const decisions = {
      ...d.decisions,
      [paymentId]: {
        status: accept ? 'accepted' : 'declined',
        decidedAt: new Date().toISOString(),
        allocations: accept ? proposeAllocations(d.plan, payment.amount) : [],
      } satisfies Decision,
    };
    // Tope de decisiones guardadas: se quitan las más viejas.
    const ids = Object.keys(decisions);
    for (const old of ids.slice(0, Math.max(0, ids.length - MAX_DECISIONS))) delete decisions[old];
    await persist({ ...(await load()), decisions });
  }
  return getSavings();
}

// Varias respuestas de un jalón (la tarjeta tipo ticket del copiloto): una
// sola consulta a PayPal y una sola escritura. Los pagos que ya tenían
// respuesta o que ya no están pendientes se saltan.
export async function decidePayments(answers: { paymentId: string; accept: boolean }[]): Promise<void> {
  const summary = await getSavings();
  const d = await load();
  const decisions = { ...d.decisions };
  for (const { paymentId, accept } of answers) {
    const payment = summary.pending.find((p) => p.id === paymentId);
    if (decisions[paymentId] || !payment) continue;
    decisions[paymentId] = {
      status: accept ? 'accepted' : 'declined',
      decidedAt: new Date().toISOString(),
      allocations: accept ? proposeAllocations(d.plan, payment.amount) : [],
    } satisfies Decision;
  }
  const ids = Object.keys(decisions);
  for (const old of ids.slice(0, Math.max(0, ids.length - MAX_DECISIONS))) delete decisions[old];
  await persist({ ...(await load()), decisions });
}
