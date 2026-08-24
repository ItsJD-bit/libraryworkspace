import OpenAI from 'openai';
import { environment } from '../config/environment.js';
import { catalogResultSchema, ollamaCatalogFormat } from '../schemas/catalogSchema.js';

function buildPrompt(book) {
  return `You are an experienced library cataloging assistant. Analyze this book and propose, do not assert, cataloging metadata.

Book metadata:
${JSON.stringify(book, null, 2)}

Return JSON matching the requested schema exactly. Use current DDC terminology and an appropriate level of specificity. For the Cutter number, give a suggested author Cutter based on the author's surname and state that local Cutter tables and shelflisting rules must be checked. Use authorized-looking Library of Congress Subject Headings (LCSH), favoring established headings over invented phrases. Include uncertainty in confidence and reviewNotes. Never invent facts that are absent from the supplied metadata.`;
}

function parseCatalogResponse(content) {
  if (!content) throw new Error('The AI provider returned an empty response');

  let result;
  try {
    result = JSON.parse(content);
  } catch {
    const error = new Error('The AI provider returned malformed JSON');
    error.statusCode = 502;
    throw error;
  }

  const parsed = catalogResultSchema.safeParse(result);
  if (!parsed.success) {
    const error = new Error('The AI provider returned an invalid catalog result');
    error.statusCode = 502;
    error.details = parsed.error.flatten();
    throw error;
  }
  return parsed.data;
}

async function catalogWithOpenAI(book) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OPENAI_API_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: environment.openAiModel,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You produce precise JSON for library cataloging review.' },
      { role: 'user', content: buildPrompt(book) }
    ]
  });

  return parseCatalogResponse(response.choices[0]?.message?.content);
}

async function catalogWithOllama(book) {
  const baseUrl = environment.ollamaBaseUrl.replace(/\/$/, '');
  const model = environment.ollamaModel;
  let response;

  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: ollamaCatalogFormat,
        options: { temperature: 0.1 },
        messages: [
          { role: 'system', content: 'You produce precise JSON for library cataloging review.' },
          { role: 'user', content: buildPrompt(book) }
        ]
      })
    });
  } catch {
    const error = new Error(`Unable to connect to Ollama at ${baseUrl}. Is Ollama running?`);
    error.statusCode = 503;
    throw error;
  }

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Ollama request failed (${response.status}): ${detail || response.statusText}`);
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  return parseCatalogResponse(payload.message?.content);
}

export async function catalogBook(book) {
  const provider = environment.aiProvider;
  if (provider === 'ollama') return catalogWithOllama(book);
  if (provider === 'openai') return catalogWithOpenAI(book);

  const error = new Error(`Unsupported AI_PROVIDER: ${provider}`);
  error.statusCode = 500;
  throw error;
}
