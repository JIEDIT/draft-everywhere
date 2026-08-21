const test = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  return import('../src/providers/index.js');
}

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('Anthropic adapter preserves system caching and normalizes output', async () => {
  const { generateText } = await load();
  let request;
  const result = await generateText({ ANTHROPIC_API_KEY: 'key' }, {
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    systemPrompt: 'rules',
    userPrompt: 'draft',
    maxTokens: 2048,
    fetchImpl: async (_url, options) => {
      request = JSON.parse(options.body);
      return response({ content: [{ type: 'text', text: 'result' }], stop_reason: 'end_turn' });
    },
  });

  assert.equal(request.system[0].text, 'rules');
  assert.equal(request.system[0].cache_control.type, 'ephemeral');
  assert.equal(request.messages[0].content, 'draft');
  assert.deepEqual(result, {
    text: 'result',
    stopReason: 'end_turn',
    provider: 'anthropic',
    model: 'claude-sonnet-5',
  });
});

test('provider router rejects unsupported targets and missing keys before network access', async () => {
  const { generateText } = await load();
  await assert.rejects(
    generateText({}, { provider: 'unknown', model: 'unknown' }),
    error => error.type === 'model_unavailable' && error.status === 400,
  );
  await assert.rejects(
    generateText({}, { provider: 'anthropic', model: 'claude-sonnet-5' }),
    error => error.type === 'missing_api_key' && error.status === 400,
  );
});

test('Anthropic auth failures are sanitized and never expose keys or raw payloads', async () => {
  const { generateText } = await load();
  const key = 'secret-key-value';
  await assert.rejects(
    generateText({ ANTHROPIC_API_KEY: key }, {
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      systemPrompt: 'rules',
      userPrompt: 'draft',
      maxTokens: 100,
      fetchImpl: async () => response({
        error: { type: 'authentication_error', message: `Rejected ${key}` },
      }, 401),
    }),
    error => {
      assert.equal(error.type, 'invalid_api_key');
      assert.equal(error.status, 401);
      assert.equal(error.message.includes(key), false);
      assert.equal(error.message.includes('Rejected'), false);
      return true;
    },
  );
});

test('Anthropic transient failures retry once and malformed success is invalid output', async () => {
  const { generateText } = await load();
  let calls = 0;
  const result = await generateText({ ANTHROPIC_API_KEY: 'key' }, {
    provider: 'anthropic', model: 'claude-haiku-4-5', systemPrompt: 'rules', userPrompt: 'draft', maxTokens: 100,
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? response({ error: { type: 'overloaded_error', message: 'busy' } }, 503)
        : response({ content: [{ type: 'text', text: 'ready' }], stop_reason: 'end_turn' });
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.text, 'ready');

  await assert.rejects(
    generateText({ ANTHROPIC_API_KEY: 'key' }, {
      provider: 'anthropic', model: 'claude-haiku-4-5', systemPrompt: 'rules', userPrompt: 'draft', maxTokens: 100,
      fetchImpl: async () => response({ content: [], stop_reason: 'end_turn' }),
    }),
    error => error.type === 'invalid_output',
  );
});
