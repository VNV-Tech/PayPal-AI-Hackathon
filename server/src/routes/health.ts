import { Router } from 'express';
import { env } from '../config/env.js';
import { getAccessToken, getTokenStatus } from '../paypal/client.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', paypalEnv: env.PAYPAL_ENV, token: getTokenStatus() });
});

// Comprueba que las credenciales de PayPal funcionan (no expone el token).
router.get('/paypal/ping', async (_req, res) => {
  try {
    await getAccessToken();
    res.json({ ok: true, token: getTokenStatus() });
  } catch (err) {
    console.error('[paypal] ping falló:', err instanceof Error ? err.message : err);
    res.status(502).json({ ok: false, error: 'Could not authenticate with PayPal' });
  }
});

export default router;
