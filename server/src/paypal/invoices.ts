// Facturas con la API de PayPal Invoicing v2 (Sandbox).
// El SDK oficial de PayPal para servidor no cubre Invoicing, por eso se usa
// la API REST con paypalFetch.
// Docs: https://developer.paypal.com/docs/api/invoicing/v2/
import { z } from 'zod';
import { PayPalError, paypalFetch } from './client.js';

export const PAYMENT_TERMS = ['DUE_ON_RECEIPT', 'NET_10', 'NET_15', 'NET_30', 'NET_45', 'NET_60'] as const;
export const CURRENCIES = ['MXN', 'USD'] as const;

// Validación compartida por la ruta POST /api/invoices y por el copiloto.
export const newInvoiceSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(140),
    email: z.email().max(254),
    company: z.string().trim().max(120).optional(),
  }),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        quantity: z.number().int().positive().max(9999),
        unitAmount: z.number().positive().max(1_000_000),
      }),
    )
    .min(1)
    .max(20),
  currency: z.enum(CURRENCIES).default('MXN'),
  terms: z.enum(PAYMENT_TERMS).default('NET_15'),
  note: z.string().trim().max(1000).optional(),
});

export type NewInvoice = z.infer<typeof newInvoiceSchema>;

// Los IDs de PayPal tienen la forma INV2-XXXX-XXXX-XXXX-XXXX. Validarlos evita
// que un ID manipulado altere la ruta de la petición a PayPal.
export const invoiceIdSchema = z.string().regex(/^INV2(-[A-Z0-9]{4}){4}$/, 'Invalid invoice id');

interface Money {
  currency_code: string;
  value: string;
}

// Solo los campos que usa la app; PayPal devuelve muchos más.
interface PayPalInvoice {
  id: string;
  status: string;
  detail: {
    invoice_number?: string;
    invoice_date?: string;
    currency_code: string;
    note?: string;
    payment_term?: { term_type?: string; due_date?: string };
    metadata?: { create_time?: string };
  };
  primary_recipients?: {
    billing_info?: {
      email_address?: string;
      business_name?: string;
      name?: { given_name?: string; surname?: string; full_name?: string };
    };
  }[];
  items?: { name: string; quantity: string; unit_amount: Money }[];
  amount?: Money;
  due_amount?: Money;
}

// Forma simplificada que recibe el cliente (y más adelante la IA).
export interface InvoiceSummary {
  id: string;
  number: string | null;
  status: string;
  customer: { name: string | null; email: string | null; company: string | null };
  amount: Money | null;
  dueAmount: Money | null;
  invoiceDate: string | null;
  dueDate: string | null;
  createdAt: string | null;
  payerViewUrl: string;
}

export interface InvoicePage {
  invoices: InvoiceSummary[];
  totalItems: number;
  totalPages: number;
}

const PAGE_SIZE = 20;
// Las acciones de envío, recordatorio y cancelación notifican solo al cliente.
const NOTIFY_RECIPIENT = JSON.stringify({ send_to_recipient: true, send_to_invoicer: false });

// La factura completa trae un desglose dentro de amount; el listado no.
function pickMoney(m?: Money): Money | null {
  return m ? { currency_code: m.currency_code, value: m.value } : null;
}

function toSummary(inv: PayPalInvoice): InvoiceSummary {
  const billing = inv.primary_recipients?.[0]?.billing_info;
  const name = billing?.name;
  return {
    id: inv.id,
    number: inv.detail.invoice_number ?? null,
    status: inv.status,
    customer: {
      name: name?.full_name ?? ([name?.given_name, name?.surname].filter(Boolean).join(' ') || null),
      email: billing?.email_address ?? null,
      company: billing?.business_name ?? null,
    },
    amount: pickMoney(inv.amount),
    dueAmount: pickMoney(inv.due_amount),
    invoiceDate: inv.detail.invoice_date ?? null,
    dueDate: inv.detail.payment_term?.due_date ?? null,
    createdAt: inv.detail.metadata?.create_time ?? null,
    // El listado de PayPal no incluye la URL de pago; tiene este formato fijo
    // (es la misma que devuelve /send como "payer-view").
    payerViewUrl: `https://www.sandbox.paypal.com/invoice/p/#${inv.id}`,
  };
}

// Lanza PayPalError con las descripciones de PayPal (por ejemplo, "Only
// invoices in draft... can be deleted") para mostrarlas en la UI.
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await paypalFetch(path, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    // PayPal respondió algo que no es JSON (por ejemplo, una página de error
    // 502). Sin esto se perdería el debug_id que viene en los headers.
    body = undefined;
  }
  if (!res.ok) {
    const details: string[] = (body?.details ?? [])
      .map((d: { description?: string; issue?: string }) => d.description ?? d.issue)
      .filter(Boolean);
    throw new PayPalError(
      `PayPal ${init.method ?? 'GET'} ${path.split('?')[0]} falló (${res.status})`,
      res.status,
      body?.debug_id ?? res.headers.get('paypal-debug-id') ?? undefined,
      details,
    );
  }
  return body as T;
}

function splitName(fullName: string) {
  const [given, ...rest] = fullName.trim().split(/\s+/);
  return rest.length ? { given_name: given, surname: rest.join(' ') } : { given_name: given };
}

export async function listInvoices(page = 1): Promise<InvoicePage> {
  const data = await call<{ items?: PayPalInvoice[]; total_items?: number; total_pages?: number }>(
    `/v2/invoicing/invoices?page=${page}&page_size=${PAGE_SIZE}&total_required=true`,
  );
  return {
    invoices: (data.items ?? []).map(toSummary),
    totalItems: data.total_items ?? 0,
    totalPages: data.total_pages ?? 0,
  };
}

export async function getInvoice(id: string): Promise<InvoiceSummary> {
  return toSummary(await call<PayPalInvoice>(`/v2/invoicing/invoices/${id}`));
}

// Crea la factura como borrador: no se le envía nada al cliente hasta que el
// usuario la confirme con sendInvoice.
export async function createDraftInvoice(input: NewInvoice): Promise<InvoiceSummary> {
  const money = (value: number): Money => ({ currency_code: input.currency, value: value.toFixed(2) });
  const created = await call<PayPalInvoice>('/v2/invoicing/invoices', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      detail: {
        currency_code: input.currency,
        payment_term: { term_type: input.terms },
        ...(input.note ? { note: input.note } : {}),
      },
      primary_recipients: [
        {
          billing_info: {
            name: splitName(input.customer.name),
            email_address: input.customer.email,
            ...(input.customer.company ? { business_name: input.customer.company } : {}),
          },
        },
      ],
      items: input.items.map((item) => ({
        name: item.name,
        quantity: String(item.quantity),
        unit_amount: money(item.unitAmount),
        unit_of_measure: 'QUANTITY',
      })),
    }),
  });
  return toSummary(created);
}

export async function sendInvoice(id: string): Promise<InvoiceSummary> {
  await call(`/v2/invoicing/invoices/${id}/send`, { method: 'POST', body: NOTIFY_RECIPIENT });
  return getInvoice(id);
}

export async function remindInvoice(id: string): Promise<InvoiceSummary> {
  await call(`/v2/invoicing/invoices/${id}/remind`, { method: 'POST', body: NOTIFY_RECIPIENT });
  return getInvoice(id);
}

export async function cancelInvoice(id: string): Promise<InvoiceSummary> {
  await call(`/v2/invoicing/invoices/${id}/cancel`, { method: 'POST', body: NOTIFY_RECIPIENT });
  return getInvoice(id);
}

// PayPal solo permite borrar borradores, programadas o canceladas.
export async function deleteInvoice(id: string): Promise<void> {
  await call(`/v2/invoicing/invoices/${id}`, { method: 'DELETE' });
}
