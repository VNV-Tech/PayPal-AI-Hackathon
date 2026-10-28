// Datos fiscales para facturar en México (CFDI). Nivel 1: el cliente llena sus
// datos con un link, o el usuario se los dicta al copiloto. Todavía no se
// timbra la factura: eso será el nivel 2, con Facturama (sandbox).
//
// Se guarda en server/data/tax-info.json:
// - requests: un link por factura de PayPal.
// - clients: los últimos datos de cada cliente (por correo), para no volver a
//   pedirlos en su siguiente factura.
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { publish } from './events.js';
import { type Money, getInvoice } from './paypal/invoices.js';
import { jsonStore } from './store.js';

// Catálogo c_RegimenFiscal del SAT (CFDI 4.0).
export const TAX_REGIMES = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606': 'Arrendamiento',
  '607': 'Régimen de Enajenación o Adquisición de Bienes',
  '608': 'Demás ingresos',
  '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611': 'Ingresos por Dividendos (socios y accionistas)',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por intereses',
  '615': 'Régimen de los ingresos por obtención de premios',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625': 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626': 'Régimen Simplificado de Confianza',
} as const;

// Usos de CFDI más comunes para servicios de un freelancer (catálogo c_UsoCFDI).
export const CFDI_USES = {
  G01: 'Adquisición de mercancías',
  G03: 'Gastos en general',
  I02: 'Mobiliario y equipo de oficina por inversiones',
  I04: 'Equipo de cómputo y accesorios',
  I08: 'Otra maquinaria y equipo',
  S01: 'Sin efectos fiscales',
} as const;

type Regime = keyof typeof TAX_REGIMES;
type CfdiUse = keyof typeof CFDI_USES;

// RFC: 3 letras (empresa) o 4 (persona), fecha AAMMDD y homoclave de 3.
const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

export const taxInfoSchema = z.object({
  rfc: z.string().trim().toUpperCase().regex(RFC_PATTERN, 'RFC inválido'),
  // Razón social tal como aparece en la Constancia de Situación Fiscal.
  name: z.string().trim().min(1).max(254),
  regime: z.enum(Object.keys(TAX_REGIMES) as [Regime, ...Regime[]]),
  zip: z.string().trim().regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),
  use: z.enum(Object.keys(CFDI_USES) as [CfdiUse, ...CfdiUse[]]),
  email: z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254)),
});

export type TaxInfo = z.infer<typeof taxInfoSchema>;

export interface TaxRequest {
  token: string; // va en el link; difícil de adivinar
  invoiceId: string;
  invoiceNumber: string | null;
  customerEmail: string | null;
  amount: Money | null;
  createdAt: string;
  status: 'waiting' | 'received';
  receivedAt?: string;
  // client: lo llenó el cliente con el link. user: el usuario, desde el chat.
  // saved: ya teníamos los datos de este cliente de una factura anterior.
  source?: 'client' | 'user' | 'saved';
  taxInfo?: TaxInfo;
}

interface TaxData {
  requests: TaxRequest[];
  clients: Record<string, TaxInfo>; // por correo del cliente en PayPal
}

const MAX_REQUESTS = 500; // se olvidan los más viejos

export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{24}$/, 'Invalid link');

export class TaxRequestNotFoundError extends Error {}

const store = jsonStore<TaxData>('tax-info.json', (raw) => (raw as TaxData | undefined) ?? { requests: [], clients: {} });

const emailKey = (email: string | null | undefined) => email?.trim().toLowerCase() || null;

function notify(request: TaxRequest) {
  publish({
    type: 'tax.updated',
    paypalEvent: 'TAX_INFO.RECEIVED',
    invoiceId: request.invoiceId,
    invoiceNumber: request.invoiceNumber ?? undefined,
  });
}

export async function listTaxRequests(): Promise<TaxRequest[]> {
  return (await store.load()).requests;
}

// Un solo link por factura: si ya existe, se devuelve el mismo. Si ya tenemos
// los datos de este cliente, el link nace como "recibido" (se pueden corregir).
export async function getOrCreateTaxRequest(invoiceId: string): Promise<TaxRequest> {
  const data = await store.load();
  const existing = data.requests.find((r) => r.invoiceId === invoiceId);
  if (existing) return existing;

  const inv = await getInvoice(invoiceId);
  const customerEmail = emailKey(inv.customer.email);
  const known = customerEmail ? data.clients[customerEmail] : undefined;
  const now = new Date().toISOString();
  const request: TaxRequest = {
    token: randomBytes(18).toString('base64url'),
    invoiceId,
    invoiceNumber: inv.number,
    customerEmail,
    amount: inv.amount,
    createdAt: now,
    ...(known
      ? { status: 'received', receivedAt: now, source: 'saved', taxInfo: known }
      : { status: 'waiting' }),
  };
  await store.save({ ...data, requests: [request, ...data.requests].slice(0, MAX_REQUESTS) });
  return request;
}

// Lo que ve quien abre el link: sin los datos fiscales ya guardados.
export async function getPublicTaxRequest(token: string) {
  const request = (await store.load()).requests.find((r) => r.token === token);
  if (!request) throw new TaxRequestNotFoundError('This link does not exist or has expired');
  return { invoiceNumber: request.invoiceNumber, amount: request.amount, status: request.status };
}

export async function submitTaxInfo(token: string, input: unknown): Promise<TaxRequest> {
  const taxInfo = taxInfoSchema.parse(input);
  const data = await store.load();
  const request = data.requests.find((r) => r.token === token);
  if (!request) throw new TaxRequestNotFoundError('This link does not exist or has expired');

  const updated: TaxRequest = { ...request, status: 'received', receivedAt: new Date().toISOString(), source: 'client', taxInfo };
  const key = request.customerEmail ?? taxInfo.email;
  await store.save({
    requests: data.requests.map((r) => (r.token === token ? updated : r)),
    clients: { ...data.clients, [key]: taxInfo },
  });
  notify(updated);
  return updated;
}

// Desde el chat: el usuario dicta los datos de un cliente. Se guardan para sus
// facturas futuras y completan los links que estaban esperando.
export async function saveClientTaxInfo(customerEmail: string, input: unknown): Promise<number> {
  const key = emailKey(customerEmail);
  if (!key) throw new Error('Client email is required');
  const taxInfo = taxInfoSchema.parse(input);
  const data = await store.load();
  const now = new Date().toISOString();
  const completed: TaxRequest[] = [];
  const requests = data.requests.map((r) => {
    if (r.customerEmail !== key || r.status !== 'waiting') return r;
    const updated: TaxRequest = { ...r, status: 'received', receivedAt: now, source: 'user', taxInfo };
    completed.push(updated);
    return updated;
  });
  await store.save({ requests, clients: { ...data.clients, [key]: taxInfo } });
  completed.forEach(notify);
  return completed.length;
}

export function describeTaxInfo(info: TaxInfo): [string, string][] {
  return [
    ['RFC', info.rfc],
    ['Legal name', info.name],
    ['Tax regime', `${info.regime} · ${TAX_REGIMES[info.regime]}`],
    ['ZIP code', info.zip],
    ['CFDI use', `${info.use} · ${CFDI_USES[info.use]}`],
    ['Email', info.email],
  ];
}
