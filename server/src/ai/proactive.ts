// El copiloto da el primer paso: cuando pasa algo importante en la cuenta,
// prepara propuestas sin que el usuario abra el chat. Nada se ejecuta solo:
// todo llega como tarjetas para aprobar.
//
// Por ahora, un momento: cuando una factura se paga, propone emitir el CFDI
// (si ya están los datos fiscales del cliente) y apartar parte del pago.
import { publish } from '../events.js';
import { getInvoice } from '../paypal/invoices.js';
import { getSavings } from '../savings.js';
import { getOrCreateTaxRequest, taxLinkUrl } from '../taxInfo.js';
import { ChatLimitError, createSuggestion } from './copilot.js';

// PayPal puede mandar el mismo aviso más de una vez: una sugerencia por factura.
const handled = new Set<string>();

const IVA_RATE = 0.16;

// Se juntan los datos aquí para que Claude no tenga que buscarlos: responde
// más rápido, gasta menos y no se distrae con otras facturas.
export async function paidInvoiceFacts(invoiceId: string): Promise<{ title: string; event: string }> {
  const [invoice, tax, savings] = await Promise.all([getInvoice(invoiceId), getOrCreateTaxRequest(invoiceId), getSavings()]);
  const label = `#${invoice.number ?? '—'}`;
  const client = invoice.customer.company ?? invoice.customer.name ?? invoice.customer.email ?? 'the client';
  const amount = invoice.amount ? Number(invoice.amount.value) : 0;
  const currency = invoice.amount?.currency_code ?? 'MXN';
  const payment = savings.pending.find((p) => p.invoiceNumber === invoice.number);

  const facts = [
    `Invoice ${label} (id ${invoice.id}) from ${client} was just paid through PayPal: ${amount.toFixed(2)} ${currency}.`,
    currency === 'MXN'
      ? `The price includes 16% VAT: ${(amount - amount / (1 + IVA_RATE)).toFixed(2)} MXN of it is VAT.`
      : 'It is not in MXN, so no CFDI can be issued for it yet.',
    tax.cfdi
      ? `The CFDI was already issued (folio ${tax.cfdi.folio}).`
      : tax.status === 'received'
        ? `We have the client's tax info (${tax.taxInfo?.name}, RFC ${tax.taxInfo?.rfc}): the CFDI can be issued with issue_cfdi.`
        : `We don't have the client's tax info yet. Their link: ${taxLinkUrl(tax.token)}`,
    payment
      ? `The payment is waiting for a set-aside decision (payment_id ${payment.id}); the current plan would set aside ${payment.proposal
          .map((a) => `${a.amount.value} ${a.amount.currency_code} for ${a.name}`)
          .join(' and ')}.`
      : 'There is no set-aside decision pending for this payment.',
  ];
  return {
    title: `${client} paid invoice ${label}`,
    event: `${facts.join(' ')} Propose only what applies to this invoice: issue_cfdi if possible, and review_payment with set_aside if a decision is pending. If the tax info is missing, share the link instead.`,
  };
}

export function onInvoicePaid(invoiceId: string, invoiceNumber: string | undefined) {
  if (handled.has(invoiceId)) return;
  handled.add(invoiceId);

  // Sin await: el webhook le responde a PayPal de inmediato.
  void paidInvoiceFacts(invoiceId)
    .then(({ title, event }) => createSuggestion(title, event))
    .then(
      (suggestion) =>
        publish({
          type: 'copilot.suggestion',
          paypalEvent: 'COPILOT.SUGGESTION',
          invoiceId,
          invoiceNumber,
          suggestionId: suggestion.id,
        }),
      (err: unknown) => {
        // Si falla (por ejemplo, se acabó el límite diario), los avisos normales siguen funcionando.
        handled.delete(invoiceId);
        if (!(err instanceof ChatLimitError)) console.error('[copilot] No se pudo preparar la sugerencia:', err);
      },
    );
}
