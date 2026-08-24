import { Router } from 'express';
import { bookInputSchema } from '../schemas/catalogSchema.js';
import { catalogBook } from '../services/catalogService.js';

const router = Router();

router.post('/api/catalog', async (request, response, next) => {
  const parsed = bookInputSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      error: 'Invalid book metadata',
      details: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const catalog = await catalogBook(parsed.data);
    return response.json({
      input: parsed.data,
      catalog,
      disclaimer: 'AI suggestions require review against current cataloging standards, local policy, and authoritative records.'
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
