import { useEffect, useRef } from 'react'

// Mismo tipo que server/src/events.ts (LiveEvent).
export interface LiveEvent {
  type: 'invoice.updated' | 'payment.received'
  paypalEvent: string
  invoiceId?: string
  invoiceNumber?: string
  status?: string
}

// Escucha los avisos en vivo del servidor (webhooks de PayPal). Si la conexión
// se cae, EventSource se reconecta solo.
export function useLiveEvents(onEvent: (event: LiveEvent) => void) {
  // Se guarda la última función para no reabrir la conexión en cada render.
  const handler = useRef(onEvent)
  useEffect(() => {
    handler.current = onEvent
  })

  useEffect(() => {
    const source = new EventSource('/api/events')
    source.onmessage = (msg) => {
      try {
        handler.current(JSON.parse(msg.data) as LiveEvent)
      } catch {
        // Mensaje que no es JSON: se ignora.
      }
    }
    return () => source.close()
  }, [])
}
