// Facturama es el PAC: la empresa autorizada por el SAT que sella (timbra)
// las facturas fiscales (CFDI). Solo sandbox, igual que PayPal: los CFDI de
// prueba no tienen validez fiscal. Si faltan las credenciales, la app sigue
// funcionando y solo se desactiva el timbrado.
//
// La cuenta sandbox ya tiene cargados el perfil fiscal, el lugar de expedición
// y los sellos (CSD) de prueba del RFC EKU9003173C9. Ver docs/proyecto.md.
import { env } from './config/env.js';

const BASE_URL = 'https://apisandbox.facturama.mx';
const TIMEOUT_MS = 20_000;

export class FacturamaError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FacturamaError';
    this.status = status;
  }
}

export function isFacturamaConfigured(): boolean {
  return Boolean(env.FACTURAMA_USER && env.FACTURAMA_PASSWORD);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isFacturamaConfigured()) {
    throw new FacturamaError('Tax invoices are not set up (missing FACTURAMA_USER / FACTURAMA_PASSWORD)', 503);
  }
  const auth = Buffer.from(`${env.FACTURAMA_USER}:${env.FACTURAMA_PASSWORD}`).toString('base64');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    // Facturama explica el problema en Message (en español), a veces con
    // detalles por campo en ModelState.
    const fields = Object.values((body?.ModelState ?? {}) as Record<string, string[]>).flat();
    const message = [body?.Message, ...fields].filter(Boolean).join(' ');
    throw new FacturamaError(message || `Facturama request failed (${res.status})`, res.status);
  }
  return body as T;
}

// Cuerpo de POST /3/cfdis (API Web, CFDI 4.0). El emisor sale del perfil de la cuenta.
export interface CfdiRequest {
  Currency: string;
  ExpeditionPlace: string;
  CfdiType: 'I'; // ingreso
  PaymentForm: string; // c_FormaPago
  PaymentMethod: 'PUE'; // pago en una sola exhibición
  Receiver: { Rfc: string; Name: string; CfdiUse: string; FiscalRegime: string; TaxZipCode: string };
  Items: {
    ProductCode: string;
    Description: string;
    UnitCode: string;
    Unit: string;
    UnitPrice: number;
    Quantity: number;
    Subtotal: number;
    TaxObject: string;
    Taxes: { Total: number; Name: string; Base: number; Rate: number; IsRetention: boolean }[];
    Total: number;
  }[];
}

export interface IssuedCfdi {
  id: string; // ID de Facturama, para descargar o reenviar
  uuid: string; // folio fiscal del SAT
  folio: string;
  total: number;
}

export async function createCfdi(cfdi: CfdiRequest): Promise<IssuedCfdi> {
  const created = await request<{ Id: string; Folio: string; Total: number; Complement?: { TaxStamp?: { Uuid?: string } } }>(
    '/3/cfdis',
    { method: 'POST', body: JSON.stringify(cfdi) },
  );
  return { id: created.Id, uuid: created.Complement?.TaxStamp?.Uuid ?? '', folio: created.Folio, total: created.Total };
}

// El ID viene de Facturama; se valida antes de ponerlo en la ruta.
const CFDI_ID = /^[A-Za-z0-9_-]{10,40}$/;

export async function getCfdiFile(id: string, format: 'pdf' | 'xml'): Promise<Buffer> {
  if (!CFDI_ID.test(id)) throw new FacturamaError('Invalid CFDI id', 400);
  const file = await request<{ Content: string }>(`/cfdi/${format}/issued/${id}`);
  return Buffer.from(file.Content, 'base64');
}

// Facturama le manda al cliente el PDF y el XML por correo.
export async function emailCfdi(id: string, email: string): Promise<void> {
  if (!CFDI_ID.test(id)) throw new FacturamaError('Invalid CFDI id', 400);
  const params = new URLSearchParams({ cfdiType: 'issued', cfdiId: id, email });
  await request(`/Cfdi?${params}`, { method: 'POST' });
}
