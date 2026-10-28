import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env, isProduction } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import chatRoutes from './routes/chat.js';
import healthRoutes from './routes/health.js';
import invoiceRoutes from './routes/invoices.js';
import overviewRoutes from './routes/overview.js';
import webhookRoutes from './routes/webhooks.js';

export function createApp() {
  const app = express();

  // Render pone un proxy delante; necesario para que el rate limit vea la IP real.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // El SDK JS de PayPal carga scripts, iframes y estilos de sus dominios.
          scriptSrc: ["'self'", 'https://*.paypal.com', 'https://*.paypalobjects.com'],
          frameSrc: ["'self'", 'https://*.paypal.com'],
          connectSrc: ["'self'", 'https://*.paypal.com'],
          imgSrc: ["'self'", 'data:', 'https://*.paypal.com', 'https://*.paypalobjects.com'],
        },
      },
    }),
  );

  if (!isProduction) {
    app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  }

  // Webhooks antes de express.json(): necesitan el body crudo. Cada evento
  // provoca una llamada a PayPal para verificar la firma; el límite evita que
  // eventos falsos agoten las peticiones permitidas de la cuenta.
  app.use(
    '/webhooks',
    rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }),
    webhookRoutes,
  );

  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }),
    express.json({ limit: '100kb' }),
  );
  app.use('/api', healthRoutes);
  app.use('/api', invoiceRoutes);
  app.use('/api', overviewRoutes);
  app.use('/api', chatRoutes);
  app.use('/api', notFound);

  // En producción Express sirve el build de React (un solo servicio en Render).
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (isProduction && existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/(api|webhooks)\/).*/, (_req, res) => {
      res.sendFile('index.html', { root: clientDist });
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
