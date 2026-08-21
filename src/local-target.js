import { getModel, getProvider } from './providers/catalog.js';

export function resolveLocalTarget({ env, body }) {
  const provider = getProvider(body.provider);
  const model = getModel(body.provider, body.model);
  if (!provider || !model) {
    const error = new Error('Select a supported provider and model.');
    error.type = 'invalid_request';
    error.status = 400;
    throw error;
  }
  if (!env[provider.keyBinding]) {
    const error = new Error(`Add ${provider.keyBinding} to .env.local.`);
    error.type = 'missing_api_key';
    error.status = 400;
    throw error;
  }
  return { provider: provider.id, model: model.id };
}
