import Anthropic from '@anthropic-ai/sdk';
import { type ErrorRequestHandler, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { ChatLimitError, ChatNotFoundError, resolveAction, sendMessage } from '../ai/copilot.js';

const router = Router();

// Cada mensaje cuesta créditos de la API: límite más estricto que el resto.
router.use('/chat', rateLimit({ windowMs: 60_000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false }));

const messageSchema = z.object({
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});

const decisionSchema = z.object({ decision: z.enum(['approve', 'reject']) });

router.post('/chat', async (req, res) => {
  const { conversationId, message } = messageSchema.parse(req.body);
  res.json(await sendMessage(conversationId, message));
});

router.post('/chat/actions/:id', async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const { decision } = decisionSchema.parse(req.body);
  res.json(await resolveAction(id, decision));
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

export default router;
