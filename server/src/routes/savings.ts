import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getSavings, savePlan } from '../savings.js';

const router = Router();

router.get('/savings', async (_req, res) => {
  res.json(await getSavings());
});

// Mismo límite que las acciones de facturas: la demo es pública y sin login.
const writeLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

router.put('/savings/plan', writeLimit, async (req, res) => {
  await savePlan(req.body?.buckets);
  res.json(await getSavings());
});

export default router;
