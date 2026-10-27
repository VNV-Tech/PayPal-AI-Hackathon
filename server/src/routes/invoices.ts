import { Router } from 'express';
import { z } from 'zod';
import {
  CURRENCIES,
  PAYMENT_TERMS,
  cancelInvoice,
  createDraftInvoice,
  deleteInvoice,
  getInvoice,
  listInvoices,
  remindInvoice,
  sendInvoice,
} from '../paypal/invoices.js';

const router = Router();

// Los IDs de PayPal tienen la forma INV2-XXXX-XXXX-XXXX-XXXX. Validarlos evita
// que un ID manipulado altere la ruta de la petición a PayPal.
const invoiceId = z.string().regex(/^INV2(-[A-Z0-9]{4}){4}$/, 'Invalid invoice id');

const newInvoiceSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(140),
    email: z.email().max(254),
    company: z.string().trim().max(120).optional(),
  }),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        quantity: z.number().int().positive().max(9999),
        unitAmount: z.number().positive().max(1_000_000),
      }),
    )
    .min(1)
    .max(20),
  currency: z.enum(CURRENCIES).default('MXN'),
  terms: z.enum(PAYMENT_TERMS).default('NET_15'),
  note: z.string().trim().max(1000).optional(),
});

const listQuery = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1) });

router.get('/invoices', async (req, res) => {
  const { page } = listQuery.parse(req.query);
  res.json(await listInvoices(page));
});

router.get('/invoices/:id', async (req, res) => {
  res.json(await getInvoice(invoiceId.parse(req.params.id)));
});

// Crea un borrador. Enviarlo al cliente es un paso aparte y explícito.
router.post('/invoices', async (req, res) => {
  res.status(201).json(await createDraftInvoice(newInvoiceSchema.parse(req.body)));
});

router.post('/invoices/:id/send', async (req, res) => {
  res.json(await sendInvoice(invoiceId.parse(req.params.id)));
});

router.post('/invoices/:id/remind', async (req, res) => {
  res.json(await remindInvoice(invoiceId.parse(req.params.id)));
});

router.post('/invoices/:id/cancel', async (req, res) => {
  res.json(await cancelInvoice(invoiceId.parse(req.params.id)));
});

router.delete('/invoices/:id', async (req, res) => {
  await deleteInvoice(invoiceId.parse(req.params.id));
  res.sendStatus(204);
});

export default router;
