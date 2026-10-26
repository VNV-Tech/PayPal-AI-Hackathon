import type { IncomingHttpHeaders } from 'node:http';
import express, { Router } from 'express';
import { env, isProduction } from '../config/env.js';
import { paypalFetch } from '../paypal/client.js';

const router = Router();

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
  if (!env.PAYPAL_WEBHOOK_ID) {
    if (isProduction) {
      console.error('[webhook] PAYPAL_WEBHOOK_ID no configurado; evento rechazado');
      return false;
    }
    console.warn('[webhook] PAYPAL_WEBHOOK_ID no configurado; se omite la verificación (solo en desarrollo)');
    return true;
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

  console.log(`[webhook] ${event.event_type} (${event.id})`);

  // TODO: idempotencia — PayPal puede entregar el mismo evento más de una vez;
  // guardar event.id procesados cuando haya base de datos.
  switch (event.event_type) {
    case 'INVOICING.INVOICE.PAID':
      // TODO: marcar factura del freelancer como cobrada.
      break;
    case 'INVOICING.INVOICE.CANCELLED':
      // TODO: marcar factura como cancelada.
      break;
    case 'PAYMENT.CAPTURE.COMPLETED':
      // TODO: registrar ingreso.
      break;
    default:
      break;
  }
}

export default router;
