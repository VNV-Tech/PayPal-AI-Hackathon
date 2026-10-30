import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DATA_CHANGED } from './api'
import { formatMoney } from './config'
import { useLiveEvents } from './events'
import { type Invoice, invoicesApi } from './invoices'
import type { Mode } from './mode'
import { type Savings, savingsApi } from './savings'
import { type TaxRequest, taxInfoApi } from './taxInfo'
import type { TourStep } from './tour'

// Guía: acompaña al usuario en todo el proceso. Son reglas fijas, sin IA: no
// gasta créditos. Vanessa / Natalia: los textos se cambian aquí (en inglés).
//
// La guía sigue a la factura más reciente que todavía tiene algo pendiente
// (enviarla, esperar el pago, pedir datos fiscales, emitir el CFDI). Así,
// con cada factura nueva, te lleva paso a paso hasta el final.
//
// - done: el paso ya se hizo alguna vez (palomita en la lista).
// - todo: es el paso en el que va la factura que seguimos.
// - hint: qué hacer ahora, con datos reales.
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

type Stage = 'send' | 'paid' | 'tax-info' | 'cfdi'

export function businessJourney(invoices: Invoice[], taxRequests: TaxRequest[], knownClients: string[]): JourneyStep[] {
  const tax = new Map(taxRequests.map((r) => [r.invoiceId, r]))
  const known = new Set(knownClients)
  // Ya tenemos sus datos: o el cliente los mandó para esta factura, o los
  // guardamos de una anterior (al abrir Tax info se usan solos).
  const hasTaxInfo = (inv: Invoice) =>
    tax.get(inv.id)?.status === 'received' || known.has(inv.customer.email?.toLowerCase() ?? '')

  // En qué paso va cada factura. null: ya no le falta nada (o fue cancelada).
  const stageOf = (inv: Invoice): Stage | null => {
    if (inv.status === 'DRAFT') return 'send'
    if (UNPAID.includes(inv.status)) return 'paid'
    // El CFDI solo aplica a facturas en pesos.
    if (!PAID.includes(inv.status) || inv.amount?.currency_code !== 'MXN') return null
    if (!hasTaxInfo(inv)) return 'tax-info'
    return tax.get(inv.id)?.cfdi ? null : 'cfdi'
  }
  // La lista llega con las más nuevas primero: seguimos la más reciente con algo pendiente.
  const focus = invoices.find((inv) => stageOf(inv) !== null)
  const stage = focus ? stageOf(focus) : null
  const who = focus ? clientOf(focus) : ''
  const num = focus ? `#${focus.number}` : ''

  return [
    {
      id: 'create',
      title: 'Create an invoice',
      why: 'PayPal emails it to your client with a button to pay by PayPal or card.',
      done: invoices.length > 0,
      hint: "Let's start: create your first invoice. You can also ask the copilot to draft it for you.",
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
      todo: stage === 'send',
      hint: `Draft ${num} for ${who} is ready. Send it so they can pay.`,
      showMe:
        focus && stage === 'send'
          ? {
              id: 'guide-send',
              route: '/invoices',
              target: `send-${focus.id}`,
              title: 'Send it',
              body: `Press Send on ${num}. PayPal emails ${who} a link to pay.`,
            }
          : undefined,
    },
    {
      id: 'paid',
      title: 'Get paid',
      why: 'The app updates by itself the moment your client pays, and the copilot tells you what to do next.',
      done: invoices.some((inv) => PAID.includes(inv.status)),
      todo: stage === 'paid',
      hint: `Sent ✓ Now we wait for ${who} to pay ${num}${focus ? ` (${amountOf(focus)})` : ''}. I'll let you know the moment it arrives.`,
      showMe:
        focus && stage === 'paid'
          ? {
              id: 'guide-remind',
              route: '/invoices',
              target: `remind-${focus.id}`,
              title: 'Waiting for the payment',
              body: 'You don’t have to do anything. If it takes long, press Remind and PayPal sends your client a reminder.',
            }
          : undefined,
    },
    {
      id: 'tax-info',
      title: 'Get your client’s tax info',
      why: 'In Mexico, clients usually need an official tax invoice (CFDI). They fill in their details once; we remember them.',
      done: taxRequests.some((r) => r.status === 'received'),
      todo: stage === 'tax-info',
      hint: `${who} paid ${num} 🎉 Now ask for their tax info so they can get their CFDI.`,
      showMe:
        focus && stage === 'tax-info'
          ? {
              id: 'guide-tax',
              route: '/invoices',
              target: `tax-${focus.id}`,
              title: 'Ask for their tax info',
              body: 'Press Tax info and copy the link for your client. New invoices already include it in the PayPal email.',
            }
          : undefined,
    },
    {
      id: 'cfdi',
      title: 'Send their tax invoice (CFDI)',
      why: 'One click: it is stamped with the SAT (test mode) and emailed to your client.',
      done: taxRequests.some((r) => r.cfdi),
      todo: stage === 'cfdi',
      hint: `${who} paid ${num} and you have their tax info. Issue the CFDI and it’s emailed to them.`,
      showMe:
        focus && stage === 'cfdi'
          ? {
              id: 'guide-cfdi',
              route: '/invoices',
              target: `tax-${focus.id}`,
              title: 'Issue the CFDI',
              body: 'Press Tax info, then Issue CFDI. You confirm before anything is sent.',
            }
          : undefined,
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
        ? `You got paid ${formatMoney(Number(review.amount.value), review.amount.currency_code)} 🎉 Decide how much of it to set aside.`
        : undefined,
      showMe: review
        ? {
            id: 'guide-review',
            route: '/savings',
            target: 'savings-review',
            title: 'Decide on this payment',
            body: 'Press Set aside to follow your plan, or Not this time to skip it. You can change the plan anytime.',
          }
        : undefined,
    },
  ]
}

// El paso que la guía muestra: lo que va la factura que seguimos; si no hay,
// el primero que nunca se ha hecho. firstTime: el usuario va aprendiendo.
export function currentStep(steps: JourneyStep[]): { step: JourneyStep; firstTime: boolean } | null {
  const step = steps.find((s) => s.todo) ?? steps.find((s) => !s.done)
  return step ? { step, firstTime: !step.done } : null
}

// Pasos del modo, actualizados al cambiar de pantalla, al hacer algo en la
// app y cuando PayPal avisa de un cambio. null mientras cargan o si la guía
// está apagada (así no se piden datos que nadie va a ver).
export function useJourney(mode: Mode, off = false): JourneyStep[] | null {
  const [loaded, setLoaded] = useState<{ mode: Mode; steps: JourneyStep[] } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const { pathname } = useLocation()

  useEffect(() => {
    if (off) return
    let ignore = false
    const load =
      mode === 'business'
        ? Promise.all([invoicesApi.list(1), taxInfoApi.list()]).then(([page, tax]) =>
            businessJourney(page.invoices, tax.requests, tax.knownClients),
          )
        : savingsApi.get().then(personalJourney)
    // Si falla, la guía simplemente no se muestra.
    load.then(
      (steps) => {
        if (!ignore) setLoaded({ mode, steps })
      },
      () => {},
    )
    return () => {
      ignore = true
    }
  }, [mode, off, pathname, reloadKey])

  useLiveEvents(() => setReloadKey((k) => k + 1))
  useEffect(() => {
    const onChange = () => setReloadKey((k) => k + 1)
    window.addEventListener(DATA_CHANGED, onChange)
    return () => window.removeEventListener(DATA_CHANGED, onChange)
  }, [])

  return !off && loaded?.mode === mode ? loaded.steps : null
}

const GUIDE_ON_KEY = 'vnv-guide-on'

// La guía empieza apagada: el tutorial de bienvenida ya explica todo y así no
// compite con el copiloto. Quien quiera los pasos la prende desde Home.
export function isGuideOff(): boolean {
  try {
    return localStorage.getItem(GUIDE_ON_KEY) !== '1'
  } catch {
    return true
  }
}

export function saveGuideOff(off: boolean) {
  try {
    if (off) localStorage.removeItem(GUIDE_ON_KEY)
    else localStorage.setItem(GUIDE_ON_KEY, '1')
  } catch {
    // Se ignora: ver isGuideOff.
  }
}
