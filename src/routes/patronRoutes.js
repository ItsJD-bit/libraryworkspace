import { Router } from 'express';
import { checkPatronBarcodeExists, createPatron, getPatrons } from '../services/patronService.js';

const router = Router();

router.get('/api/patrons', async (_request, response, next) => {
  try {
    const patrons = await getPatrons();
    return response.json({ patrons });
  } catch (error) {
    return next(error);
  }
});

router.post('/api/patrons', async (request, response, next) => {
  const data = request.body || {};
  const { barcode, first_name, last_name, patron_type } = data;

  if (!barcode || !first_name || !last_name || !patron_type) {
    return response.status(400).json({ error: 'barcode, first_name, last_name, and patron_type are required.' });
  }

  try {
    const exists = await checkPatronBarcodeExists(String(barcode).trim());
    if (exists) {
      return response.status(409).json({ error: 'This barcode is already registered.' });
    }

    const patron = await createPatron({
      barcode: String(barcode).trim(),
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      course: data.course ? String(data.course).trim() : '',
      year: data.year ? Number(data.year) : null,
      patron_type: String(patron_type).trim(),
      department: data.department ? String(data.department).trim() : '',
      student_id: data.student_id ? String(data.student_id).trim() : ''
    });

    return response.status(201).json({ patron });
  } catch (error) {
    return next(error);
  }
});

export default router;
