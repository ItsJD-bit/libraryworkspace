export const environment = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:librarypass123@localhost:5432/data',
  aiProvider: (process.env.AI_PROVIDER || 'openai').toLowerCase(),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'gemma4:26b',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini'
};
