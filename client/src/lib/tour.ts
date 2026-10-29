import type { Mode } from './mode'

// Pasos del tutorial de bienvenida. Son mensajes escritos a mano: no usan la
// IA ni gastan créditos.
// Vanessa / Natalia: los textos se cambian aquí con toda libertad (en inglés).
// - mode: modo al que cambia la app en ese paso (opcional).
// - route: pantalla a la que se va el tutorial en ese paso (opcional).
// - target: qué parte se ilumina; debe coincidir con un data-tour="..." en
//   la pantalla. Con * al final ilumina el primero que empiece así (por
//   ejemplo 'tax-*' = el primer botón Tax info). Sin target, el mensaje sale
//   en el centro.
export interface TourStep {
  id: string
  mode?: Mode
  route?: string
  target?: string
  title: string
  body: string
}

const TOUR_DONE_KEY = 'vnv-tour-done'

// Si el navegador no deja guardar (modo privado), el tutorial sale cada vez;
// no es grave.
export function isTourDone(): boolean {
  try {
    return localStorage.getItem(TOUR_DONE_KEY) === '1'
  } catch {
    return false
  }
}

export function markTourDone() {
  try {
    localStorage.setItem(TOUR_DONE_KEY, '1')
  } catch {
    // Se ignora: ver isTourDone.
  }
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: "Hi! I'm your copilot 👋",
    body: "I help freelancers in Mexico get paid, keep their taxes in order and know what they can spend. Let me walk you through everything: it takes about two minutes. This is a demo with test money (PayPal Sandbox), so feel free to try anything. You can skip this tour and open it again anytime.",
  },
  {
    id: 'modes',
    mode: 'business',
    route: '/',
    target: 'mode-switch',
    title: 'Two modes, two colors',
    body: 'Purple is Business: billing your clients and getting paid. Orange is Personal: deciding what to do with the money you receive. Switch anytime up here.',
  },
  // Business: cobrar.
  {
    id: 'home',
    mode: 'business',
    route: '/',
    target: 'home-hero',
    title: 'Your money at a glance',
    body: "How much you collected this month, straight from your PayPal account. From here you can create a new invoice or ask me anything. It updates by itself the moment a client pays.",
  },
  {
    id: 'home-stats',
    mode: 'business',
    route: '/',
    target: 'home-stats',
    title: 'Who still owes you',
    body: "What clients haven't paid yet, and which invoices are past their due date. If something is overdue, you can send a friendly reminder in one click.",
  },
  {
    id: 'invoices-new',
    mode: 'business',
    route: '/invoices',
    target: 'invoices-new',
    title: 'Create an invoice',
    body: 'Add your client, what you did and how much. Your client gets an email from PayPal and pays with PayPal or a card. Nothing is sent until you press Send, so you can save it as a draft first.',
  },
  {
    id: 'invoices-row',
    mode: 'business',
    route: '/invoices',
    target: 'invoices-row',
    title: 'Follow every invoice',
    body: 'Each invoice shows its status: draft, sent, paid or overdue. From here you can send it, remind your client, open the payment page or cancel it.',
  },
  {
    id: 'cfdi',
    mode: 'business',
    route: '/invoices',
    target: 'tax-*',
    title: 'Tax invoices (CFDI), handled',
    body: "Many clients in Mexico need an official tax invoice. With Tax info you get a link where your client fills in their tax details just once. When they pay, issue the CFDI with one click and it's emailed to them with the PDF and XML. In this demo CFDIs are test documents.",
  },
  // Personal: organizar lo que te pagan.
  {
    id: 'personal-home',
    mode: 'personal',
    route: '/',
    target: 'home-hero',
    title: 'What you can really spend',
    body: "In Personal mode, Home shows what's left to spend this month after the money you decided to keep aside.",
  },
  {
    id: 'savings-plan',
    mode: 'personal',
    route: '/savings',
    target: 'savings-plan',
    title: 'Your savings plan',
    body: 'Decide what part of every payment you keep for later: for example 30% for taxes and 10% for emergencies. Change it anytime with Edit plan.',
  },
  {
    id: 'savings-review',
    mode: 'personal',
    route: '/savings',
    target: 'savings-review',
    title: 'Set aside each payment',
    body: "Every time you get paid, I'll ask if you want to set aside part of it following your plan. It's a plan to help you budget: no money moves in PayPal.",
  },
  // El copiloto.
  {
    id: 'copilot',
    route: '/copilot',
    target: 'copilot-input',
    title: 'Ask me in your own words',
    body: 'Write like you would to a person: "Bill Ana 3,000 pesos for the logo", "Who owes me money?" or "How much can I spend this month?". I can read your invoices and payments to answer.',
  },
  {
    id: 'approve',
    route: '/copilot',
    target: 'copilot-input',
    title: 'You always have the last word',
    body: 'I never change anything on my own. When I want to create, send or cancel an invoice, set money aside or issue a CFDI, I show you a card with the details and wait for you to press Approve or Reject.',
  },
  {
    id: 'proactive',
    title: 'I make the first move',
    body: "When a client pays, I'll notice and prepare what comes next: issue their CFDI and set aside your taxes. You'll see \"Your copilot has a suggestion\" at the bottom of the screen and a card on Home. Just review and approve.",
  },
  {
    id: 'done',
    target: 'tour-button',
    title: "You're all set",
    body: 'Open this tour again anytime with this button. Prefer step-by-step hints while you learn? Turn on the guide from Home.',
  },
]
