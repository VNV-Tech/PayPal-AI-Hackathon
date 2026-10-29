import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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
import { createInvoiceWithTaxLink } from '../taxInfo.js';

const router = Router();

// La demo es pública y no tiene login: las acciones que cambian facturas
// tienen un límite más estricto para que nadie pueda borrar o cancelar todo
// con un script. Ver facturas no se limita aparte.
const writeLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
router.post('/invoices', writeLimit);
router.post('/invoices/:id/:action', writeLimit);
router.delete('/invoices/:id', writeLimit);

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
  const input = newInvoiceSchema.parse(req.body);
  res.status(201).json(await (input.taxLink ? createInvoiceWithTaxLink(input) : createDraftInvoice(input)));
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
