// Cliente mínimo de la API REST de PayPal con caché de access token.
// Los tokens de PayPal duran varias horas (campo expires_in); se renuevan
// automáticamente un poco antes de caducar.
import { env } from '../config/env.js';

const BASE_URLS = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
} as const;

// Renovar 5 minutos antes de la expiración real para evitar carreras.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

export const PAYPAL_BASE_URL = BASE_URLS[env.PAYPAL_ENV];

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

// fetch autenticado. Si PayPal responde 401 (token revocado o caducado antes
// de tiempo), fuerza una renovación y reintenta una vez.
export async function paypalFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const token = await getAccessToken({ forceRefresh: retried });
  const res = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (res.status === 401 && !retried) {
    return paypalFetch(path, init, true);
  }
  return res;
}
