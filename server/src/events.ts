// Avisos en vivo del servidor a las pantallas abiertas. Cuando llega un webhook
// de PayPal se publica aquí, y la ruta /api/events lo reenvía al navegador.
import { EventEmitter } from 'node:events';

export interface LiveEvent {
  type: 'invoice.updated' | 'payment.received';
  // Evento original de PayPal, por ejemplo INVOICING.INVOICE.PAID.
  paypalEvent: string;
  invoiceId?: string;
  invoiceNumber?: string;
  status?: string;
}

const bus = new EventEmitter();
// Cada pestaña abierta es un oyente; se sube el tope para no ver avisos falsos.
bus.setMaxListeners(200);

export function publish(event: LiveEvent): void {
  bus.emit('event', event);
}

export function subscribe(listener: (event: LiveEvent) => void, onShutdown: () => void): () => void {
  bus.on('event', listener);
  bus.on('shutdown', onShutdown);
  return () => {
    bus.off('event', listener);
    bus.off('shutdown', onShutdown);
  };
}

// Al apagar el servidor: las conexiones en vivo nunca terminan solas y harían
// que server.close() esperara hasta el tiempo límite.
export function endAllStreams(): void {
  bus.emit('shutdown');
}
