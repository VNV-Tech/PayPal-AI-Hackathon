// Pasos del tutorial de bienvenida. Son mensajes escritos a mano: no usan la
// IA ni gastan créditos.
// Vanessa / Natalia: los textos se cambian aquí con toda libertad (en inglés).
// - route: pantalla a la que se va el tutorial en ese paso (opcional).
// - target: qué parte se ilumina; debe coincidir con un data-tour="..." en
//   la pantalla. Sin target, el mensaje sale en el centro.
export interface TourStep {
  id: string
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
    body: "I help freelancers get paid and keep track of their money. Let me show you around: it takes about a minute. This is a demo with test money (PayPal Sandbox), so feel free to try anything.",
  },
  {
    id: 'overview',
    route: '/',
    target: 'overview-stats',
    title: 'Your money at a glance',
    body: 'What clients owe you, what you collected this month and what is overdue. It updates by itself the moment someone pays.',
  },
  {
    id: 'invoices',
    route: '/invoices',
    target: 'invoices-new',
    title: 'Get paid with PayPal',
    body: 'Create an invoice here. Your client gets an email and pays with PayPal or a card. Nothing is sent until you press Send.',
  },
  {
    id: 'savings',
    route: '/savings',
    target: 'savings-plan',
    title: 'Set money aside',
    body: "Every time you get paid, I'll ask if you want to keep part of it for taxes or emergencies. It's only a plan to help you budget: no money moves.",
  },
  {
    id: 'copilot',
    route: '/copilot',
    target: 'copilot-input',
    title: 'Or just ask me',
    body: 'I can draft invoices, tell you who owes you and send reminders. Before I do anything, I show you a card and wait for you to press Approve.',
  },
  {
    id: 'done',
    route: '/copilot',
    title: "You're all set",
    body: "Try one of the suggestions above, or write your own. You can see this tour again anytime with the Tour button at the top.",
  },
]
