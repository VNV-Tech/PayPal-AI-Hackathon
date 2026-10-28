import type { IncomingHttpHeaders } from 'node:http';
import express, { Router } from 'express';
import { env } from '../config/env.js';
import { publish } from '../events.js';
import { paypalFetch } from '../paypal/client.js';

const router = Router();

// IDs de eventos ya procesados. PayPal puede entregar el mismo evento más de
// una vez; mientras no haya base de datos se recuerdan en memoria los últimos.
const MAX_REMEMBERED_EVENTS = 1000;
const processedEventIds = new Set<string>();

function markProcessed(eventId: string): boolean {
  if (processedEventIds.has(eventId)) return false;
  processedEventIds.add(eventId);
  if (processedEventIds.size > MAX_REMEMBERED_EVENTS) {
    // Un Set conserva el orden de inserción: el primero es el más antiguo.
    processedEventIds.delete(processedEventIds.values().next().value!);
  }
  return true;
}

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource?: Record<string, unknown>;
}

// Body crudo: la verificación de firma necesita el JSON exactamente como lo
// envió PayPal; re-serializarlo con JSON.stringify puede romper la firma.
router.post('/paypal', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
  // Responder 200 de inmediato: si PayPal no recibe 2xx rápido, reintenta
  // hasta 25 veces durante 3 días.
  res.sendStatus(200);

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const headers = req.headers;

  setImmediate(() => {
    processWebhook(rawBody, headers).catch((err: unknown) => {
      console.error('[webhook] Error procesando evento:', err);
    });
  });
});

function header(headers: IncomingHttpHeaders, name: string): string {
  const value = headers[name];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

async function verifySignature(rawBody: string, headers: IncomingHttpHeaders): Promise<boolean> {
  // Saltarse la verificación solo si se pide de forma explícita (pruebas
  // locales). No depende de NODE_ENV: si se olvidara configurarlo en Render,
  // cualquiera podría enviar eventos falsos.
  if (env.PAYPAL_SKIP_WEBHOOK_VERIFY) {
    console.warn('[webhook] PAYPAL_SKIP_WEBHOOK_VERIFY=true; se omite la verificación de firma');
    return true;
  }
  if (!env.PAYPAL_WEBHOOK_ID) {
    console.error('[webhook] PAYPAL_WEBHOOK_ID no configurado; evento rechazado');
    return false;
  }

  // Se arma el body a mano para incrustar el evento crudo sin re-serializarlo.
  const fields = {
    auth_algo: header(headers, 'paypal-auth-algo'),
    cert_url: header(headers, 'paypal-cert-url'),
    transmission_id: header(headers, 'paypal-transmission-id'),
    transmission_sig: header(headers, 'paypal-transmission-sig'),
    transmission_time: header(headers, 'paypal-transmission-time'),
    webhook_id: env.PAYPAL_WEBHOOK_ID,
  };
  const verificationBody = `${JSON.stringify(fields).slice(0, -1)},"webhook_event":${rawBody}}`;

  const res = await paypalFetch('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: verificationBody,
  });
  if (!res.ok) {
    console.error('[webhook] Error al verificar firma:', res.status, res.headers.get('paypal-debug-id'));
    return false;
  }
  const { verification_status } = (await res.json()) as { verification_status: string };
  return verification_status === 'SUCCESS';
}

async function processWebhook(rawBody: string, headers: IncomingHttpHeaders): Promise<void> {
  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    console.warn('[webhook] Body no es JSON válido; ignorado');
    return;
  }

  if (!(await verifySignature(rawBody, headers))) {
    console.warn(`[webhook] Firma inválida para evento ${event.id}; ignorado`);
    return;
  }

  if (!markProcessed(event.id)) {
    console.log(`[webhook] Evento ${event.id} repetido; ignorado`);
    return;
  }

  console.log(`[webhook] ${event.event_type} (${event.id})`);

  // TODO: guardar los event.id en la base de datos cuando exista, para que
  // la protección contra eventos repetidos sobreviva a reinicios.
  // No hay base de datos: las facturas se leen siempre de PayPal. Basta con
  // avisar a las pantallas abiertas para que vuelvan a pedir los datos.
  if (event.event_type.startsWith('INVOICING.INVOICE.')) {
    const invoice = invoiceFrom(event.resource);
    publish({
      type: 'invoice.updated',
      paypalEvent: event.event_type,
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.detail?.invoice_number,
      status: invoice?.status,
    });
  } else if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    publish({ type: 'payment.received', paypalEvent: event.event_type });
  }
}

interface InvoiceResource {
  id?: string;
  status?: string;
  detail?: { invoice_number?: string };
}

// En los eventos de Invoicing v2 la factura viene dentro de resource.invoice.
function invoiceFrom(resource: Record<string, unknown> | undefined): InvoiceResource | undefined {
  if (!resource) return undefined;
  return (resource.invoice ?? resource) as InvoiceResource;
}

export default router;
