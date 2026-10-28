// Datos fiscales (CFDI). Las rutas /tax-info/public/:token son las que abre el
// cliente con su link; las demás, el usuario desde la pantalla de facturas.
import { type ErrorRequestHandler, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { invoiceIdSchema } from '../paypal/invoices.js';
import {
  TaxRequestNotFoundError,
  getOrCreateTaxRequest,
  getPublicTaxRequest,
  listTaxRequests,
  submitTaxInfo,
  tokenSchema,
} from '../taxInfo.js';

const router = Router();

// Mismo límite que las acciones de facturas: la demo es pública y sin login.
const writeLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/tax-info', async (_req, res) => {
  res.json({ requests: await listTaxRequests() });
});

const createSchema = z.object({ invoiceId: invoiceIdSchema });

router.post('/tax-info/requests', writeLimit, async (req, res) => {
  const { invoiceId } = createSchema.parse(req.body);
  res.json(await getOrCreateTaxRequest(invoiceId));
});

router.get('/tax-info/public/:token', async (req, res) => {
  res.json(await getPublicTaxRequest(tokenSchema.parse(req.params.token)));
});

router.post('/tax-info/public/:token', writeLimit, async (req, res) => {
  const { status } = await submitTaxInfo(tokenSchema.parse(req.params.token), req.body);
  res.json({ status });
});

const taxInfoErrors: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof TaxRequestNotFoundError) {
    res.status(404).json({ error: err.message });
  } else {
    next(err);
  }
};
router.use('/tax-info', taxInfoErrors);

export default router;
