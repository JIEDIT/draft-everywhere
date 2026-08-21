const test = require('node:test');
const assert = require('node:assert/strict');

const validBlock = '@@PLATFORM:linkedin@@\n@@FIELD:body@@\nFaithful post.\n@@FIELD:tags@@\n\n@@FIELD:exposure_tip_zh@@\n提示\n@@FIELD:exposure_tip_en@@\nTip\n@@END@@';

function providerResponse(provider, text = validBlock) {
  const payload = provider === 'anthropic'
    ? { content: [{ type: 'text', text }], stop_reason: 'end_turn' }
    : provider === 'openai'
      ? { status: 'completed', output: [{ content: [{ type: 'output_text', text }] }] }
      : { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] };
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function generate(env, body, fetchImpl) {
  const originalFetch = global.fetch;
  global.fetch = fetchImpl;
  try {
    const worker = (await import('../src/local-worker.js')).default;
    const response = await worker.fetch(new Request('https://local.test/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: 'A source draft', platform: 'linkedin', requestId: 'local-group', ...body }),
    }), env);
    return { response, payload: await response.json() };
  } finally {
    global.fetch = originalFetch;
  }
}

test('local generation routes each configured provider', async () => {
  const cases = [
    ['anthropic', 'claude-haiku-4-5', { ANTHROPIC_API_KEY: 'key' }],
    ['openai', 'gpt-5-mini', { OPENAI_API_KEY: 'key' }],
    ['gemini', 'gemini-3.5-flash-lite', { GEMINI_API_KEY: 'key' }],
  ];
  for (const [provider, model, keys] of cases) {
    let calledUrl = '';
    const result = await generate(keys, { provider, model }, async url => {
      calledUrl = String(url);
      return providerResponse(provider);
    });
    assert.equal(result.payload.status, 'ready', provider);
    assert.match(calledUrl, provider === 'gemini' ? /googleapis\.com/ : new RegExp(`${provider}\\.com`));
  }
});

test('local generation rejects invalid and unconfigured targets before network access', async () => {
  const noNetwork = async () => { throw new Error('network should not be called'); };
  const invalid = await generate({}, { provider: 'unknown', model: 'unknown' }, noNetwork);
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.payload.error.type, 'invalid_request');

  const missing = await generate({}, { provider: 'gemini', model: 'gemini-3.5-flash-lite' }, noNetwork);
  assert.equal(missing.response.status, 400);
  assert.equal(missing.payload.error.type, 'missing_api_key');
});
