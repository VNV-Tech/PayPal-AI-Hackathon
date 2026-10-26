import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT} (PayPal ${env.PAYPAL_ENV}, ${env.NODE_ENV})`);
});

// Render envía SIGTERM al redesplegar: cerrar conexiones de forma ordenada.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('[server] Promesa rechazada sin manejar:', reason);
});
