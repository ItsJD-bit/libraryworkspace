import { Router } from 'express';
import {
  getCirculationSummary,
  checkoutBook,
  checkinBook,
  renewLoan,
  getActiveLoans,
  getLoanedBooks
} from '../services/circulationService.js';

const router = Router();

router.get('/api/circulation/summary', async (_request, response, next) => {
  try {
    const summary = await getCirculationSummary();
    return response.json(summary);
  } catch (error) {
    return next(error);
  }
});

router.get('/api/circulation/loans', async (_request, response, next) => {
  try {
    const loans = await getActiveLoans();
    return response.json({ loans });
  } catch (error) {
    return next(error);
  }
});

router.get('/api/circulation/books', async (_request, response, next) => {
  try {
    const books = await getLoanedBooks();
    return response.json({ books });
  } catch (error) {
    return next(error);
  }
});

router.post('/api/circulation/checkout', async (request, response, next) => {
  try {
    const result = await checkoutBook(request.body || {});
    return response.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

router.post('/api/circulation/checkin', async (request, response, next) => {
  try {
    const result = await checkinBook(request.body || {});
    return response.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post('/api/circulation/renew', async (request, response, next) => {
  try {
    const result = await renewLoan(request.body || {});
    return response.json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
