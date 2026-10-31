// Facturas fiscales de México (CFDI).
// - Nivel 1: el cliente llena sus datos fiscales con un link, o el usuario se
//   los dicta al copiloto.
// - Nivel 2: con esos datos, cuando la factura de PayPal ya está pagada, se
//   emite el CFDI con Facturama (sandbox) y se le manda por correo al cliente.
//   Siempre lo aprueba el usuario (botón o tarjeta del copiloto).
//
// Se guarda en server/data/tax-info.json:
// - requests: un link por factura de PayPal.
// - clients: los últimos datos de cada cliente (por correo), para no volver a
//   pedirlos en su siguiente factura.
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { env, publicUrl } from './config/env.js';
import { publish } from './events.js';
import { type CfdiRequest, createCfdi, emailCfdi, isFacturamaConfigured } from './facturama.js';
import {
  type InvoiceSummary,
  type Money,
  type NewInvoice,
  createDraftInvoice,
  getInvoice,
  getInvoiceWithItems,
} from './paypal/invoices.js';
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
  cfdi?: IssuedTaxInvoice;
}

export interface IssuedTaxInvoice {
  id: string; // ID de Facturama
  uuid: string; // folio fiscal del SAT
  folio: string;
  total: Money;
  issuedAt: string;
  emailedTo: string | null; // null si el correo falló
}

interface TaxData {
  requests: TaxRequest[];
  clients: Record<string, TaxInfo>; // por correo del cliente en PayPal
}

const MAX_REQUESTS = 500; // se olvidan los más viejos

export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{24}$/, 'Invalid link');

export class TaxRequestNotFoundError extends Error {}
// No se puede emitir (factura sin pagar, sin datos, ya emitida...). El mensaje es para el usuario.
export class CfdiNotReadyError extends Error {}

// Links que siguen "esperando" aunque ya tenemos los datos de ese cliente (por
// ejemplo, el cliente llenó el link de otra factura): se completan con lo
// guardado. Así un cliente nunca tiene que dar sus datos dos veces.
function fillFromKnownClients(data: TaxData): { data: TaxData; completed: TaxRequest[] } {
  const completed: TaxRequest[] = [];
  const now = new Date().toISOString();
  const requests = data.requests.map((r) => {
    const known = r.customerEmail ? data.clients[r.customerEmail] : undefined;
    if (r.status !== 'waiting' || !known) return r;
    const updated: TaxRequest = { ...r, status: 'received', receivedAt: now, source: 'saved', taxInfo: known };
    completed.push(updated);
    return updated;
  });
  return { data: { ...data, requests }, completed };
}

// Al cargar también se corrigen los links que se quedaron "esperando" antes de este arreglo.
const store = jsonStore<TaxData>(
  'tax-info.json',
  (raw) => fillFromKnownClients((raw as TaxData | undefined) ?? { requests: [], clients: {} }).data,
);

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

// Correos de clientes cuyos datos fiscales ya tenemos (la guía lo usa para
// saber que no hay que volver a pedirlos).
export async function listKnownClients(): Promise<string[]> {
  return Object.keys((await store.load()).clients);
}

// Un solo link por factura: si ya existe, se devuelve el mismo. Si ya tenemos
// los datos de este cliente, el link nace como "recibido" (se pueden corregir).
export async function getOrCreateTaxRequest(invoiceId: string): Promise<TaxRequest> {
  const existing = (await store.load()).requests.find((r) => r.invoiceId === invoiceId);
  return existing ?? saveNewTaxRequest(await getInvoice(invoiceId), newToken());
}

const newToken = () => randomBytes(18).toString('base64url');

export const taxLinkUrl = (token: string) => `${publicUrl}/factura/${token}`;

// Si ya tenemos los datos de este cliente, el link nace como "recibido" (se
// pueden corregir desde el mismo link).
async function saveNewTaxRequest(inv: InvoiceSummary, token: string): Promise<TaxRequest> {
  const data = await store.load();
  const customerEmail = emailKey(inv.customer.email);
  const known = customerEmail ? data.clients[customerEmail] : undefined;
  const now = new Date().toISOString();
  const request: TaxRequest = {
    token,
    invoiceId: inv.id,
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

// Crea el borrador en PayPal con el link de datos fiscales en la nota. Así le
// llega al cliente dentro del correo de PayPal, que ya conoce, y no en un
// mensaje suelto. El link se crea antes porque va dentro de la factura.
export async function createInvoiceWithTaxLink(input: NewInvoice): Promise<InvoiceSummary> {
  const token = newToken();
  const line = `¿Necesitas factura (CFDI)? Deja tus datos fiscales aquí: ${taxLinkUrl(token)}`;
  const invoice = await createDraftInvoice({ ...input, note: input.note ? `${input.note}\n\n${line}` : line });
  await saveNewTaxRequest(invoice, token);
  return invoice;
}

// Lo que ve quien abre el link: sin los datos fiscales ya guardados.
export async function getPublicTaxRequest(token: string) {
  const request = (await store.load()).requests.find((r) => r.token === token);
  if (!request) throw new TaxRequestNotFoundError('This link does not exist or has expired');
  return {
    // Quién pide los datos, para que el cliente confíe.
    issuer: env.BUSINESS_NAME ?? null,
    invoiceNumber: request.invoiceNumber,
    amount: request.amount,
    status: request.status,
    cfdi: request.cfdi ? { folio: request.cfdi.folio, uuid: request.cfdi.uuid } : null,
  };
}

export async function submitTaxInfo(token: string, input: unknown): Promise<TaxRequest> {
  const taxInfo = taxInfoSchema.parse(input);
  const data = await store.load();
  const request = data.requests.find((r) => r.token === token);
  if (!request) throw new TaxRequestNotFoundError('This link does not exist or has expired');

  const updated: TaxRequest = { ...request, status: 'received', receivedAt: new Date().toISOString(), source: 'client', taxInfo };
  const key = request.customerEmail ?? taxInfo.email;
  // Las otras facturas de este cliente que esperaban sus datos también quedan listas.
  const { data: next, completed } = fillFromKnownClients({
    requests: data.requests.map((r) => (r.token === token ? updated : r)),
    clients: { ...data.clients, [key]: taxInfo },
  });
  await store.save(next);
  [updated, ...completed].forEach(notify);
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

// Reglas fiscales de la demo. Pendientes de revisar con la asesoría de finanzas:
// - El precio cobrado en PayPal ya incluye IVA del 16%.
// - Sin retenciones (aplican, por ejemplo, cuando una persona física le
//   factura servicios a una empresa).
// - Una clave de producto genérica de servicios profesionales.
const IVA_RATE = 0.16;
const PRODUCT_CODE = '80101500'; // Servicios de consultoría de negocios y administración corporativa
const UNIT_CODE = 'E48'; // Unidad de servicio
const PAYMENT_FORM = '31'; // Intermediario pagos: el cliente pagó por PayPal
const PAID_STATUSES = new Set(['PAID', 'MARKED_AS_PAID']);

const round = (n: number, decimals = 2) => Number(n.toFixed(decimals));

export interface CfdiPreview {
  request: TaxRequest & { taxInfo: TaxInfo };
  cfdi: CfdiRequest;
  subtotal: number;
  iva: number;
  total: Money;
}

// Revisa que se pueda emitir y arma el CFDI, sin emitir nada. La usan el
// botón de la pantalla y la tarjeta del copiloto.
export async function prepareCfdi(invoiceId: string): Promise<CfdiPreview> {
  if (!isFacturamaConfigured()) throw new CfdiNotReadyError('Tax invoices are not set up on this server yet.');
  const request = (await store.load()).requests.find((r) => r.invoiceId === invoiceId);
  if (request?.cfdi) throw new CfdiNotReadyError(`The CFDI for invoice #${request.invoiceNumber} was already issued (folio ${request.cfdi.folio}).`);
  if (!request?.taxInfo) throw new CfdiNotReadyError("We don't have the client's tax info yet. Send them the Tax info link first.");

  const { invoice, items } = await getInvoiceWithItems(invoiceId);
  if (!PAID_STATUSES.has(invoice.status)) throw new CfdiNotReadyError(`Invoice #${invoice.number} isn't paid yet. The CFDI is issued once it's paid.`);
  const currency = invoice.amount?.currency_code ?? items[0]?.unitAmount.currency_code;
  // Un CFDI en dólares necesita el tipo de cambio del día: queda para después.
  if (currency !== 'MXN') throw new CfdiNotReadyError('For now, CFDIs can only be issued for invoices in MXN.');
  if (items.length === 0) throw new CfdiNotReadyError(`Invoice #${invoice.number} has no items.`);

  const lines = items.map((item) => {
    const gross = round(Number(item.unitAmount.value) * item.quantity);
    const subtotal = round(gross / (1 + IVA_RATE));
    const iva = round(gross - subtotal);
    return {
      ProductCode: PRODUCT_CODE,
      Description: item.name,
      UnitCode: UNIT_CODE,
      Unit: 'Servicio',
      UnitPrice: round(subtotal / item.quantity, 6),
      Quantity: item.quantity,
      Subtotal: subtotal,
      TaxObject: '02', // sí objeto de impuesto
      Taxes: [{ Total: iva, Name: 'IVA', Base: subtotal, Rate: IVA_RATE, IsRetention: false }],
      Total: round(subtotal + iva),
    };
  });
  const info = request.taxInfo;
  const subtotal = round(lines.reduce((sum, l) => sum + l.Subtotal, 0));
  const iva = round(lines.reduce((sum, l) => sum + (l.Taxes[0]?.Total ?? 0), 0));
  return {
    request: { ...request, taxInfo: info },
    cfdi: {
      Currency: 'MXN',
      ExpeditionPlace: env.FACTURAMA_EXPEDITION_PLACE,
      CfdiType: 'I',
      PaymentForm: PAYMENT_FORM,
      PaymentMethod: 'PUE',
      // El SAT compara el nombre con el que tiene registrado, en mayúsculas.
      Receiver: { Rfc: info.rfc, Name: info.name.toUpperCase(), CfdiUse: info.use, FiscalRegime: info.regime, TaxZipCode: info.zip },
      Items: lines,
    },
    subtotal,
    iva,
    total: { currency_code: 'MXN', value: round(subtotal + iva).toFixed(2) },
  };
}

// Facturas que se están emitiendo ahora: evita dos CFDI por un doble clic.
const issuing = new Set<string>();

export async function issueCfdi(invoiceId: string): Promise<TaxRequest> {
  if (issuing.has(invoiceId)) throw new CfdiNotReadyError('This CFDI is already being issued.');
  issuing.add(invoiceId);
  try {
    const preview = await prepareCfdi(invoiceId);
    const created = await createCfdi(preview.cfdi);
    const email = preview.request.taxInfo.email;
    // Si el correo falla, el CFDI ya existe: se guarda igual y se puede reenviar.
    const emailedTo = await emailCfdi(created.id, email).then(
      () => email,
      (err: unknown) => {
        console.error('[cfdi] No se pudo enviar el correo:', err instanceof Error ? err.message : err);
        return null;
      },
    );
    const cfdi: IssuedTaxInvoice = {
      id: created.id,
      uuid: created.uuid,
      folio: created.folio,
      total: { currency_code: 'MXN', value: created.total.toFixed(2) },
      issuedAt: new Date().toISOString(),
      emailedTo,
    };
    const data = await store.load();
    const updated: TaxRequest = { ...preview.request, cfdi };
    await store.save({ ...data, requests: data.requests.map((r) => (r.invoiceId === invoiceId ? updated : r)) });
    publish({ type: 'tax.updated', paypalEvent: 'CFDI.ISSUED', invoiceId, invoiceNumber: updated.invoiceNumber ?? undefined });
    return updated;
  } finally {
    issuing.delete(invoiceId);
  }
}

export async function findTaxRequest(invoiceId: string): Promise<TaxRequest | undefined> {
  return (await store.load()).requests.find((r) => r.invoiceId === invoiceId);
}

export async function findTaxRequestByToken(token: string): Promise<TaxRequest | undefined> {
  return (await store.load()).requests.find((r) => r.token === token);
}

