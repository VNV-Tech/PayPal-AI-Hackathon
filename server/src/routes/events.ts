import { Router } from 'express';
import { subscribe } from '../events.js';

const router = Router();

// Server-Sent Events: el navegador deja esta conexión abierta y el servidor le
// manda un mensaje cada vez que PayPal avisa de un cambio.
router.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Evita que un proxy (Render, nginx) guarde los mensajes en vez de enviarlos.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  // Primer mensaje inmediato: algunos proxies (como el de Vite) no entregan
  // la respuesta al navegador hasta recibir datos.
  res.write(': connected\n\n');

  const unsubscribe = subscribe(
    (event) => res.write(`data: ${JSON.stringify(event)}\n\n`),
    () => res.end(),
  );

  // Comentario vacío cada 25 s: los proxies cierran conexiones sin tráfico.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export default router;
