export const PROVIDER_CATALOG = Object.freeze([
  Object.freeze({
    id: 'anthropic',
    label: 'Anthropic',
    keyBinding: 'ANTHROPIC_API_KEY',
    models: Object.freeze([
      Object.freeze({ id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', tier: 'fast' }),
      Object.freeze({ id: 'claude-sonnet-5', label: 'Claude Sonnet 5', tier: 'quality' }),
    ]),
  }),
  Object.freeze({
    id: 'openai',
    label: 'OpenAI',
    keyBinding: 'OPENAI_API_KEY',
    models: Object.freeze([
      Object.freeze({ id: 'gpt-5-mini', label: 'GPT-5 mini', tier: 'fast' }),
      Object.freeze({ id: 'gpt-5.6', label: 'GPT-5.6', tier: 'quality' }),
    ]),
  }),
  Object.freeze({
    id: 'gemini',
    label: 'Gemini',
    keyBinding: 'GEMINI_API_KEY',
    models: Object.freeze([
      Object.freeze({ id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', tier: 'fast' }),
      Object.freeze({ id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', tier: 'quality' }),
    ]),
  }),
]);

export function getProvider(id) {
  return PROVIDER_CATALOG.find(provider => provider.id === id) || null;
}

export function getModel(providerId, modelId) {
  return getProvider(providerId)?.models.find(model => model.id === modelId) || null;
}

export function publicProviderCatalog(env) {
  return PROVIDER_CATALOG.map(({ id, label, keyBinding, models }) => ({
    id,
    label,
    configured: Boolean(env[keyBinding]),
    models: models.map(({ id: modelId, label: modelLabel, tier }) => ({
      id: modelId,
      label: modelLabel,
      tier,
    })),
  }));
}
