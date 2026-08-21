const PUBLIC_MESSAGES = Object.freeze({
  missing_api_key: 'Add the matching API key to the server environment.',
  invalid_api_key: 'The provider rejected this API key.',
  model_unavailable: 'This model is unavailable or not enabled for the account.',
  quota_exceeded: 'The provider account has no available quota or balance.',
  rate_limited: 'The provider rate limit was reached. Try again shortly.',
  timeout: 'The model request timed out.',
  network_error: 'The model provider could not be reached.',
  invalid_output: 'The model returned an incomplete or unreadable response.',
  upstream_error: 'The model provider could not complete the request.',
});

export function providerError(type, status = 502) {
  const error = new Error(PUBLIC_MESSAGES[type] || PUBLIC_MESSAGES.upstream_error);
  error.type = PUBLIC_MESSAGES[type] ? type : 'upstream_error';
  error.status = status;
  return error;
}

export function mapProviderFailure(provider, status, body = {}) {
  const code = String(body?.error?.code || body?.error?.type || body?.code || '').toLowerCase();
  if (status === 401 || status === 403) return providerError('invalid_api_key', 401);
  if (status === 404 || code.includes('model')) return providerError('model_unavailable', 400);
  if (status === 429 && (code.includes('quota') || code.includes('billing') || code.includes('credit'))) {
    return providerError('quota_exceeded', 402);
  }
  if (status === 429) return providerError('rate_limited', 429);
  return providerError('upstream_error', status >= 500 ? 503 : 502);
}
