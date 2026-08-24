import { Router } from 'express';

const router = Router();

router.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'book-catalog-ai' });
});

export default router;
