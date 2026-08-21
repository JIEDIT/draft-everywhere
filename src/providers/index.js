import { getModel, getProvider } from './catalog.js';
import { callAnthropic } from './anthropic.js';
import { callOpenAI } from './openai.js';
import { callGemini } from './gemini.js';
import { providerError } from './errors.js';

export async function generateText(env, options) {
  const provider = getProvider(options.provider);
  const model = getModel(options.provider, options.model);
  if (!provider || !model) throw providerError('model_unavailable', 400);
  if (!env[provider.keyBinding]) throw providerError('missing_api_key', 400);

  if (provider.id === 'anthropic') return callAnthropic(env, options);
  if (provider.id === 'openai') return callOpenAI(env, options);
  if (provider.id === 'gemini') return callGemini(env, options);
  throw providerError('model_unavailable', 400);
}
