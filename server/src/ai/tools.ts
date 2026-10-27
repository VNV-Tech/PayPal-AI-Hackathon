// Herramientas que Claude puede usar en el chat.
// - Lectura (list_invoices, get_invoice): se ejecutan al momento.
// - Acciones (create_invoice, send_invoice, send_reminder, cancel_invoice):
//   NUNCA se ejecutan directo. Se convierten en una propuesta que el usuario
//   aprueba o rechaza desde una tarjeta en el chat.
import type Anthropic from '@anthropic-ai/sdk';
import {
  CURRENCIES,
  type InvoiceSummary,
  PAYMENT_TERMS,
  cancelInvoice,
  createDraftInvoice,
  getInvoice,
  invoiceIdSchema,
  listInvoices,
  newInvoiceSchema,
  remindInvoice,
  sendInvoice,
} from '../paypal/invoices.js';

const invoiceIdInput = {
  type: 'object',
  properties: { invoice_id: { type: 'string', description: 'PayPal invoice id, e.g. INV2-ABCD-EFGH-IJKL-MNOP' } },
  required: ['invoice_id'],
  additionalProperties: false,
} as const;

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'list_invoices',
    description:
      "List the user's PayPal invoices with status, client, amount and due date. Use it to answer who owes money, find an invoice id, or check totals.",
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ALL', 'DRAFT', 'SENT', 'OVERDUE', 'PAID', 'CANCELLED'],
          description: 'Filter. SENT means sent and not paid yet (includes overdue).',
        },
      },
      required: ['status'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_invoice',
    description: 'Get one invoice by id.',
    strict: true,
    input_schema: invoiceIdInput,
  },
  {
    name: 'create_invoice',
    description:
      'Propose a new PayPal invoice. The user must approve it in the app before it is created. If send_now is true, it is also emailed to the client after approval; otherwise it stays as a draft.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: "Client's contact name" },
        customer_email: { type: 'string', description: "Client's email. Never guess it: ask if unknown." },
        company: { type: 'string', description: 'Client company name, or empty string if none' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'integer' },
              unit_price: { type: 'number', description: 'Price per unit, e.g. 1500.50' },
            },
            required: ['description', 'quantity', 'unit_price'],
            additionalProperties: false,
          },
        },
        currency: { type: 'string', enum: [...CURRENCIES] },
        terms: { type: 'string', enum: [...PAYMENT_TERMS] },
        note: { type: 'string', description: 'Note to the client, or empty string' },
        send_now: { type: 'boolean', description: 'Email it to the client right after approval' },
      },
      required: ['customer_name', 'customer_email', 'company', 'items', 'currency', 'terms', 'note', 'send_now'],
      additionalProperties: false,
    },
  },
  {
    name: 'send_invoice',
    description: 'Propose emailing a DRAFT invoice to the client. Requires user approval.',
    strict: true,
    input_schema: invoiceIdInput,
  },
  {
    name: 'send_reminder',
    description: 'Propose sending a payment reminder for a SENT/unpaid invoice. Requires user approval.',
    strict: true,
    input_schema: invoiceIdInput,
  },
  {
    name: 'cancel_invoice',
    description: 'Propose cancelling a SENT/unpaid invoice. The client is notified. Requires user approval.',
    strict: true,
    input_schema: invoiceIdInput,
  },
];

const ACTION_TOOLS = new Set(['create_invoice', 'send_invoice', 'send_reminder', 'cancel_invoice']);

export function isActionTool(name: string): boolean {
  return ACTION_TOOLS.has(name);
}

// Lo que se le pasa a Claude: sin URLs ni campos que no necesita.
function forModel(inv: InvoiceSummary) {
  const today = new Date().toISOString().slice(0, 10);
  const unpaid = ['SENT', 'UNPAID', 'PARTIALLY_PAID'].includes(inv.status);
  return {
    id: inv.id,
    number: inv.number,
    status: inv.status,
    overdue: unpaid && !!inv.dueDate && inv.dueDate < today,
    client: inv.customer,
    amount: inv.amount ? `${inv.amount.value} ${inv.amount.currency_code}` : null,
    amount_due: inv.dueAmount ? `${inv.dueAmount.value} ${inv.dueAmount.currency_code}` : null,
    invoice_date: inv.invoiceDate,
    due_date: inv.dueDate,
  };
}

// Hasta 5 páginas (100 facturas): suficiente para la demo.
async function allInvoices(): Promise<InvoiceSummary[]> {
  const first = await listInvoices(1);
  const rest = [];
  for (let p = 2; p <= Math.min(first.totalPages, 5); p++) rest.push(listInvoices(p));
  return [first, ...(await Promise.all(rest))].flatMap((page) => page.invoices);
}

export async function runReadTool(name: string, input: unknown): Promise<string> {
  if (name === 'list_invoices') {
    const { status } = input as { status: string };
    const rows = (await allInvoices()).map(forModel).filter((inv) => {
      if (status === 'ALL') return true;
      if (status === 'OVERDUE') return inv.overdue;
      if (status === 'SENT') return ['SENT', 'UNPAID', 'PARTIALLY_PAID'].includes(inv.status);
      if (status === 'PAID') return ['PAID', 'MARKED_AS_PAID'].includes(inv.status);
      return inv.status === status;
    });
    return JSON.stringify({ today: new Date().toISOString().slice(0, 10), count: rows.length, invoices: rows });
  }
  if (name === 'get_invoice') {
    const id = invoiceIdSchema.parse((input as { invoice_id: string }).invoice_id);
    return JSON.stringify(forModel(await getInvoice(id)));
  }
  throw new Error(`Unknown tool ${name}`);
}

// Propuesta lista para mostrarse en una tarjeta y ejecutarse al aprobarla.
export interface PreparedAction {
  title: string;
  details: [string, string][];
  execute: () => Promise<string>;
}

const TERMS_LABEL: Record<string, string> = {
  DUE_ON_RECEIPT: 'Due on receipt',
  NET_10: 'Net 10',
  NET_15: 'Net 15',
  NET_30: 'Net 30',
  NET_45: 'Net 45',
  NET_60: 'Net 60',
};

const money = (value: number | string, currency: string) =>
  `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} ${currency}`;

// "Ana López (Estudio Luna) · ana@example.com"
function clientLabel(c: { name?: string | null; company?: string | null; email?: string | null }) {
  const who = c.name && c.company ? `${c.name} (${c.company})` : (c.name ?? c.company);
  return [who, c.email].filter(Boolean).join(' · ');
}

// Valida la propuesta y lee lo necesario para la tarjeta, sin cambiar nada en
// PayPal. Lanza Error con un mensaje para Claude si la acción no es posible.
export async function prepareAction(name: string, input: unknown): Promise<PreparedAction> {
  if (name === 'create_invoice') {
    const raw = input as {
      customer_name: string;
      customer_email: string;
      company: string;
      items: { description: string; quantity: number; unit_price: number }[];
      currency: string;
      terms: string;
      note: string;
      send_now: boolean;
    };
    const parsed = newInvoiceSchema.safeParse({
      customer: { name: raw.customer_name, email: raw.customer_email, ...(raw.company?.trim() ? { company: raw.company } : {}) },
      items: raw.items.map((i) => ({ name: i.description, quantity: i.quantity, unitAmount: i.unit_price })),
      currency: raw.currency,
      terms: raw.terms,
      ...(raw.note?.trim() ? { note: raw.note } : {}),
    });
    if (!parsed.success) {
      throw new Error(`Invalid invoice: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    }
    const inv = parsed.data;
    const total = inv.items.reduce((sum, i) => sum + i.quantity * i.unitAmount, 0);
    return {
      title: raw.send_now ? 'Create and send invoice' : 'Create draft invoice',
      details: [
        ['Client', clientLabel(inv.customer)],
        ...inv.items.map((i): [string, string] => [
          'Item',
          `${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ''} — ${money(i.quantity * i.unitAmount, inv.currency)}`,
        ]),
        ['Total', money(total, inv.currency)],
        ['Due', TERMS_LABEL[inv.terms] ?? inv.terms],
        ...(inv.note ? [['Note', inv.note] as [string, string]] : []),
      ],
      execute: async () => {
        const draft = await createDraftInvoice(inv);
        if (!raw.send_now) return `Draft invoice #${draft.number} created (id ${draft.id}). Not sent yet.`;
        const sent = await sendInvoice(draft.id);
        return `Invoice #${sent.number} created and emailed to ${sent.customer.email} (id ${sent.id}, status ${sent.status}).`;
      },
    };
  }

  const id = invoiceIdSchema.parse((input as { invoice_id: string }).invoice_id);
  const inv = await getInvoice(id);
  const details: [string, string][] = [
    ['Invoice', `#${inv.number ?? '—'}`],
    ['Client', clientLabel(inv.customer)],
    ['Amount', inv.amount ? money(inv.amount.value, inv.amount.currency_code) : '—'],
    ['Due date', inv.dueDate ?? '—'],
  ];
  const unpaid = ['SENT', 'UNPAID', 'PARTIALLY_PAID'].includes(inv.status);

  if (name === 'send_invoice') {
    if (inv.status !== 'DRAFT') throw new Error(`Invoice #${inv.number} is ${inv.status}; only drafts can be sent.`);
    return {
      title: 'Send invoice',
      details,
      execute: async () => {
        const sent = await sendInvoice(id);
        return `Invoice #${sent.number} emailed to ${sent.customer.email}.`;
      },
    };
  }
  if (name === 'send_reminder') {
    if (!unpaid) throw new Error(`Invoice #${inv.number} is ${inv.status}; reminders are only for sent, unpaid invoices.`);
    return {
      title: 'Send payment reminder',
      details,
      execute: async () => {
        await remindInvoice(id);
        return `Reminder sent for invoice #${inv.number}.`;
      },
    };
  }
  if (name === 'cancel_invoice') {
    if (!unpaid) throw new Error(`Invoice #${inv.number} is ${inv.status}; only sent, unpaid invoices can be cancelled.`);
    return {
      title: 'Cancel invoice',
      details,
      execute: async () => {
        await cancelInvoice(id);
        return `Invoice #${inv.number} cancelled; the client was notified.`;
      },
    };
  }
  throw new Error(`Unknown tool ${name}`);
}
