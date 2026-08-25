import { Router } from 'express';
import { archiveBook, checkBarcodeExists, createBook, deleteBook, getBooks, updateBook } from '../services/bookService.js';

const router = Router();

router.get('/api/books', async (_request, response, next) => {
  try {
    const books = await getBooks();
    return response.json({ books });
  } catch (error) {
    return next(error);
  }
});

router.post('/api/books', async (request, response, next) => {
  try {
    const payload = request.body || {};
    const barcode = String(payload.barcode || '').trim();
    const title = String(payload.title || '').trim();
    const author = String(payload.author || '').trim();

    if (!title || !author) {
      return response.status(400).json({ error: 'Title and author are required.' });
    }

    if (barcode && await checkBarcodeExists(barcode)) {
      return response.status(409).json({ error: 'This barcode is already assigned to another book.' });
    }

    const book = await createBook({
      title,
      subtitle: payload.subtitle ? String(payload.subtitle).trim() : '',
      author,
      illustrator: payload.illustrator ? String(payload.illustrator).trim() : '',
      edition: payload.edition ? String(payload.edition).trim() : '',
      publisher: payload.publisher ? String(payload.publisher).trim() : '',
      publication_year: payload.publication_year ? Number(payload.publication_year) : null,
      language: payload.language ? String(payload.language).trim() : '',
      isbn: payload.isbn ? String(payload.isbn).trim() : '',
      isbn_13: payload.isbn_13 ? String(payload.isbn_13).trim() : '',
      ddc: payload.ddc ? String(payload.ddc).trim() : '',
      cutter: payload.cutter ? String(payload.cutter).trim() : '',
      genre: payload.genre ? String(payload.genre).trim() : '',
      format: payload.format ? String(payload.format).trim() : '',
      pages: payload.pages ? Number(payload.pages) : null,
      description: payload.description ? String(payload.description).trim() : '',
      subject: payload.subject ? String(payload.subject).trim() : '',
      barcode,
      collection_type: payload.collection_type ? String(payload.collection_type).trim() : 'circulation',
      status: payload.status ? String(payload.status).trim() : 'available',
      location: payload.location ? String(payload.location).trim() : '',
      condition: payload.condition ? String(payload.condition).trim() : '',
      price: payload.price ? Number(payload.price) : 0,
      notes: payload.notes ? String(payload.notes).trim() : '',
      acquisition_date: payload.acquisition_date ? String(payload.acquisition_date) : new Date().toISOString(),
      archived: Boolean(payload.archived),
      ddc_number: payload.ddc_number ? String(payload.ddc_number).trim() : null,
      cutter_number: payload.cutter_number ? String(payload.cutter_number).trim() : null,
      lcsh: payload.lcsh ? String(payload.lcsh).trim() : null
    });

    return response.status(201).json({ book });
  } catch (error) {
    return next(error);
  }
});

router.put('/api/books/:id', async (request, response, next) => {
  try {
    const bookId = Number(request.params.id);
    if (!Number.isInteger(bookId)) {
      return response.status(400).json({ error: 'A valid book id is required.' });
    }

    const updated = await updateBook(bookId, request.body || {});
    return response.json({ book: updated });
  } catch (error) {
    return next(error);
  }
});

router.patch('/api/books/:id/archive', async (request, response, next) => {
  try {
    const bookId = Number(request.params.id);
    if (!Number.isInteger(bookId)) {
      return response.status(400).json({ error: 'A valid book id is required.' });
    }

    const archived = await archiveBook(bookId);
    return response.json({ book: archived });
  } catch (error) {
    return next(error);
  }
});

router.delete('/api/books/:id', async (request, response, next) => {
  try {
    const bookId = Number(request.params.id);
    if (!Number.isInteger(bookId)) {
      return response.status(400).json({ error: 'A valid book id is required.' });
    }

    const deleted = await deleteBook(bookId);
    if (!deleted) {
      return response.status(404).json({ error: 'Book not found.' });
    }

    return response.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
