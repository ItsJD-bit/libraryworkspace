import { Router } from 'express';
import { getServiceUsageReport } from '../services/reportService.js';

const router = Router();

router.get('/api/reports', async (request, response, next) => {
  const { startDate, endDate } = request.query;

  if (!startDate || !endDate) {
    return response.status(400).json({ error: 'startDate and endDate are required.' });
  }

  try {
    const start = String(startDate);
    const end = String(endDate);

    if (new Date(start) > new Date(end)) {
      return response.status(400).json({ error: 'startDate cannot be later than endDate.' });
    }

    const report = await getServiceUsageReport(start, end);
    return response.json(report);
  } catch (error) {
    return next(error);
  }
});

export default router;
