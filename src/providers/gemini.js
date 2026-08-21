import { mapProviderFailure, providerError } from './errors.js';

const MAX_NETWORK_ATTEMPTS = 2;
const UPSTREAM_TIMEOUT_MS = 45000;

function isTransient(status) {
  return status === 429 || status >= 500;
}

export async function callGemini(env, options) {
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
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY,
          },
          signal: options.signal || controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { maxOutputTokens: maxTokens },
          }),
        },
      );
      const body = await response.json();
      if (!response.ok || body.error) {
        if (isTransient(response.status) && attempt < MAX_NETWORK_ATTEMPTS - 1) continue;
        throw mapProviderFailure('gemini', response.status, body);
      }
      const candidate = body.candidates?.[0];
      const text = (candidate?.content?.parts || [])
        .filter(part => part.text)
        .map(part => part.text)
        .join('\n')
        .trim();
      if (!text) throw providerError('invalid_output', 502);
      return {
        text,
        stopReason: candidate.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
        provider: 'gemini',
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
