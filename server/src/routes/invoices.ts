import { Router } from 'express';
import { z } from 'zod';
import {
  cancelInvoice,
  createDraftInvoice,
  deleteInvoice,
  getInvoice,
  invoiceIdSchema,
  listInvoices,
  newInvoiceSchema,
  remindInvoice,
  sendInvoice,
} from '../paypal/invoices.js';

const router = Router();

const listQuery = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1) });

router.get('/invoices', async (req, res) => {
  const { page } = listQuery.parse(req.query);
  res.json(await listInvoices(page));
});

router.get('/invoices/:id', async (req, res) => {
  res.json(await getInvoice(invoiceIdSchema.parse(req.params.id)));
});

// Crea un borrador. Enviarlo al cliente es un paso aparte y explícito.
router.post('/invoices', async (req, res) => {
  res.status(201).json(await createDraftInvoice(newInvoiceSchema.parse(req.body)));
});

router.post('/invoices/:id/send', async (req, res) => {
  res.json(await sendInvoice(invoiceIdSchema.parse(req.params.id)));
});

router.post('/invoices/:id/remind', async (req, res) => {
  res.json(await remindInvoice(invoiceIdSchema.parse(req.params.id)));
});

router.post('/invoices/:id/cancel', async (req, res) => {
  res.json(await cancelInvoice(invoiceIdSchema.parse(req.params.id)));
});

router.delete('/invoices/:id', async (req, res) => {
  await deleteInvoice(invoiceIdSchema.parse(req.params.id));
  res.sendStatus(204);
});

export default router;
