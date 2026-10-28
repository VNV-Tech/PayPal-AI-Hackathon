import { type ErrorRequestHandler, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { PaymentNotFoundError, decidePayment, getSavings, savePlan } from '../savings.js';

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

// Respuesta a "¿apartas dinero de este pago?".
const decisionSchema = z.object({ decision: z.enum(['set_aside', 'skip']) });
const paymentIdSchema = z.string().regex(/^[A-Z0-9]{8,30}$/, 'Invalid payment id');

router.post('/savings/payments/:id', writeLimit, async (req, res) => {
  const id = paymentIdSchema.parse(req.params.id);
  const { decision } = decisionSchema.parse(req.body);
  res.json(await decidePayment(id, decision === 'set_aside'));
});

const savingsErrors: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof PaymentNotFoundError) {
    res.status(404).json({ error: err.message });
  } else {
    next(err);
  }
};
router.use('/savings', savingsErrors);

export default router;
