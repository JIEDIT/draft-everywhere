import { mapProviderFailure, providerError } from './errors.js';

const MAX_NETWORK_ATTEMPTS = 2;
const UPSTREAM_TIMEOUT_MS = 45000;

function isTransient(status, body) {
  return status === 429 || status >= 500 ||
    ['api_error', 'overloaded_error', 'rate_limit_error'].includes(body?.error?.type);
}

export async function callAnthropic(env, options) {
  const {
    model,
    systemPrompt = '',
    userPrompt = '',
    maxTokens = 2048,
    fetchImpl = fetch,
  } = options;

  for (let attempt = 0; attempt < MAX_NETWORK_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        signal: options.signal || controller.signal,
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      const body = await response.json();
      if (!response.ok || body.error) {
        if (isTransient(response.status, body) && attempt < MAX_NETWORK_ATTEMPTS - 1) {
          await new Promise(resolve => setTimeout(resolve, 250 * (2 ** attempt)));
          continue;
        }
        throw mapProviderFailure('anthropic', response.status, body);
      }
      const textBlock = (body.content || []).find(block => block.type === 'text');
      if (!textBlock?.text) throw providerError('invalid_output', 502);
      return {
        text: textBlock.text.trim(),
        stopReason: body.stop_reason || 'end_turn',
        provider: 'anthropic',
        model,
      };
    } catch (cause) {
      if (cause.type) throw cause;
      if (cause.name === 'AbortError') throw providerError('timeout', 502);
      if (attempt < MAX_NETWORK_ATTEMPTS - 1) {
        await new Promise(resolve => setTimeout(resolve, 250 * (2 ** attempt)));
        continue;
      }
      throw providerError('network_error', 502);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw providerError('network_error', 502);
}
