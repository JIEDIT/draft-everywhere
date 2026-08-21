import { mapProviderFailure, providerError } from './errors.js';

const MAX_NETWORK_ATTEMPTS = 2;
const UPSTREAM_TIMEOUT_MS = 45000;

function outputText(body) {
  return (body.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text' && item.text)
    .map(item => item.text)
    .join('\n')
    .trim();
}

function isTransient(status) {
  return status === 429 || status >= 500;
}

export async function callOpenAI(env, options) {
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
      const response = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        signal: options.signal || controller.signal,
        body: JSON.stringify({
          model,
          instructions: systemPrompt,
          input: userPrompt,
          max_output_tokens: maxTokens,
          store: false,
        }),
      });
      const body = await response.json();
      if (!response.ok || body.error) {
        if (isTransient(response.status) && attempt < MAX_NETWORK_ATTEMPTS - 1) continue;
        throw mapProviderFailure('openai', response.status, body);
      }
      const text = outputText(body);
      if (!text) throw providerError('invalid_output', 502);
      return {
        text,
        stopReason: body.status === 'incomplete' && body.incomplete_details?.reason === 'max_output_tokens'
          ? 'max_tokens'
          : 'end_turn',
        provider: 'openai',
        model,
      };
    } catch (cause) {
      if (cause.type) throw cause;
      if (cause.name === 'AbortError') throw providerError('timeout', 502);
      if (attempt < MAX_NETWORK_ATTEMPTS - 1) continue;
      throw providerError('network_error', 502);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw providerError('network_error', 502);
}
