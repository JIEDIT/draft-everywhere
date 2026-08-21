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

test('Gemini adapter sends generateContent request and normalizes output', async () => {
  const { generateText } = await load();
  let url;
  let headers;
  let request;
  const result = await generateText({ GEMINI_API_KEY: 'gemini-key' }, {
    provider: 'gemini', model: 'gemini-3.5-flash-lite',
    systemPrompt: 'rules', userPrompt: 'draft', maxTokens: 700,
    fetchImpl: async (requestUrl, options) => {
      url = requestUrl;
      headers = options.headers;
      request = JSON.parse(options.body);
      return response({ candidates: [{ content: { parts: [{ text: ' result ' }] }, finishReason: 'STOP' }] });
    },
  });

  assert.equal(url, 'https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash-lite:generateContent');
  assert.equal(headers['x-goog-api-key'], 'gemini-key');
  assert.deepEqual(request, {
    systemInstruction: { parts: [{ text: 'rules' }] },
    contents: [{ role: 'user', parts: [{ text: 'draft' }] }],
    generationConfig: { maxOutputTokens: 700 },
  });
  assert.deepEqual(result, {
    text: 'result', stopReason: 'end_turn', provider: 'gemini', model: 'gemini-3.5-flash-lite',
  });
});

test('Gemini max-token responses use normalized stop reason', async () => {
  const { generateText } = await load();
  const result = await generateText({ GEMINI_API_KEY: 'key' }, {
    provider: 'gemini', model: 'gemini-3.6-flash', userPrompt: 'draft',
    fetchImpl: async () => response({
      candidates: [{ content: { parts: [{ text: 'partial' }] }, finishReason: 'MAX_TOKENS' }],
    }),
  });
  assert.equal(result.stopReason, 'max_tokens');
});

test('Gemini auth errors are sanitized and malformed output is rejected', async () => {
  const { generateText } = await load();
  const key = 'secret-gemini-key';
  await assert.rejects(
    generateText({ GEMINI_API_KEY: key }, {
      provider: 'gemini', model: 'gemini-3.5-flash-lite', userPrompt: 'draft',
      fetchImpl: async () => response({ error: { code: 403, message: `Bad ${key}`, status: 'PERMISSION_DENIED' } }, 403),
    }),
    error => error.type === 'invalid_api_key' && !error.message.includes(key),
  );
  await assert.rejects(
    generateText({ GEMINI_API_KEY: 'key' }, {
      provider: 'gemini', model: 'gemini-3.5-flash-lite', userPrompt: 'draft',
      fetchImpl: async () => response({ candidates: [] }),
    }),
    error => error.type === 'invalid_output',
  );
});
