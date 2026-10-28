// Datos fiscales (CFDI). Las rutas /tax-info/public/:token son las que abre el
// cliente con su link; las demás, el usuario desde la pantalla de facturas.
import { type ErrorRequestHandler, type Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { invoiceIdSchema } from '../paypal/invoices.js';
import { getCfdiFile, isFacturamaConfigured } from '../facturama.js';
import {
  CfdiNotReadyError,
  TaxRequestNotFoundError,
  findTaxRequest,
  findTaxRequestByToken,
  getOrCreateTaxRequest,
  issueCfdi,
  getPublicTaxRequest,
  listTaxRequests,
  submitTaxInfo,
  tokenSchema,
} from '../taxInfo.js';

const router = Router();

// Mismo límite que las acciones de facturas: la demo es pública y sin login.
const writeLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/tax-info', async (_req, res) => {
  res.json({ requests: await listTaxRequests(), cfdiEnabled: isFacturamaConfigured() });
});

const createSchema = z.object({ invoiceId: invoiceIdSchema });

router.post('/tax-info/requests', writeLimit, async (req, res) => {
  const { invoiceId } = createSchema.parse(req.body);
  res.json(await getOrCreateTaxRequest(invoiceId));
});

// Emitir el CFDI: el usuario ya lo confirmó en la ventana de la pantalla.
router.post('/tax-info/cfdi', writeLimit, async (req, res) => {
  const { invoiceId } = createSchema.parse(req.body);
  res.json(await issueCfdi(invoiceId));
});

const formatSchema = z.enum(['pdf', 'xml']);

async function sendCfdiFile(res: Response, cfdiId: string, invoiceNumber: string | null, format: 'pdf' | 'xml') {
  const file = await getCfdiFile(cfdiId, format);
  res.type(format === 'pdf' ? 'application/pdf' : 'application/xml');
  res.attachment(`CFDI-${invoiceNumber ?? cfdiId}.${format}`);
  res.send(file);
}

router.get('/tax-info/cfdi/:invoiceId/:format', async (req, res) => {
  const invoiceId = invoiceIdSchema.parse(req.params.invoiceId);
  const format = formatSchema.parse(req.params.format);
  const request = await findTaxRequest(invoiceId);
  if (!request?.cfdi) throw new TaxRequestNotFoundError('No CFDI for this invoice yet');
  await sendCfdiFile(res, request.cfdi.id, request.invoiceNumber, format);
});

// El cliente también puede descargar su factura desde su link.
router.get('/tax-info/public/:token/:format', async (req, res) => {
  const request = await findTaxRequestByToken(tokenSchema.parse(req.params.token));
  const format = formatSchema.parse(req.params.format);
  if (!request?.cfdi) throw new TaxRequestNotFoundError('No CFDI for this link yet');
  await sendCfdiFile(res, request.cfdi.id, request.invoiceNumber, format);
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
  } else if (err instanceof CfdiNotReadyError) {
    res.status(409).json({ error: err.message });
  } else {
    next(err);
  }
};
router.use('/tax-info', taxInfoErrors);

export default router;
