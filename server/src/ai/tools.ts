// Herramientas que Claude puede usar en el chat.
// - Lectura (list_invoices, get_invoice, get_savings, get_tax_info_link): se
//   ejecutan al momento. get_tax_info_link puede crear el link, pero eso no
//   cambia nada en PayPal ni le avisa al cliente.
// - Acciones (create_invoice, send_invoice, send_reminder, cancel_invoice,
//   update_savings_plan, review_payment, review_payments, save_tax_info, issue_cfdi):
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
import { decidePayment, decidePayments, findPendingPayment, getSavings, savePlan, savingsPlanSchema } from '../savings.js';
import {
  CFDI_USES,
  TAX_REGIMES,
  createInvoiceWithTaxLink,
  describeTaxInfo,
  getOrCreateTaxRequest,
  issueCfdi,
  prepareCfdi,
  saveClientTaxInfo,
  taxInfoSchema,
  taxLinkUrl,
} from '../taxInfo.js';

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
        cfdi_link: {
          type: 'boolean',
          description:
            "Add to the invoice note a link where the client can request a Mexican tax invoice (CFDI). Use true for MXN invoices unless the user says the client doesn't need one.",
        },
      },
      required: ['customer_name', 'customer_email', 'company', 'items', 'currency', 'terms', 'note', 'send_now', 'cfdi_link'],
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
  {
    name: 'get_savings',
    description:
      "Get the user's savings for this month: their plan (percent per set-aside, e.g. taxes), what they collected via PayPal, payments still waiting for a set-aside decision, how much they set aside and what is left to spend. Set-asides are virtual: no money moves.",
    strict: true,
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'review_payment',
    description:
      'Propose answering a pending payment from get_savings: set_aside applies the current plan to it, skip sets nothing aside this time. Requires user approval.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        payment_id: { type: 'string', description: 'Payment id from get_savings pending list' },
        decision: { type: 'string', enum: ['set_aside', 'skip'] },
      },
      required: ['payment_id', 'decision'],
      additionalProperties: false,
    },
  },
  {
    name: 'review_payments',
    description:
      'Propose answering several pending payments from get_savings in ONE card that looks like a receipt, with a checkbox per payment. Check (set_aside true) the ones you recommend setting aside with the current plan and leave the rest unchecked, each with a short reason (max 8 words). The user can change the checkboxes before approving: checked payments get the plan applied, unchecked ones are skipped this time. Prefer this over several review_payment calls when 2 or more payments are pending. Requires user approval.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        payments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              payment_id: { type: 'string', description: 'Payment id from get_savings pending list' },
              set_aside: { type: 'boolean', description: 'Whether the checkbox starts checked' },
              reason: { type: 'string', description: 'Short reason shown to the user, e.g. "Big payment, keep taxes safe"' },
            },
            required: ['payment_id', 'set_aside', 'reason'],
            additionalProperties: false,
          },
        },
      },
      required: ['payments'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_savings_plan',
    description:
      'Propose replacing the whole savings plan (max 6 set-asides, percentages add up to 100 or less). Include every set-aside to keep, not only the changed one. It applies to payments answered from now on. Requires user approval.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        buckets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Short name, e.g. Taxes' },
              percent: { type: 'number', description: 'Percent of each payment collected, 0 to 100' },
            },
            required: ['name', 'percent'],
            additionalProperties: false,
          },
        },
      },
      required: ['buckets'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_tax_info_link',
    description:
      "Mexican tax invoices (CFDI): get the link where the client of an invoice fills in their tax info (RFC, legal name, tax regime, ZIP code, CFDI use), and whether they already did. Creates the link the first time; it does not notify the client, the user shares it. Also says whether the CFDI was already issued.",
    strict: true,
    input_schema: invoiceIdInput,
  },
  {
    name: 'save_tax_info',
    description:
      "Propose saving a client's Mexican tax info (for CFDI) that the user gave you in the chat. It is reused for that client's future invoices and completes their pending links. Never guess any field: ask for what is missing. Requires user approval.",
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        customer_email: { type: 'string', description: "The client's email as it appears on their PayPal invoices" },
        rfc: { type: 'string', description: 'RFC, 12 characters (company) or 13 (person)' },
        legal_name: { type: 'string', description: 'Razón social exactly as in their Constancia de Situación Fiscal, without "S.A. de C.V."' },
        tax_regime: { type: 'string', enum: Object.keys(TAX_REGIMES), description: 'SAT régimen fiscal code' },
        zip_code: { type: 'string', description: '5-digit ZIP code of their tax address' },
        cfdi_use: { type: 'string', enum: Object.keys(CFDI_USES), description: 'Uso de CFDI; G03 (general expenses) is the usual one for services' },
        invoice_email: { type: 'string', description: 'Email where the client wants to receive the CFDI' },
      },
      required: ['customer_email', 'rfc', 'legal_name', 'tax_regime', 'zip_code', 'cfdi_use', 'invoice_email'],
      additionalProperties: false,
    },
  },
  {
    name: 'issue_cfdi',
    description:
      "Propose issuing the Mexican tax invoice (CFDI) for a PAID invoice in MXN whose client already sent their tax info, and emailing it to the client. The price charged in PayPal is treated as including 16% VAT. Test environment: the CFDI has no legal validity. Requires user approval.",
    strict: true,
    input_schema: invoiceIdInput,
  },
];

const ACTION_TOOLS = new Set([
  'create_invoice',
  'send_invoice',
  'send_reminder',
  'cancel_invoice',
  'update_savings_plan',
  'review_payment',
  'review_payments',
  'save_tax_info',
  'issue_cfdi',
]);

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
  if (name === 'get_savings') {
    const s = await getSavings();
    const fmt = (list: { value: string; currency_code: string }[]) => list.map((m) => money(m.value, m.currency_code));
    return JSON.stringify({
      month: s.month,
      plan: s.plan.map((b) => ({ name: b.name, percent: b.percent })),
      collected: s.paid ? fmt(s.paid) : 'unavailable (PayPal did not return payments)',
      pending_payments: s.pending.map((p) => ({
        payment_id: p.id,
        date: p.date,
        invoice_number: p.invoiceNumber,
        amount: money(p.amount.value, p.amount.currency_code),
        would_set_aside: p.proposal.map((a) => `${a.name}: ${money(a.amount.value, a.amount.currency_code)}`),
      })),
      set_aside_this_month: s.buckets.map((b) => ({ name: b.name, amount: fmt(b.amounts) })),
      left_to_spend: fmt(s.available),
    });
  }
  if (name === 'get_tax_info_link') {
    const id = invoiceIdSchema.parse((input as { invoice_id: string }).invoice_id);
    const request = await getOrCreateTaxRequest(id);
    return JSON.stringify({
      invoice_number: request.invoiceNumber,
      link: taxLinkUrl(request.token),
      status: request.status === 'received' ? 'tax info received' : 'waiting for the client',
      tax_info: request.taxInfo ?? null,
      cfdi: request.cfdi
        ? { folio: request.cfdi.folio, uuid: request.cfdi.uuid, emailed_to: request.cfdi.emailedTo }
        : 'not issued yet',
    });
  }
  throw new Error(`Unknown tool ${name}`);
}

// Un renglón con casilla en una tarjeta tipo ticket (review_payments).
export interface ActionChoice {
  id: string;
  label: string; // "#0013 · Juan Hernán"
  detail: string; // fecha y la razón que da la IA
  amount: string;
  setAside: { name: string; value: string; currency: string }[];
  checked: boolean;
}

// Propuesta lista para mostrarse en una tarjeta y ejecutarse al aprobarla.
// Si trae choices, execute recibe los ids que el usuario dejó palomeados.
export interface PreparedAction {
  title: string;
  details: [string, string][];
  choices?: ActionChoice[];
  execute: (selected?: string[]) => Promise<string>;
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
      cfdi_link: boolean;
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
        ...(raw.cfdi_link ? [['CFDI', 'Link for the client to request one'] as [string, string]] : []),
      ],
      execute: async () => {
        const draft = await (raw.cfdi_link ? createInvoiceWithTaxLink(inv) : createDraftInvoice(inv));
        if (!raw.send_now) return `Draft invoice #${draft.number} created (id ${draft.id}). Not sent yet.`;
        const sent = await sendInvoice(draft.id);
        return `Invoice #${sent.number} created and emailed to ${sent.customer.email} (id ${sent.id}, status ${sent.status}).`;
      },
    };
  }

  if (name === 'update_savings_plan') {
    const parsed = savingsPlanSchema.safeParse((input as { buckets: unknown }).buckets);
    if (!parsed.success) throw new Error(`Invalid savings plan: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    const buckets = parsed.data;
    const total = buckets.reduce((sum, b) => sum + b.percent, 0);
    return {
      title: 'Update savings plan',
      details: [
        ...buckets.map((b): [string, string] => [b.name, `${b.percent}%`]),
        ['Left to spend', `${100 - total}%`],
      ],
      execute: async () => {
        const saved = await savePlan(buckets);
        return `Savings plan updated: ${saved.map((b) => `${b.name} ${b.percent}%`).join(', ')}.`;
      },
    };
  }

  if (name === 'review_payment') {
    const { payment_id, decision } = input as { payment_id: string; decision: 'set_aside' | 'skip' };
    const payment = await findPendingPayment(payment_id);
    const setAside = decision === 'set_aside';
    const amount = money(payment.amount.value, payment.amount.currency_code);
    const allocations = payment.proposal.map((a) => `${a.name} ${money(a.amount.value, a.amount.currency_code)}`);
    return {
      title: setAside ? 'Set aside from this payment' : 'Skip set-asides for this payment',
      details: [
        ['Payment', `${amount} · ${payment.date}`],
        ...(payment.invoiceNumber ? [['Invoice', `#${payment.invoiceNumber}`] as [string, string]] : []),
        ...(setAside
          ? payment.proposal.map((a): [string, string] => [a.name, money(a.amount.value, a.amount.currency_code)])
          : [['Set aside', 'Nothing this time'] as [string, string]]),
      ],
      execute: async () => {
        await decidePayment(payment_id, setAside);
        return setAside
          ? `Set aside from the ${amount} payment: ${allocations.join(', ')}.`
          : `Nothing set aside from the ${amount} payment.`;
      },
    };
  }

  if (name === 'review_payments') {
    const { payments } = input as { payments: { payment_id: string; set_aside: boolean; reason: string }[] };
    if (!payments.length) throw new Error('No payments given. Call get_savings to see the pending ones.');
    // Las facturas solo sirven para mostrar el nombre del cliente; si fallan, se omite.
    const [summary, invoices] = await Promise.all([getSavings(), allInvoices().catch(() => [])]);
    const byNumber = new Map(invoices.map((inv) => [inv.number, inv]));
    const seen = new Set<string>();
    const choices = payments.map((p): ActionChoice => {
      const payment = summary.pending.find((x) => x.id === p.payment_id);
      if (!payment) throw new Error(`Payment ${p.payment_id} is not waiting for a decision. Call get_savings again.`);
      if (seen.has(payment.id)) throw new Error(`Payment ${payment.id} is listed twice.`);
      seen.add(payment.id);
      const inv = payment.invoiceNumber ? byNumber.get(payment.invoiceNumber) : undefined;
      const client = inv && (inv.customer.company ?? inv.customer.name ?? inv.customer.email);
      return {
        id: payment.id,
        label: [payment.invoiceNumber ? `#${payment.invoiceNumber}` : 'Payment', client].filter(Boolean).join(' · '),
        detail: [payment.date, p.reason.trim().slice(0, 80)].filter(Boolean).join(' · '),
        amount: money(payment.amount.value, payment.amount.currency_code),
        setAside: payment.proposal.map((a) => ({ name: a.name, value: a.amount.value, currency: a.amount.currency_code })),
        checked: p.set_aside,
      };
    });
    return {
      title: 'Set aside from your payments',
      details: [],
      choices,
      execute: async (selected = choices.filter((c) => c.checked).map((c) => c.id)) => {
        const chosen = new Set(selected);
        await decidePayments(choices.map((c) => ({ paymentId: c.id, accept: chosen.has(c.id) })));
        const kept = choices.filter((c) => chosen.has(c.id)).map((c) => c.label);
        const skipped = choices.filter((c) => !chosen.has(c.id)).map((c) => c.label);
        return `Set aside from ${kept.length} payment(s): ${kept.join(', ') || 'none'}. Skipped ${skipped.length}: ${skipped.join(', ') || 'none'}. (The user may have changed your selection.)`;
      },
    };
  }

  if (name === 'save_tax_info') {
    const raw = input as {
      customer_email: string;
      rfc: string;
      legal_name: string;
      tax_regime: string;
      zip_code: string;
      cfdi_use: string;
      invoice_email: string;
    };
    const parsed = taxInfoSchema.safeParse({
      rfc: raw.rfc,
      name: raw.legal_name,
      regime: raw.tax_regime,
      zip: raw.zip_code,
      use: raw.cfdi_use,
      email: raw.invoice_email,
    });
    if (!parsed.success) throw new Error(`Invalid tax info: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    return {
      title: 'Save client tax info (CFDI)',
      details: [['Client', raw.customer_email], ...describeTaxInfo(parsed.data)],
      execute: async () => {
        const completed = await saveClientTaxInfo(raw.customer_email, parsed.data);
        return `Tax info saved for ${raw.customer_email}${completed ? `; ${completed} pending link(s) completed` : ''}.`;
      },
    };
  }

  if (name === 'issue_cfdi') {
    const id = invoiceIdSchema.parse((input as { invoice_id: string }).invoice_id);
    const preview = await prepareCfdi(id);
    const info = preview.request.taxInfo;
    return {
      title: 'Issue tax invoice (CFDI)',
      details: [
        ['Invoice', `#${preview.request.invoiceNumber ?? '—'}`],
        ['Client', `${info.name} · ${info.rfc}`],
        ['Subtotal', money(preview.subtotal, 'MXN')],
        ['VAT 16%', money(preview.iva, 'MXN')],
        ['Total', money(preview.total.value, 'MXN')],
        ['Email to', info.email],
      ],
      execute: async () => {
        const issued = await issueCfdi(id);
        const cfdi = issued.cfdi!;
        return `CFDI issued for invoice #${issued.invoiceNumber} (folio ${cfdi.folio}, UUID ${cfdi.uuid}). ${
          cfdi.emailedTo ? `Emailed to ${cfdi.emailedTo}.` : 'The email could not be sent.'
        } Test environment: no legal validity.`;
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
