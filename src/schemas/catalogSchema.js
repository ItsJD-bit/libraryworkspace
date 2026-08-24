import { z } from 'zod';

export const bookInputSchema = z.object({
  title: z.string().trim().min(1).max(500),
  author: z.string().trim().min(1).max(300),
  isbn: z.string().trim().max(32).optional(),
  publisher: z.string().trim().max(300).optional(),
  publicationYear: z.coerce.number().int().min(1400).max(2100).optional(),
  edition: z.string().trim().max(200).optional(),
  language: z.string().trim().max(100).optional(),
  description: z.string().trim().max(5000).optional()
});

export const catalogResultSchema = z.object({
  summary: z.string(),
  ddc: z.object({
    number: z.string(),
    label: z.string(),
    confidence: z.number().min(0).max(1),
    rationale: z.string()
  }),
  cutter: z.object({
    number: z.string(),
    basis: z.string(),
    confidence: z.number().min(0).max(1),
    rationale: z.string()
  }),
  lcsh: z.array(z.object({
    heading: z.string(),
    confidence: z.number().min(0).max(1),
    rationale: z.string()
  })).min(1).max(10),
  reviewNotes: z.array(z.string()).max(10)
});

export const ollamaCatalogFormat = {
  type: 'object',
  required: ['summary', 'ddc', 'cutter', 'lcsh', 'reviewNotes'],
  properties: {
    summary: { type: 'string' },
    ddc: {
      type: 'object',
      required: ['number', 'label', 'confidence', 'rationale'],
      properties: {
        number: { type: 'string' }, label: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 }, rationale: { type: 'string' }
      }
    },
    cutter: {
      type: 'object',
      required: ['number', 'basis', 'confidence', 'rationale'],
      properties: {
        number: { type: 'string' }, basis: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 }, rationale: { type: 'string' }
      }
    },
    lcsh: {
      type: 'array', minItems: 1, maxItems: 10,
      items: {
        type: 'object', required: ['heading', 'confidence', 'rationale'],
        properties: {
          heading: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, rationale: { type: 'string' }
        }
      }
    },
    reviewNotes: { type: 'array', maxItems: 10, items: { type: 'string' } }
  }
};
