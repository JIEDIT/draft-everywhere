const test = require('node:test');
const assert = require('node:assert/strict');

test('local capabilities expose configured providers without secrets', async () => {
  const worker = (await import('../src/local-worker.js')).default;
  const response = await worker.fetch(new Request('https://local.test/api/capabilities'), {
    OPENAI_API_KEY: 'never-return-this',
    ASSETS: { fetch: async () => new Response('asset') },
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.mode, 'local');
  assert.equal(payload.usage, null);
  assert.equal(payload.providerSelection, true);
  assert.equal(payload.providers.find(provider => provider.id === 'openai').configured, true);
  assert.equal(payload.providers.find(provider => provider.id === 'anthropic').configured, false);
  assert.equal(JSON.stringify(payload).includes('never-return-this'), false);
});

test('local API rejects unsupported methods', async () => {
  const worker = (await import('../src/local-worker.js')).default;
  const env = { ASSETS: { fetch: async () => new Response('asset') } };
  assert.equal((await worker.fetch(new Request('https://local.test/api/capabilities', { method: 'POST' }), env)).status, 405);
  assert.equal((await worker.fetch(new Request('https://local.test/api/generate'), env)).status, 405);
});
