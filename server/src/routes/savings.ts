import { type ErrorRequestHandler, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  InvalidAllocationError,
  PaymentNotFoundError,
  customAllocationsSchema,
  decidePayment,
  getSavings,
  savePlan,
} from '../savings.js';

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

// Respuesta a "¿apartas dinero de este pago?". allocations (opcional) son
// montos a la medida; sin ellos se usa el plan.
const decisionSchema = z.object({
  decision: z.enum(['set_aside', 'skip']),
  allocations: customAllocationsSchema.optional(),
});
const paymentIdSchema = z.string().regex(/^[A-Z0-9]{8,30}$/, 'Invalid payment id');

router.post('/savings/payments/:id', writeLimit, async (req, res) => {
  const id = paymentIdSchema.parse(req.params.id);
  const { decision, allocations } = decisionSchema.parse(req.body);
  res.json(await decidePayment(id, decision === 'set_aside', allocations));
});

const savingsErrors: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof PaymentNotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof InvalidAllocationError) {
    res.status(400).json({ error: err.message });
  } else {
    next(err);
  }
};
router.use('/savings', savingsErrors);

export default router;
