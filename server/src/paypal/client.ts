// Cliente mínimo de la API REST de PayPal con caché de access token.
// Los tokens de PayPal duran varias horas (campo expires_in); se renuevan
// automáticamente un poco antes de caducar.
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';


// Renovar 5 minutos antes de la expiración real para evitar carreras.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 10_000;

// Solo Sandbox: la URL de live no existe en el código a propósito.
export const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com';

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly debugId?: string,
  ) {
    super(message);
    this.name = 'PayPalError';
  }
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;
let inflightRequest: Promise<string> | null = null; // evita pedir varios tokens en paralelo

async function requestNewToken(): Promise<string> {
  const credentials = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new PayPalError(`PayPal OAuth falló (${res.status})`, res.status, res.headers.get('paypal-debug-id') ?? undefined);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - REFRESH_MARGIN_MS,
  };
  return cachedToken.value;
}

export async function getAccessToken({ forceRefresh = false } = {}): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  inflightRequest ??= requestNewToken().finally(() => {
    inflightRequest = null;
  });
  return inflightRequest;
}

export function getTokenStatus() {
  if (!cachedToken) return { cached: false as const };
  return {
    cached: true as const,
    expiresInSeconds: Math.max(0, Math.round((cachedToken.expiresAt - Date.now()) / 1000)),
  };
}

// fetch autenticado con reintentos:
// - 401 (token revocado o caducado antes de tiempo): renueva el token y reintenta una vez.
// - 429 (límite de peticiones) y 5xx: reintenta con espera creciente (0.5 s, 1 s, 2 s).
// Los POST llevan un PayPal-Request-Id que se repite en cada reintento, para que
// PayPal no duplique la operación (por ejemplo, crear dos veces la misma factura).
export async function paypalFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const requestId = method === 'POST' ? randomUUID() : undefined;
  let tokenRefreshed = false;
  let forceRefresh = false;
  let attempt = 0;

  for (;;) {
    const token = await getAccessToken({ forceRefresh });
    forceRefresh = false;
    const res = await fetch(`${PAYPAL_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 401 && !tokenRefreshed) {
      tokenRefreshed = forceRefresh = true;
      await res.body?.cancel();
      continue;
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_RETRIES) {
      return res;
    }
    await res.body?.cancel();
    await sleep(retryDelayMs(res, attempt));
    attempt++;
  }
}

function retryDelayMs(res: Response, attempt: number): number {
  // Si PayPal indica cuánto esperar (Retry-After en segundos), se respeta.
  const retryAfter = Number(res.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS);
  }
  return BASE_RETRY_DELAY_MS * 2 ** attempt;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
