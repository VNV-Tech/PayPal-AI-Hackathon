import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env.js';
import { PayPalError } from '../paypal/client.js';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

// Manejador central: nunca filtra stack traces ni detalles internos al cliente
// en producción.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', issues: err.issues.map((i) => ({ path: i.path, message: i.message })) });
    return;
  }

  if (err instanceof PayPalError) {
    console.error(`[paypal] ${err.message} (debug_id=${err.debugId ?? 'n/a'})`);
    res.status(502).json({ error: 'PayPal request failed', debugId: err.debugId });
    return;
  }

  // body-parser marca errores de JSON malformado o payload demasiado grande.
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body too large' });
    return;
  }

  console.error('[server] Error no controlado:', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(isProduction ? {} : { detail: String(err?.message ?? err) }),
  });
};
