import { Router } from 'express';
import { endInternetSession, getInternetSessions, getMonthlyUsageSummaryForPatron, startInternetSession } from '../services/internetService.js';

const router = Router();

router.get('/api/internet/sessions', async (_request, response, next) => {
  try {
    const sessions = await getInternetSessions();
    return response.json({ sessions });
  } catch (error) {
    return next(error);
  }
});

router.post('/api/internet/sessions/start', async (request, response, next) => {
  try {
    const { barcode, pc_number } = request.body || {};
    const session = await startInternetSession({ barcode, pcNumber: pc_number });
    return response.status(201).json({ session });
  } catch (error) {
    return next(error);
  }
});

router.post('/api/internet/sessions/end', async (request, response, next) => {
  try {
    const { barcode } = request.body || {};
    const session = await endInternetSession({ barcode });
    return response.json({ session });
  } catch (error) {
    return next(error);
  }
});

router.get('/api/internet/patrons/:id/summary', async (request, response, next) => {
  try {
    const patronId = Number(request.params.id);
    if (!Number.isInteger(patronId)) {
      return response.status(400).json({ error: 'A valid patron id is required.' });
    }

    const summary = await getMonthlyUsageSummaryForPatron(patronId);
    return response.json(summary);
  } catch (error) {
    return next(error);
  }
});

export default router;
