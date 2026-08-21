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

test('OpenAI adapter sends a Responses request and normalizes output', async () => {
  const { generateText } = await load();
  let url;
  let headers;
  let request;
  const result = await generateText({ OPENAI_API_KEY: 'openai-key' }, {
    provider: 'openai',
    model: 'gpt-5-mini',
    systemPrompt: 'rules',
    userPrompt: 'draft',
    maxTokens: 900,
    fetchImpl: async (requestUrl, options) => {
      url = requestUrl;
      headers = options.headers;
      request = JSON.parse(options.body);
      return response({
        status: 'completed',
        output: [{ content: [{ type: 'output_text', text: ' result ' }] }],
      });
    },
  });

  assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.equal(headers.Authorization, 'Bearer openai-key');
  assert.deepEqual(request, {
    model: 'gpt-5-mini',
    instructions: 'rules',
    input: 'draft',
    max_output_tokens: 900,
    store: false,
  });
  assert.deepEqual(result, {
    text: 'result',
    stopReason: 'end_turn',
    provider: 'openai',
    model: 'gpt-5-mini',
  });
});

test('OpenAI incomplete responses preserve max-token stop reason', async () => {
  const { generateText } = await load();
  const result = await generateText({ OPENAI_API_KEY: 'key' }, {
    provider: 'openai', model: 'gpt-5.6', userPrompt: 'draft',
    fetchImpl: async () => response({
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
      output: [{ content: [{ type: 'output_text', text: 'partial' }] }],
    }),
  });
  assert.equal(result.stopReason, 'max_tokens');
  assert.equal(result.text, 'partial');
});

test('OpenAI errors are sanitized and malformed output is rejected', async () => {
  const { generateText } = await load();
  const key = 'secret-openai-key';
  await assert.rejects(
    generateText({ OPENAI_API_KEY: key }, {
      provider: 'openai', model: 'gpt-5-mini', userPrompt: 'draft',
      fetchImpl: async () => response({ error: { code: 'invalid_api_key', message: `Bad ${key}` } }, 401),
    }),
    error => error.type === 'invalid_api_key' && !error.message.includes(key),
  );

  await assert.rejects(
    generateText({ OPENAI_API_KEY: 'key' }, {
      provider: 'openai', model: 'gpt-5-mini', userPrompt: 'draft',
      fetchImpl: async () => response({ status: 'completed', output: [] }),
    }),
    error => error.type === 'invalid_output',
  );
});
