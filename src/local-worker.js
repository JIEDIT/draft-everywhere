import { handleGenerationRequest, jsonResponse } from './generation-handler.js';
import { resolveLocalTarget } from './local-target.js';
import { publicProviderCatalog } from './providers/catalog.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/capabilities') {
      if (request.method !== 'GET') {
        return jsonResponse({ error: { type: 'method_not_allowed', message: 'GET only.' } }, 405);
      }
      return jsonResponse({
        mode: 'local',
        providerSelection: true,
        modelSelection: true,
        providers: publicProviderCatalog(env),
        usage: null,
      }, 200);
    }

    if (url.pathname === '/api/generate') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: { type: 'method_not_allowed', message: 'POST only.' } }, 405);
      }
      return handleGenerationRequest(request, env, { resolveTarget: resolveLocalTarget });
    }

    return env.ASSETS.fetch(request);
  },
};
