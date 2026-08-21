const test = require('node:test');
const assert = require('node:assert/strict');

test('catalog exposes stable choices and configured booleans without secrets', async () => {
  const { getModel, publicProviderCatalog } = await import('../src/providers/catalog.js');
  const catalog = publicProviderCatalog({ OPENAI_API_KEY: 'never-return-this' });
  assert.deepEqual(catalog.find(provider => provider.id === 'openai').models.map(model => model.id), [
    'gpt-5-mini',
    'gpt-5.6',
  ]);
  assert.equal(catalog.find(provider => provider.id === 'openai').configured, true);
  assert.equal(catalog.find(provider => provider.id === 'anthropic').configured, false);
  assert.equal(JSON.stringify(catalog).includes('never-return-this'), false);
  assert.equal(getModel('openai', 'arbitrary-model'), null);
});
