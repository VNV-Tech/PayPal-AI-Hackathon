import { formatMoney } from './config'
import type { Invoice } from './invoices'
import type { Savings } from './savings'
import type { TaxRequest } from './taxInfo'
import type { TourStep } from './tour'

// Guía "Your next step": el camino de cada modo como lista de pasos que se
// palomean solos según el estado de la cuenta. Son reglas fijas, sin IA: no
// gasta créditos. Vanessa / Natalia: los textos se cambian aquí (en inglés).
//
// - done: el paso ya se hizo alguna vez (palomita en la lista).
// - todo: hay algo concreto por hacer ahora en ese paso. Aunque el camino ya
//   esté completo, la guía sigue mostrando lo pendiente ("Next up").
// - hint: qué hacer ahora, con datos reales. Solo se muestra en el paso actual.
// - showMe: a dónde lleva "Show me" y qué ilumina (un data-tour="..." de la pantalla).
export interface JourneyStep {
  id: string
  title: string
  why: string
  done: boolean
  todo?: boolean
  hint?: string
  showMe?: TourStep
}

const PAID = ['PAID', 'MARKED_AS_PAID']
const UNPAID = ['SENT', 'UNPAID', 'PARTIALLY_PAID']

const clientOf = (inv: Invoice) => inv.customer.company ?? inv.customer.name ?? inv.customer.email ?? 'your client'
const amountOf = (inv: Invoice) => (inv.amount ? formatMoney(Number(inv.amount.value), inv.amount.currency_code) : '')

// La lista llega con las más nuevas primero: find() da la más reciente.
export function businessJourney(invoices: Invoice[], taxRequests: TaxRequest[], knownClients: string[]): JourneyStep[] {
  const tax = new Map(taxRequests.map((r) => [r.invoiceId, r]))
  const known = new Set(knownClients)
  // Ya tenemos sus datos: o el cliente los mandó para esta factura, o los
  // guardamos de una anterior (al abrir Tax info se usan solos).
  const hasTaxInfo = (inv: Invoice) =>
    tax.get(inv.id)?.status === 'received' || known.has(inv.customer.email?.toLowerCase() ?? '')
  const draft = invoices.find((inv) => inv.status === 'DRAFT')
  const waiting = invoices.find((inv) => UNPAID.includes(inv.status))
  const paidMxn = invoices.filter((inv) => PAID.includes(inv.status) && inv.amount?.currency_code === 'MXN')
  const needsTaxInfo = paidMxn.find((inv) => !hasTaxInfo(inv))
  const readyForCfdi = paidMxn.find((inv) => hasTaxInfo(inv) && !tax.get(inv.id)?.cfdi)

  return [
    {
      id: 'create',
      title: 'Create an invoice',
      why: 'PayPal emails it to your client with a button to pay by PayPal or card.',
      done: invoices.length > 0,
      hint: 'Start with your first invoice. You can also ask the copilot to draft it for you.',
      showMe: {
        id: 'guide-create',
        route: '/invoices',
        target: 'invoices-new',
        title: 'Create an invoice',
        body: 'Press New invoice, add your client and what you charge. It is saved as a draft: nothing is sent yet.',
      },
    },
    {
      id: 'send',
      title: 'Send it to your client',
      why: 'Until you send it, your client can’t see it or pay it.',
      done: invoices.some((inv) => inv.status !== 'DRAFT'),
      todo: Boolean(draft),
      hint: draft ? `Draft #${draft.number} for ${clientOf(draft)} is ready. Send it so they can pay.` : undefined,
      showMe: draft && {
        id: 'guide-send',
        route: '/invoices',
        target: `send-${draft.id}`,
        title: 'Send it',
        body: `Press Send on #${draft.number}. PayPal emails ${clientOf(draft)} a link to pay.`,
      },
    },
    {
      id: 'paid',
      title: 'Get paid',
      why: 'The app updates by itself the moment your client pays, and the copilot tells you what to do next.',
      done: invoices.some((inv) => PAID.includes(inv.status)),
      hint: waiting
        ? `${clientOf(waiting)} hasn't paid #${waiting.number} (${amountOf(waiting)}) yet. A friendly reminder can help.`
        : 'Send an invoice and wait for your client to pay.',
      showMe: waiting && {
        id: 'guide-remind',
        route: '/invoices',
        target: `remind-${waiting.id}`,
        title: 'Waiting for the payment',
        body: 'You don’t have to do anything. If it takes long, press Remind and PayPal sends your client a reminder.',
      },
    },
    {
      id: 'tax-info',
      title: 'Get your client’s tax info',
      why: 'In Mexico, clients usually need an official tax invoice (CFDI). They fill in their details once; we remember them.',
      done: taxRequests.some((r) => r.status === 'received'),
      todo: Boolean(needsTaxInfo),
      hint: needsTaxInfo
        ? `${clientOf(needsTaxInfo)} paid #${needsTaxInfo.number}. Share the tax info link so they can get their CFDI.`
        : 'When a client in Mexico pays you, ask for their tax info.',
      showMe: needsTaxInfo && {
        id: 'guide-tax',
        route: '/invoices',
        target: `tax-${needsTaxInfo.id}`,
        title: 'Ask for their tax info',
        body: 'Press Tax info and copy the link for your client. New invoices already include it in the PayPal email.',
      },
    },
    {
      id: 'cfdi',
      title: 'Send their tax invoice (CFDI)',
      why: 'One click: it is stamped with the SAT (test mode) and emailed to your client.',
      done: taxRequests.some((r) => r.cfdi),
      todo: Boolean(readyForCfdi),
      hint: readyForCfdi
        ? `You have ${clientOf(readyForCfdi)}'s tax info. Issue the CFDI for #${readyForCfdi.number}.`
        : 'As soon as you have a paid invoice and the client’s tax info, you can issue it.',
      showMe: readyForCfdi && {
        id: 'guide-cfdi',
        route: '/invoices',
        target: `tax-${readyForCfdi.id}`,
        title: 'Issue the CFDI',
        body: 'Press Tax info, then Issue CFDI. You confirm before anything is sent.',
      },
    },
  ]
}

export function personalJourney(savings: Savings): JourneyStep[] {
  const review = savings.pending[0]
  const setAside = savings.buckets.some((b) => b.amounts.some((m) => Number(m.value) > 0))
  return [
    {
      id: 'plan',
      title: 'Choose your savings plan',
      why: 'Decide what percent of each payment you keep for later, like taxes or emergencies.',
      done: savings.plan.length > 0,
      hint: 'Add your first set-aside, for example Taxes.',
      showMe: {
        id: 'guide-plan',
        route: '/savings',
        target: 'savings-plan',
        title: 'Your savings plan',
        body: 'Press Edit plan to choose names and percentages. It is only a plan: no money moves.',
      },
    },
    {
      id: 'paid',
      title: 'Get paid',
      why: 'Every payment you receive through PayPal shows up here by itself.',
      done: savings.paid !== null && savings.paid.length > 0,
      hint: 'Switch to Business to send an invoice. Payments show up here the moment they arrive.',
    },
    {
      id: 'set-aside',
      title: 'Set part of a payment aside',
      why: 'Each time you get paid, you decide. That way the money for taxes is never spent by mistake.',
      done: setAside,
      todo: Boolean(review),
      hint: review
        ? `You got paid ${formatMoney(Number(review.amount.value), review.amount.currency_code)}. Decide how much to set aside.`
        : undefined,
      showMe: review && {
        id: 'guide-review',
        route: '/savings',
        target: 'savings-review',
        title: 'Decide on this payment',
        body: 'Press Set aside to follow your plan, or Not this time to skip it. You can change the plan anytime.',
      },
    },
  ]
}
