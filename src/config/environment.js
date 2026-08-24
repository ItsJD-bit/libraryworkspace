export const environment = {
  port: Number(process.env.PORT) || 3000,
  aiProvider: (process.env.AI_PROVIDER || 'openai').toLowerCase(),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini'
};
