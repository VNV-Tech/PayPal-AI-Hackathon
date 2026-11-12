// Tipo de cambio de dólares a pesos, para los CFDI en USD (el SAT lo exige).
// Con BANXICO_TOKEN se usa el oficial de Banxico; sin él, o si Banxico falla,
// una referencia del Banco Central Europeo: alcanza para la demo, que es de
// prueba, y la tarjeta siempre dice de dónde salió.
import { z } from 'zod';
import { env } from './config/env.js';

// Serie de Banxico: "FIX para solventar obligaciones", la que se publica en el DOF.
// Su fecha es la de liquidación (cuando se usa para pagar), que llega a ser dos
// días hábiles después de calcularse. Por eso no se pide el dato más nuevo
// ("oportuno"), que puede tener fecha de pasado mañana, sino los de los últimos
// días hasta hoy: así se usa el que aplica el día en que se emite el CFDI.
const BANXICO_SERIES = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF60653/datos';
const LOOKBACK_DAYS = 10; // cubre fines de semana y días festivos
const REFERENCE_URL = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN';
const TIMEOUT_MS = 8_000;
const CACHE_MS = 60 * 60 * 1000; // cambia una vez al día: una hora basta

export interface ExchangeRate {
  rate: number; // pesos por dólar
  date: string;
  source: string;
}

const banxicoSchema = z.object({
  bmx: z.object({ series: z.array(z.object({ datos: z.array(z.object({ fecha: z.string(), dato: z.string() })).min(1) })).min(1) }),
});
const referenceSchema = z.object({ date: z.string(), rates: z.object({ MXN: z.number().positive() }) });

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fecha de hoy en la Ciudad de México, como AAAA-MM-DD.
function mexicoDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
}

async function fromBanxico(token: string): Promise<ExchangeRate> {
  const now = new Date();
  const today = mexicoDate(now);
  const start = mexicoDate(new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000));
  const url = `${BANXICO_SERIES}/${start}/${today}`;
  const datos = banxicoSchema.parse(await fetchJson(url, { 'Bmx-Token': token })).bmx.series[0]!.datos;
  // El más reciente con dato válido (Banxico manda "N/E" cuando no hay dato).
  const latest = datos.filter((d) => Number(d.dato) > 0).at(-1);
  if (!latest) throw new Error('no valid rate in range');
  const { fecha, dato } = latest;
  const rate = Number(dato);
  // Banxico manda la fecha como DD/MM/AAAA; se pasa a AAAA-MM-DD, igual que la
  // referencia, para que el jurado no lea "10/11" como 11 de octubre.
  const [day, month, year] = fecha.split('/');
  const date = day && month && year ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : fecha;
  return { rate, date, source: 'Banxico' };
}

async function fromReference(): Promise<ExchangeRate> {
  const { date, rates } = referenceSchema.parse(await fetchJson(REFERENCE_URL));
  return { rate: rates.MXN, date, source: 'ECB reference' };
}

let cached: { value: ExchangeRate; at: number } | null = null;

export async function getUsdMxnRate(): Promise<ExchangeRate> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  let value: ExchangeRate | undefined;
  if (env.BANXICO_TOKEN) {
    value = await fromBanxico(env.BANXICO_TOKEN).catch((err: unknown) => {
      console.error('[exchange-rate] Banxico falló, se usa la referencia:', err instanceof Error ? err.message : err);
      return undefined;
    });
  }
  value ??= await fromReference();
  cached = { value, at: Date.now() };
  return value;
}
