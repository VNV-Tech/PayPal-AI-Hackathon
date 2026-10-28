// Modo personal: apartados de ahorro virtuales. De lo cobrado en el mes se
// aparta un porcentaje para cada apartado (por ejemplo, impuestos). No se mueve
// dinero en PayPal: es solo un cálculo para que el freelancer sepa cuánto de
// lo cobrado no es "dinero para gastar".
//
// El plan (apartados y porcentajes) se guarda en server/data/savings.json.
// En Render el disco se borra al redesplegar y se vuelve a los valores por
// defecto; aceptable para la demo hasta que haya base de datos.
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { Money } from './paypal/invoices.js';
import { getOverview } from './paypal/overview.js';

const PLAN_PATH = fileURLToPath(new URL('../data/savings.json', import.meta.url));

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

// Valores de ejemplo para la demo. Los porcentajes reales dependen del régimen
// fiscal de cada persona: pendiente de revisar con alguien de finanzas.
const DEFAULT_PLAN: SavingsBucket[] = [
  { id: 'taxes', name: 'Taxes', percent: 20 },
  { id: 'emergency', name: 'Emergency fund', percent: 10 },
];

let plan: SavingsBucket[] | null = null;

export async function getPlan(): Promise<SavingsBucket[]> {
  if (plan) return plan;
  try {
    plan = savingsPlanSchema.parse(JSON.parse(await readFile(PLAN_PATH, 'utf8'))) as SavingsBucket[];
  } catch {
    // No existe todavía (o está dañado): se usan los valores de ejemplo.
    plan = DEFAULT_PLAN;
  }
  return plan;
}

export async function savePlan(input: z.input<typeof savingsPlanSchema>): Promise<SavingsBucket[]> {
  const buckets = savingsPlanSchema.parse(input).map((b) => ({ ...b, id: b.id ?? randomUUID() }));
  await mkdir(dirname(PLAN_PATH), { recursive: true });
  // Se escribe en un archivo temporal y se renombra: si el servidor se apaga a
  // la mitad, el archivo anterior queda intacto.
  const tmp = `${PLAN_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(buckets, null, 2));
  await rename(tmp, PLAN_PATH);
  plan = buckets;
  return plan;
}

export interface SavingsSummary {
  month: string; // AAAA-MM (UTC, igual que "Paid this month")
  // null si PayPal no devolvió los pagos del mes.
  paid: Money[] | null;
  buckets: (SavingsBucket & { amounts: Money[] })[];
  available: Money[]; // lo que queda para gastar
}

const toCents = (m: Money) => Math.round(Number(m.value) * 100);
const fromCents = (currency_code: string, cents: number): Money => ({ currency_code, value: (cents / 100).toFixed(2) });

export async function getSavings(now = new Date()): Promise<SavingsSummary> {
  const [buckets, overview] = await Promise.all([getPlan(), getOverview(now)]);
  const paid = overview.paidThisMonth?.totals ?? null;

  const withAmounts = buckets.map((b) => ({
    ...b,
    amounts: (paid ?? []).map((m) => fromCents(m.currency_code, Math.round((toCents(m) * b.percent) / 100))),
  }));
  // Lo disponible es lo cobrado menos los apartados ya redondeados, para que
  // la suma cuadre al centavo.
  const available = (paid ?? []).map((m) => {
    const setAside = withAmounts.reduce(
      (sum, b) => sum + toCents(b.amounts.find((a) => a.currency_code === m.currency_code)!),
      0,
    );
    return fromCents(m.currency_code, toCents(m) - setAside);
  });

  return { month: now.toISOString().slice(0, 7), paid, buckets: withAmounts, available };
}
