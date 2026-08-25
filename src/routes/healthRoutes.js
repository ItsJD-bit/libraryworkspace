import { Router } from 'express';
import { testDatabaseConnection } from '../db/pool.js';

const router = Router();

router.get('/health', async (_request, response) => {
  try {
    const databaseReady = await testDatabaseConnection();
    response.json({
      status: 'ok',
      service: 'book-catalog-ai',
      database: databaseReady ? 'connected' : 'unavailable'
    });
  } catch (error) {
    response.status(503).json({
      status: 'degraded',
      service: 'book-catalog-ai',
      database: 'disconnected',
      error: error.message
    });
  }
});

export default router;
