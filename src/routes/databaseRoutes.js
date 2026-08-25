import { Router } from 'express';
import { testDatabaseConnection } from '../db/pool.js';

const router = Router();

router.get('/api/db-status', async (_request, response) => {
  try {
    const connected = await testDatabaseConnection();
    response.json({ connected });
  } catch (error) {
    response.status(503).json({ connected: false, error: error.message });
  }
});

export default router;
