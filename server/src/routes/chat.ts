import Anthropic from '@anthropic-ai/sdk';
import { type ErrorRequestHandler, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { ChatLimitError, ChatNotFoundError, listSuggestions, resolveAction, sendMessage, startFromEvent } from '../ai/copilot.js';
import { pendingPaymentsFacts } from '../ai/proactive.js';

const router = Router();

// Cada mensaje cuesta créditos de la API: límite más estricto que el resto.
const chatLimit = rateLimit({ windowMs: 60_000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false });
router.use('/chat', chatLimit);
router.use('/copilot/review-payments', chatLimit);

const messageSchema = z.object({
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  // Tarjetas con casillas: lo que el usuario dejó palomeado.
  selected: z.array(z.string().max(100)).max(100).optional(),
});

router.post('/chat', async (req, res) => {
  const { conversationId, message } = messageSchema.parse(req.body);
  res.json(await sendMessage(conversationId, message));
});

router.post('/chat/actions/:id', async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const { decision, selected } = decisionSchema.parse(req.body);
  res.json(await resolveAction(id, decision, selected));
});

// Botón "Review all with AI" de Savings: el copiloto recibe los pagos
// pendientes ya listos y arma un solo ticket.
router.post('/copilot/review-payments', async (_req, res) => {
  const facts = await pendingPaymentsFacts();
  if (!facts) {
    res.json({ items: [{ type: 'text', text: 'There are no payments waiting for a decision right now.' }] });
    return;
  }
  res.json(await startFromEvent(facts));
});

// Lo que el copiloto preparó por su cuenta (por ejemplo, al llegar un pago).
router.get('/copilot/suggestions', (_req, res) => {
  res.json({ suggestions: listSuggestions() });
});

// Errores propios del chat; el resto sigue al manejador central.
const chatErrors: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof ChatNotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof ChatLimitError) {
    res.status(429).json({ error: err.message });
  } else if (err instanceof Anthropic.RateLimitError) {
    res.status(503).json({ error: 'The copilot is busy right now. Try again in a minute.' });
  } else if (err instanceof Anthropic.APIError) {
    console.error(`[claude] ${err.status} ${err.message}`);
    res.status(502).json({ error: 'The copilot is unavailable right now. Try again in a moment.' });
  } else {
    next(err);
  }
};
router.use('/chat', chatErrors);
router.use('/copilot/review-payments', chatErrors);

export default router;
