// Tipo de cambio de dólares a pesos, para los CFDI en USD (el SAT lo exige).
// Con BANXICO_TOKEN se usa el oficial de Banxico; sin él, o si Banxico falla,
// una referencia del Banco Central Europeo: alcanza para la demo, que es de
// prueba, y la tarjeta siempre dice de dónde salió.
import { z } from 'zod';
import { env } from './config/env.js';

// Serie de Banxico: "FIX para solventar obligaciones", la que se publica en el DOF.
const BANXICO_URL = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF60653/datos/oportuno';
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

async function fromBanxico(token: string): Promise<ExchangeRate> {
  const datos = banxicoSchema.parse(await fetchJson(BANXICO_URL, { 'Bmx-Token': token })).bmx.series[0]!.datos;
  const { fecha, dato } = datos[datos.length - 1]!;
  const rate = Number(dato);
  // Banxico manda "N/E" cuando no hay dato.
  if (!(rate > 0)) throw new Error(`invalid rate "${dato}"`);
  return { rate, date: fecha, source: 'Banxico' };
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
