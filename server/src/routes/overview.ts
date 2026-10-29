import { Router } from 'express';
import { getOverview } from '../paypal/overview.js';

const router = Router();

router.get('/overview', async (_req, res) => {
  res.json(await getOverview());
});

export default router;
